import React, { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { useLeads } from '@/hooks/use-leads';
import { useAgentPerformance } from '@/hooks/use-dashboard';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatINR, formatINRShort, calcGST } from '@/utils/gst';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Download, BarChart2 } from 'lucide-react';

const COLORS = ['#1A5FB4', '#2E7D32', '#E65100', '#6A1B9A', '#00838F', '#AD1457'];

export default function Reports() {
  const { can } = useAuth();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState<'source' | 'status' | 'service'>('source');

  const { data: leads } = useLeads();
  const { data: agentPerf } = useAgentPerformance();

  const filtered = (leads || []).filter(l => {
    const d = new Date(l.created_at);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  // Group by selected field
  const groupedData = React.useMemo(() => {
    const counts: Record<string, { count: number; revenue: number }> = {};
    filtered.forEach(l => {
      const key = groupBy === 'source' ? l.source :
                  groupBy === 'status' ? l.status :
                  (l.service_name || 'Unknown');
      if (!counts[key]) counts[key] = { count: 0, revenue: 0 };
      counts[key].count++;
      counts[key].revenue += (l.base_fee || 0);
    });
    return Object.entries(counts)
      .map(([name, v]) => ({ name, count: v.count, revenue: v.revenue }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, groupBy]);

  // Monthly trend
  const monthlyData = React.useMemo(() => {
    const map = new Map<string, { month: string; leads: number; revenue: number; gst: number }>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, { month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), leads: 0, revenue: 0, gst: 0 });
    }
    filtered.forEach(l => {
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const e = map.get(key);
      if (e) {
        e.leads++;
        e.revenue += (l.base_fee || 0);
        e.gst += (l.gst_amount || 0);
      }
    });
    return Array.from(map.values());
  }, [filtered]);

  const totalBase = filtered.reduce((s, l) => s + (l.base_fee || 0), 0);
  const totalGST = filtered.reduce((s, l) => s + (l.gst_amount || 0), 0);
  const totalInvoiced = filtered.reduce((s, l) => s + (l.total_amount || 0), 0);
  const totalPaid = filtered.reduce((s, l) => s + (l.amount_paid || 0), 0);

  const exportCSV = () => {
    const headers = ['Date', 'Client', 'Phone', 'Service', 'Destination', 'Source', 'Status', 'Agent', 'Base Fee', 'GST (18%)', 'Total', 'Paid', 'Balance', 'Payment Method'];
    const rows = filtered.map(l => [
      new Date(l.created_at).toLocaleDateString('en-IN'),
      l.pax_name, l.phone, l.service_name, l.destination, l.source, l.status, l.agent_name,
      l.base_fee, l.gst_amount, l.total_amount, l.amount_paid,
      Math.max(0, (l.total_amount || 0) - (l.amount_paid || 0)),
      l.payment_method
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `visa-crm-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportAgentCSV = () => {
    if (!agentPerf) return;
    const headers = ['Agent', 'Total Leads', 'Completed', 'Completion Rate', 'Balance Pending'];
    const rows = agentPerf.map(a => [a.agent_name, a.total_leads, a.completed, `${a.completion_rate}%`, a.balance_pending]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'agent-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">Export data and view analytical trends.</p>
          </div>
          <div className="flex gap-2">
            {can('leads_export') && (
              <>
                <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Leads CSV</Button>
                <Button variant="outline" onClick={exportAgentCSV}><Download className="h-4 w-4 mr-1" /> Agent CSV</Button>
              </>
            )}
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium">Date Range:</span>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
              <span className="text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
              )}
              <span className="ml-auto text-sm text-muted-foreground">{filtered.length} leads</span>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Base Revenue</p>
            <p className="text-2xl font-bold font-mono">{formatINRShort(totalBase)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">GST (18%)</p>
            <p className="text-2xl font-bold font-mono text-amber-700">{formatINRShort(totalGST)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Invoiced</p>
            <p className="text-2xl font-bold font-mono">{formatINRShort(totalInvoiced)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Collected</p>
            <p className="text-2xl font-bold font-mono text-green-600">{formatINRShort(totalPaid)}</p>
          </CardContent></Card>
        </div>

        {/* Monthly Trend */}
        <Card>
          <CardHeader><CardTitle>Monthly Leads & Revenue Trend (12 months)</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis yAxisId="left" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" fontSize={11} />
                <Tooltip formatter={(v: any, n: string) => n === 'revenue' ? formatINR(v) : v} />
                <Bar yAxisId="left" dataKey="leads" fill="#1A5FB4" name="Leads" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="right" dataKey="gst" fill="#E65100" name="GST (₹)" radius={[2, 2, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Breakdown chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />Breakdown</CardTitle>
              <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">By Source</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                  <SelectItem value="service">By Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" fontSize={11} />
                <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#1A5FB4" name="Leads" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card>
          <CardHeader><CardTitle>Agent Performance Summary</CardTitle></CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentPerf || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="agent_name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="total_leads" fill="#1A5FB4" name="Total" radius={[2, 2, 0, 0]} />
                <Bar dataKey="completed" fill="#2E7D32" name="Completed" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
