import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardSummary, useAgentPerformance } from '@/hooks/use-dashboard';
import { useLeads } from '@/hooks/use-leads';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINRShort } from '@/utils/gst';
import { Users, Clock, CheckCircle, IndianRupee, Wallet, X, SlidersHorizontal } from 'lucide-react';
import { LeadStatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const STATUSES = ['All', 'Under Process', 'Follow-up', 'Submitted', 'Completed', 'Cancelled'];

export default function Dashboard() {
  const { can } = useAuth();
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary();
  const { data: leads, isLoading: loadingLeads } = useLeads();
  const { data: agentPerf, isLoading: loadingAgents } = useAgentPerformance();

  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [agentFilter, setAgentFilter] = useState('All');

  const hasActiveFilters = statusFilter !== 'All' || dateFrom || dateTo || agentFilter !== 'All';
  const clearFilters = () => { setStatusFilter('All'); setDateFrom(''); setDateTo(''); setAgentFilter('All'); };

  const filteredLeads = React.useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      if (statusFilter !== 'All' && l.status !== statusFilter) return false;
      if (agentFilter !== 'All' && l.agent_name !== agentFilter) return false;
      if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(l.created_at) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [leads, statusFilter, agentFilter, dateFrom, dateTo]);

  const recentLeads = filteredLeads.slice(0, 10);

  const agentNames = React.useMemo(() => {
    if (!leads) return [];
    const names = [...new Set(leads.map(l => l.agent_name).filter(Boolean))];
    return names.sort();
  }, [leads]);

  // Group leads by source for chart
  const sourceData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      counts[l.source] = (counts[l.source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredLeads]);

  // Group leads by service
  const serviceData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      counts[l.service_name] = (counts[l.service_name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredLeads]);

  if (loadingSummary || loadingLeads || loadingAgents) {
    return (
      <SidebarLayout>
        <div className="flex h-full items-center justify-center">Loading dashboard...</div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your agency's performance.</p>
          </div>
          <Card className="w-full sm:w-auto">
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[145px] h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder="All Agents" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Agents</SelectItem>
                    {agentNames.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
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
                <p className="text-xs text-muted-foreground mt-1.5">
                  <SlidersHorizontal className="inline h-3 w-3 mr-1" />
                  {filteredLeads.length} of {leads?.length || 0} leads shown
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.total_leads || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Process</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.under_process || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.completed || 0}</div>
            </CardContent>
          </Card>
          {can('dash_revenue') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
                <IndianRupee className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatINRShort(summary?.total_invoiced || 0)}</div>
              </CardContent>
            </Card>
          )}
          {can('dash_revenue') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Collected</CardTitle>
                <Wallet className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatINRShort(summary?.revenue_collected || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {formatINRShort(summary?.total_invoiced || 0)} invoiced
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Leads */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                            {lead.pax_name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{lead.phone}</div>
                        </TableCell>
                        <TableCell>{lead.service_name}</TableCell>
                        <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                      </TableRow>
                    ))}
                    {recentLeads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">No recent leads found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Leads by Source</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    {can('dash_revenue') && <TableHead className="text-right">Pending Balance</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentPerf?.map(agent => (
                    <TableRow key={agent.agent_id}>
                      <TableCell className="font-medium">{agent.agent_name}</TableCell>
                      <TableCell className="text-right">{agent.total_leads}</TableCell>
                      <TableCell className="text-right">{agent.completed}</TableCell>
                      <TableCell className="text-right">{agent.completion_rate}%</TableCell>
                      {can('dash_revenue') && (
                        <TableCell className={`text-right ${agent.balance_pending > 0 ? 'text-destructive font-bold' : 'text-green-600'}`}>
                          {formatINRShort(agent.balance_pending)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(!agentPerf || agentPerf.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No agent data found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </SidebarLayout>
  );
}
