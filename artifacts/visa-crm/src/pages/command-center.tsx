import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { useDashboardSummary, useAgentPerformance } from '@/hooks/use-dashboard';
import { useLeads } from '@/hooks/use-leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatINR, formatINRShort } from '@/utils/gst';
import { LeadStatusBadge } from '@/components/ui/status-badge';
import { Link } from 'wouter';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { IndianRupee, TrendingUp, Users, AlertCircle, CheckCircle, Clock, UserPlus, MessageCircle, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CC_STATUSES = ['All', 'Under Process', 'Follow-up', 'Submitted', 'Completed', 'Cancelled'];

const COLORS = ['#1A5FB4', '#2E7D32', '#E65100', '#6A1B9A', '#00838F'];

function whatsappReminder(phone: string, name: string, balance: number) {
  const msg = encodeURIComponent(`Hi ${name}, your visa application has a pending balance of ₹${balance.toLocaleString('en-IN')}. Kindly clear it at the earliest.`);
  const wa = phone.replace(/\D/g, '');
  return `https://wa.me/${wa.length === 10 ? '91' + wa : wa}?text=${msg}`;
}

function StatCard({ title, value, sub, icon: Icon, color = '' }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function CommandCenter() {
  const { can } = useAuth();
  if (!can('dash_mis')) {
    return <SidebarLayout><div className="p-8 text-muted-foreground">Access denied. Admin/Manager only.</div></SidebarLayout>;
  }

  const { data: summary, isLoading } = useDashboardSummary();
  const { data: agentPerf } = useAgentPerformance();
  const { data: leads } = useLeads();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pendingSearch, setPendingSearch] = useState('');

  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'All';
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('All'); setPendingSearch(''); };

  const filteredLeads = React.useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      if (statusFilter !== 'All' && l.status !== statusFilter) return false;
      if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(l.created_at) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [leads, statusFilter, dateFrom, dateTo]);

  // Pending payments
  const pendingLeads = React.useMemo(() => {
    return filteredLeads
      .map(l => ({ ...l, balance: Math.max(0, (l.total_amount || 0) - (l.amount_paid || 0)) }))
      .filter(l => l.balance > 0 && (!pendingSearch || l.pax_name?.toLowerCase().includes(pendingSearch.toLowerCase()) || l.phone?.includes(pendingSearch)))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 15);
  }, [filteredLeads, pendingSearch]);

  // Source breakdown for pie
  const sourceData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => { counts[l.source] = (counts[l.source] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  // Monthly trend (last 6 months)
  const monthlyData = React.useMemo(() => {
    const now = new Date();
    const map = new Map<string, { month: string; count: number; revenue: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, { month: d.toLocaleString('default', { month: 'short' }), count: 0, revenue: 0 });
    }
    filteredLeads.forEach(l => {
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key);
      if (entry) { entry.count++; entry.revenue += (l.base_fee || 0); }
    });
    return Array.from(map.values());
  }, [filteredLeads]);

  if (isLoading) return <SidebarLayout><div className="flex items-center justify-center h-64">Loading...</div></SidebarLayout>;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
            <p className="text-muted-foreground">Full operational overview — financials, performance, and alerts.</p>
          </div>
          <Card className="w-full sm:w-auto shrink-0">
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[145px] h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CC_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                {(['Today', '7d', '30d'] as const).map((label) => {
                  const to = new Date().toISOString().split('T')[0];
                  const days = label === 'Today' ? 0 : label === '7d' ? 7 : 30;
                  const from = days === 0 ? to : new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
                  return (
                    <Button key={label} size="sm" variant={dateFrom === from && dateTo === to ? 'default' : 'outline'}
                      onClick={() => { setDateFrom(from); setDateTo(to); }}
                      className="h-8 px-2.5 text-xs">{label}</Button>
                  );
                })}
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[130px] h-8 text-sm" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[130px] h-8 text-sm" />
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-muted-foreground">
                    <X className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
              {hasActiveFilters && (
                <p className="text-xs text-muted-foreground mt-1.5">{filteredLeads.length} of {leads?.length || 0} leads in view</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KPI Row 1 — Lead Counts */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Leads" value={summary?.total_leads || 0} icon={Users} />
          <StatCard title="Under Process" value={summary?.under_process || 0} icon={Clock} color="text-amber-600" />
          <StatCard title="Submitted" value={summary?.submitted || 0} icon={TrendingUp} color="text-blue-600" />
          <StatCard title="Completed" value={summary?.completed || 0} icon={CheckCircle} color="text-green-600" />
          <StatCard title="Completion Rate" value={`${summary?.completion_rate || 0}%`} icon={TrendingUp} color="text-primary" />
        </div>

        {/* KPI Row 2 — Revenue */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Base Revenue" value={formatINRShort(summary?.base_revenue || 0)} icon={IndianRupee} />
          <StatCard title="GST Collected (18%)" value={formatINRShort(summary?.gst_collected || 0)} icon={TrendingUp} color="text-amber-700" />
          <StatCard title="Total Invoiced" value={formatINRShort(summary?.total_invoiced || 0)} icon={IndianRupee} color="text-primary" />
          <StatCard title="Revenue Collected" value={formatINRShort(summary?.revenue_collected || 0)} icon={IndianRupee} color="text-green-600" sub={`of ${formatINRShort(summary?.total_invoiced || 0)} invoiced`} />
          <StatCard title="Balance Pending" value={formatINRShort(summary?.balance_pending || 0)} icon={AlertCircle} color="text-destructive" />
        </div>

        {/* Walk-in stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Walk-ins Today" value={summary?.walkin_today || 0} icon={UserPlus} />
          <StatCard title="Walk-ins This Week" value={summary?.walkin_week || 0} icon={UserPlus} />
          <StatCard title="Walk-ins This Month" value={summary?.walkin_month || 0} icon={UserPlus} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Monthly Leads Trend</CardTitle></CardHeader>
            <CardContent className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#1A5FB4" strokeWidth={2} dot={{ r: 4 }} name="Leads" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Leads by Source</CardTitle></CardHeader>
            <CardContent className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance Table */}
        <Card>
          <CardHeader><CardTitle>Agent Performance</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Pending Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentPerf?.map(agent => (
                  <TableRow key={agent.agent_id}>
                    <TableCell className="font-medium">{agent.agent_name}</TableCell>
                    <TableCell className="text-right">{agent.total_leads}</TableCell>
                    <TableCell className="text-right">{agent.completed}</TableCell>
                    <TableCell className="text-right">
                      <span className={agent.completion_rate >= 70 ? 'text-green-600' : agent.completion_rate >= 40 ? 'text-amber-600' : 'text-destructive'}>
                        {agent.completion_rate}%
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-mono ${agent.balance_pending > 0 ? 'text-destructive font-semibold' : 'text-green-600'}`}>
                      {agent.balance_pending > 0 ? formatINR(agent.balance_pending) : '✓ Clear'}
                    </TableCell>
                  </TableRow>
                ))}
                {(!agentPerf || agentPerf.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No agent data.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertCircle className="h-5 w-5" />Top Pending Balances</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLeads.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-green-600">All balances cleared! ✓</TableCell></TableRow>
                ) : pendingLeads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">{lead.pax_name}</Link>
                      <div className="text-xs text-muted-foreground">{lead.phone}</div>
                    </TableCell>
                    <TableCell className="text-sm">{lead.service_name}</TableCell>
                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                    <TableCell className="text-right font-mono font-bold text-destructive">{formatINR(lead.balance)}</TableCell>
                    <TableCell>
                      {lead.whatsapp && (
                        <a href={whatsappReminder(lead.whatsapp, lead.pax_name, lead.balance)} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#25D366]" title="Send WhatsApp reminder">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
