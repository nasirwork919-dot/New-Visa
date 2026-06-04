import React, { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { useLeads } from '@/hooks/use-leads';
import { useAuth } from '@/context/AuthContext';
import { LeadStatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatINR, formatINRShort } from '@/utils/gst';
import { Link } from 'wouter';
import { Download, IndianRupee, TrendingUp, AlertCircle, MessageCircle, Wallet, X } from 'lucide-react';

function whatsappReminder(phone: string, name: string, balance: number) {
  const msg = encodeURIComponent(`Hi ${name}, your visa application has a pending balance of ₹${balance.toLocaleString('en-IN')}. Kindly clear it at the earliest. Thank you.`);
  const wa = phone.replace(/\D/g, '');
  return `https://wa.me/${wa.length === 10 ? '91' + wa : wa}?text=${msg}`;
}

const FILTER_STATUSES = ['All', 'Under Process', 'Follow-up', 'Submitted', 'Completed', 'Cancelled'];
const PAYMENT_FILTER = ['All', 'Fully Paid', 'Partially Paid', 'Unpaid'];
const PAYMENT_METHODS_FILTER = ['All', 'Cash', 'UPI/Transfer', 'Cheque', 'Bank Transfer', 'Other'];

export default function Payments() {
  const { can } = useAuth();
  const [status, setStatus] = useState('All');
  const [payFilter, setPayFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');

  const { data: leads, isLoading } = useLeads({ status });

  const filtered = (leads || []).filter(l => {
    const balance = Math.max(0, (l.total_amount || 0) - (l.amount_paid || 0));
    const paid = l.amount_paid || 0;
    if (payFilter === 'Fully Paid' && balance > 0) return false;
    if (payFilter === 'Partially Paid' && (balance === 0 || paid === 0)) return false;
    if (payFilter === 'Unpaid' && paid > 0) return false;
    if (methodFilter !== 'All' && l.payment_method !== methodFilter) return false;
    if (search && !l.pax_name?.toLowerCase().includes(search.toLowerCase()) &&
        !l.phone?.includes(search)) return false;
    if (serviceSearch && !l.service_name?.toLowerCase().includes(serviceSearch.toLowerCase())) return false;
    if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(l.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const hasActiveFilters = search || status !== 'All' || payFilter !== 'All' || methodFilter !== 'All' || dateFrom || dateTo || serviceSearch;
  const clearFilters = () => { setSearch(''); setStatus('All'); setPayFilter('All'); setMethodFilter('All'); setDateFrom(''); setDateTo(''); setServiceSearch(''); };

  const totalBase = filtered.reduce((s, l) => s + (l.base_fee || 0), 0);
  const totalGST = filtered.reduce((s, l) => s + (l.gst_amount || 0), 0);
  const totalInvoiced = filtered.reduce((s, l) => s + (l.total_amount || 0), 0);
  const totalPaid = filtered.reduce((s, l) => s + (l.amount_paid || 0), 0);
  const totalBalance = Math.max(0, totalInvoiced - totalPaid);
  const cashTotal = filtered.filter(l => l.payment_method === 'Cash').reduce((s, l) => s + (l.amount_paid || 0), 0);
  const upiTotal = filtered.filter(l => l.payment_method === 'UPI/Transfer').reduce((s, l) => s + (l.amount_paid || 0), 0);

  const exportCSV = () => {
    const headers = ['Name', 'Phone', 'Service', 'Status', 'Base Fee', 'GST', 'Total', 'Paid', 'Balance', 'Method'];
    const rows = filtered.map(l => [
      l.pax_name, l.phone, l.service_name, l.status,
      l.base_fee, l.gst_amount, l.total_amount, l.amount_paid,
      Math.max(0, (l.total_amount || 0) - (l.amount_paid || 0)),
      l.payment_method
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'payments.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground">Track revenue, GST, and outstanding balances.</p>
          </div>
          {can('leads_export') && (
            <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />Base Revenue</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold font-mono">{formatINRShort(totalBase)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />GST Collected</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold font-mono text-amber-700">{formatINRShort(totalGST)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold font-mono">{formatINRShort(totalInvoiced)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Wallet className="h-3.5 w-3.5 text-green-500" />Revenue Collected</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono text-green-600">{formatINRShort(totalPaid)}</p>
              <p className="text-xs text-muted-foreground mt-1">of {formatINRShort(totalInvoiced)} invoiced</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1 text-destructive"><AlertCircle className="h-3.5 w-3.5" />Balance Pending</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold font-mono text-destructive">{formatINRShort(totalBalance)}</p></CardContent>
          </Card>
        </div>

        {/* Payment method breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cash Received</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold font-mono">{formatINRShort(cashTotal)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">UPI / Transfer</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold font-mono">{formatINRShort(upiTotal)}</p></CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <Input placeholder="Search name or phone..." value={search}
                onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[180px]" />
              <Input placeholder="Search service..." value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)} className="w-[180px]" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>{FILTER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={payFilter} onValueChange={setPayFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Payment Status" /></SelectTrigger>
                <SelectContent>{PAYMENT_FILTER.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Method" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS_FILTER.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              {(['Today', '7d', '30d'] as const).map((label) => {
                const to = new Date().toISOString().split('T')[0];
                const days = label === 'Today' ? 0 : label === '7d' ? 7 : 30;
                const from = days === 0 ? to : new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
                return (
                  <Button key={label} size="sm" variant={dateFrom === from && dateTo === to ? 'default' : 'outline'}
                    onClick={() => { setDateFrom(from); setDateTo(to); }}
                    className="h-9 px-3 text-xs">{label}</Button>
                );
              })}
              <div className="flex items-center gap-2">
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[140px]" />
                <span className="text-sm text-muted-foreground">to</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[140px]" />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
            {hasActiveFilters && <p className="text-xs text-muted-foreground">{filtered.length} of {leads?.length || 0} records shown</p>}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No results found.</TableCell></TableRow>
                  ) : filtered.map(lead => {
                    const balance = Math.max(0, (lead.total_amount || 0) - (lead.amount_paid || 0));
                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Link href={`/leads/${lead.id}`} className="font-medium hover:underline block">{lead.pax_name}</Link>
                          <span className="text-xs text-muted-foreground">{lead.phone}</span>
                        </TableCell>
                        <TableCell className="text-sm">{lead.service_name}</TableCell>
                        <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatINR(lead.base_fee || 0)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-amber-700">{formatINR(lead.gst_amount || 0)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatINR(lead.total_amount || 0)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-600">{formatINR(lead.amount_paid || 0)}</TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {balance > 0 ? formatINR(balance) : (lead.total_amount || 0) > 0 ? '✓' : '—'}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{lead.payment_method || '—'}</Badge></TableCell>
                        <TableCell>
                          {balance > 0 && lead.whatsapp && (
                            <a href={whatsappReminder(lead.whatsapp, lead.pax_name, balance)} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#25D366]" title="Send WhatsApp reminder">
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
      </div>
    </SidebarLayout>
  );
}
