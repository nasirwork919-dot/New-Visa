import React, { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { useProfiles, useRoles, useUpdateProfile } from '@/hooks/use-team';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Users, UserPlus, Loader2 } from 'lucide-react';

const AVATAR_COLORS = ['#1A5FB4', '#2E7D32', '#E65100', '#6A1B9A', '#00838F', '#AD1457'];

function EditProfileModal({ open, onClose, member }: { open: boolean; onClose: () => void; member: any }) {
  const { data: roles } = useRoles();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [form, setForm] = useState({
    full_name: member?.full_name || '',
    role_id: member?.role_id || '',
    phone: member?.phone || '',
    is_active: member?.is_active ?? true,
    avatar_color: member?.avatar_color || AVATAR_COLORS[0],
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ id: member.id, updates: form });
      toast({ title: 'Profile updated' });
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Team Member</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role_id} onValueChange={v => set('role_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {roles?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <Label className="mb-2 block">Avatar Color</Label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map(c => (
                <button key={c} className={`w-8 h-8 rounded-full border-2 ${form.avatar_color === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} onClick={() => set('avatar_color', c)} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
            <Label htmlFor="active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateProfile.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: roles } = useRoles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role_id: '',
    role_name: '',
    phone: '',
    avatar_color: AVATAR_COLORS[0],
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleRoleChange = (roleId: string) => {
    const role = roles?.find(r => r.id === roleId);
    set('role_id', roleId);
    set('role_name', role?.name || '');
  };

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast({ title: 'Required fields missing', description: 'Name, email and password are required.', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create member');
      toast({ title: `${form.full_name} added to your team` });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="e.g. Rahul Sharma" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="agent@example.com" />
          </div>
          <div>
            <Label>Password *</Label>
            <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role_id} onValueChange={handleRoleChange}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {roles?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div>
            <Label className="mb-2 block">Avatar Color</Label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map(c => (
                <button key={c} className={`w-8 h-8 rounded-full border-2 ${form.avatar_color === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} onClick={() => set('avatar_color', c)} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : 'Add Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Team() {
  const { can } = useAuth();
  const { data: members, isLoading } = useProfiles();
  const [editMember, setEditMember] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = (members || []).filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team</h1>
            <p className="text-muted-foreground">Manage agents and staff members.</p>
          </div>
          {can('users_manage') && (
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />Add Member
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Search team member..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Badge variant="secondary" className="ml-auto">{members?.length || 0} members</Badge>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No team members found.</p>
            {can('users_manage') && (
              <Button className="mt-4" onClick={() => setAddOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />Add First Member
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(member => (
              <Card key={member.id} className={!member.is_active ? 'opacity-60' : ''}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarFallback style={{ backgroundColor: member.avatar_color || '#1A5FB4', color: 'white' }}
                        className="text-lg font-semibold uppercase">
                        {member.full_name?.substring(0, 2) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{member.full_name}</p>
                        {!member.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.role?.name || '—'}</p>
                      {member.phone && <p className="text-xs text-muted-foreground mt-1">{member.phone}</p>}
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    {can('users_manage') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                        onClick={() => setEditMember(member)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editMember && (
        <EditProfileModal
          open={!!editMember}
          onClose={() => setEditMember(null)}
          member={editMember}
        />
      )}
      <AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} />
    </SidebarLayout>
  );
}
