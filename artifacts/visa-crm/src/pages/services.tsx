import React, { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { useServices, useCreateService, useUpdateService } from '@/hooks/use-services';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/utils/gst';
import { Plus, Pencil, Globe, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['Tourist Visa', 'Business Visa', 'Work Permit', 'Student Visa', 'Transit', 'Other'];

function ServiceModal({ open, onClose, svc }: { open: boolean; onClose: () => void; svc?: any }) {
  const createService = useCreateService();
  const updateService = useUpdateService();
  const { toast } = useToast();
  const isEdit = !!svc;

  const [form, setForm] = useState({
    name: svc?.name || '',
    category: svc?.category || 'Tourist Visa',
    country: svc?.country || '',
    base_fee: svc?.base_fee || '',
    processing_days: svc?.processing_days || '',
    description: svc?.description || '',
    is_active: svc?.is_active ?? true,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.country) {
      toast({ title: 'Name and country are required', variant: 'destructive' });
      return;
    }
    try {
      const payload = { ...form, base_fee: Number(form.base_fee) || 0, processing_days: Number(form.processing_days) || null };
      if (isEdit) {
        await updateService.mutateAsync({ id: svc.id, updates: payload });
        toast({ title: 'Service updated' });
      } else {
        await createService.mutateAsync(payload);
        toast({ title: 'Service created' });
      }
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Service' : 'New Service'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Service Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., UAE Tourist Visa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Country *</Label>
              <Input value={form.country} onChange={e => set('country', e.target.value)} placeholder="UAE" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Base Fee (₹)</Label>
              <Input value={form.base_fee} onChange={e => set('base_fee', e.target.value)} type="number" placeholder="0" />
            </div>
            <div>
              <Label>Processing Days</Label>
              <Input value={form.processing_days} onChange={e => set('processing_days', e.target.value)} type="number" placeholder="7" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
            <Label htmlFor="active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createService.isPending || updateService.isPending}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Services() {
  const { can } = useAuth();
  const { data: services, isLoading } = useServices();
  const [modalOpen, setModalOpen] = useState(false);
  const [editSvc, setEditSvc] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState('All');

  const grouped: Record<string, typeof services> = (services || [])
    .filter(s => filterCategory === 'All' ? true : s.category === filterCategory)
    .reduce((acc: Record<string, typeof services>, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category]!.push(s);
      return acc;
    }, {});

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Services</h1>
            <p className="text-muted-foreground">Manage visa and travel service offerings.</p>
          </div>
          {can('svc_manage') && (
            <Button onClick={() => { setEditSvc(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Service
            </Button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {['All', ...CATEGORIES].map(cat => (
            <Button key={cat} variant={filterCategory === cat ? 'default' : 'outline'} size="sm"
              onClick={() => setFilterCategory(cat)}>{cat}</Button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : Object.entries(grouped).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No services found. {can('svc_manage') && 'Create your first service to get started.'}</p>
          </div>
        ) : Object.entries(grouped).map(([category, svcs]) => (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4" />{category}
              <Badge variant="secondary">{svcs?.length ?? 0}</Badge>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(svcs ?? []).map(svc => (
                <Card key={svc.id} className={`${!svc.is_active ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{svc.name}</CardTitle>
                      {!svc.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />{svc.country}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Fee</span>
                        <span className="font-bold font-mono">{formatINR(svc.base_fee || 0)}</span>
                      </div>
                      {svc.processing_days && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Processing</span>
                          <span>{svc.processing_days} days</span>
                        </div>
                      )}
                      {svc.description && <p className="text-xs text-muted-foreground mt-2">{svc.description}</p>}
                    </div>
                    {can('svc_manage') && (
                      <Button variant="ghost" size="sm" className="mt-3 w-full"
                        onClick={() => { setEditSvc(svc); setModalOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ServiceModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditSvc(null); }}
        svc={editSvc}
      />
    </SidebarLayout>
  );
}
