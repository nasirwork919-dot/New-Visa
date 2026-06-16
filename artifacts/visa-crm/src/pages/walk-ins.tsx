import React, { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { useLeads, useCreateLead } from '@/hooks/use-leads';
import { useServices } from '@/hooks/use-services';
import { useAuth } from '@/context/AuthContext';
import { LeadStatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINR, calcGST } from '@/utils/gst';
import { Link } from 'wouter';
import { Plus, UserPlus, MessageCircle, Phone, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

function whatsappLink(phone: string, name: string) {
  const msg = encodeURIComponent(`Hi ${name}, thank you for visiting our office. We'll process your visa application shortly.`);
  const wa = phone.replace(/\D/g, '');
  return `https://wa.me/${wa.length === 10 ? '91' + wa : wa}?text=${msg}`;
}

const WI_STATUSES = ['All', 'Under Process', 'Follow-up', 'Submitted', 'Completed', 'Cancelled'];

export default function WalkIns() {
  const { can, profile } = useAuth();
  const { data: services } = useServices();
  const createLead = useCreateLead();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    pax_name: '', phone: '', service_id: '', service_name: '',
    destination: '', base_fee: '', notes: '',
  });

  // Walk-ins are leads with source = 'Walk-in'
  const { data: allLeads, isLoading } = useLeads({ source: 'Walk-in' });

  const hasActiveFilters = search || statusFilter !== 'All' || serviceFilter !== 'All' || dateFrom || dateTo;
  const clearFilters = () => { setSearch(''); setStatusFilter('All'); setServiceFilter('All'); setDateFrom(''); setDateTo(''); };

  const now = new Date();
  const todayStr = now.toDateString();
  const todayLeads = allLeads?.filter(l => new Date(l.created_at).toDateString() === todayStr) || [];
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekLeads = allLeads?.filter(l => new Date(l.created_at) >= weekStart) || [];

  const displayLeads = (allLeads || []).filter(l => {
    if (search && !l.pax_name?.toLowerCase().includes(search.toLowerCase()) && !l.phone?.includes(search)) return false;
    if (statusFilter !== 'All' && l.status !== statusFilter) return false;
    if (serviceFilter !== 'All' && l.service_name !== serviceFilter) return false;
    if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(l.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const serviceNames = [...new Set((allLeads || []).map(l => l.service_name).filter(Boolean))].sort();

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleServiceChange = (id: string) => {
    const svc = services?.find(s => s.id === id);
    set('service_id', id);
    set('service_name', svc?.name || '');
    if (svc?.country) set('destination', svc.country);
  };

  const handleSubmit = async () => {
    if (!form.pax_name || !form.phone) {
      toast({ title: 'Name and phone are required', variant: 'destructive' });
      return;
    }
    try {
      const { gstAmount, totalAmount } = calcGST(Number(form.base_fee) || 0);
      await createLead.mutateAsync({
        ...form,
        whatsapp: form.phone, // single phone field — keep DB column in sync
        source: 'Walk-in',
        status: 'Under Process',
        assigned_to: profile?.id,
        agent_name: profile?.full_name,
        base_fee: Number(form.base_fee) || 0,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        amount_paid: 0,
      });
      toast({ title: 'Walk-in registered successfully' });
      setModalOpen(false);
      setForm({ pax_name: '', phone: '', service_id: '', service_name: '', destination: '', base_fee: '', notes: '' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Walk-ins</h1>
            <p className="text-muted-foreground">Track clients who visited the office in person.</p>
          </div>
          {can('walkin_register') && (
            <Button onClick={() => setModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Register Walk-in
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{todayLeads.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{weekLeads.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{allLeads?.length || 0}</p></CardContent>
          </Card>
        </div>

        {/* Today's Walk-ins */}
        <Card>
          <CardHeader><CardTitle>Today's Walk-ins</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : todayLeads.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No walk-ins today.</TableCell></TableRow>
                ) : todayLeads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">{lead.pax_name}</Link>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{lead.phone}
                      </div>
                    </TableCell>
                    <TableCell>{lead.service_name || '—'}</TableCell>
                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                    <TableCell className="text-right font-mono">{formatINR(lead.total_amount || 0)}</TableCell>
                    <TableCell>
                      {(lead.phone || lead.whatsapp) && (
                        <a href={whatsappLink(lead.phone || lead.whatsapp, lead.pax_name)} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#25D366]">
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

        {/* All Walk-ins with Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle>All Walk-ins</CardTitle>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search name / phone..." value={search}
                    onChange={e => setSearch(e.target.value)} className="pl-8 h-8 w-[180px] text-sm" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[135px] h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{WI_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-[145px] h-8 text-sm"><SelectValue placeholder="All Services" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Services</SelectItem>
                    {serviceNames.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[125px] h-8 text-sm" />
                <span className="text-xs text-muted-foreground">–</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[125px] h-8 text-sm" />
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-muted-foreground">
                    <X className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </div>
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground mt-1">{displayLeads.length} of {allLeads?.length || 0} walk-ins shown</p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayLeads.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No walk-ins found.</TableCell></TableRow>
                ) : displayLeads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">{lead.pax_name}</Link>
                      <div className="text-xs text-muted-foreground">{lead.phone}</div>
                    </TableCell>
                    <TableCell>{lead.service_name || '—'}</TableCell>
                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                    <TableCell>{lead.agent_name || '—'}</TableCell>
                    <TableCell className="text-right font-mono">{formatINR(lead.total_amount || 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Register Walk-in Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Register Walk-in</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={form.pax_name} onChange={e => set('pax_name', e.target.value)} placeholder="Client name" />
            </div>
            <div>
              <Label>Mobile Number *</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground select-none">+91</span>
                <Input className="rounded-l-none" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="98765 43210" />
              </div>
            </div>
            <div>
              <Label>Service</Label>
              <Select value={form.service_id} onValueChange={handleServiceChange}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {services?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.country}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base Fee (₹)</Label>
              <Input value={form.base_fee} onChange={e => set('base_fee', e.target.value)} type="number" placeholder="0" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createLead.isPending}>Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
