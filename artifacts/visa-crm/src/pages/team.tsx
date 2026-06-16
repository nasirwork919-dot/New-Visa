import React, { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { useProfiles, useRoles, useUpdateProfile } from '@/hooks/use-team';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Users, UserPlus, Loader2, Trash2, Eye, EyeOff } from 'lucide-react';

const AVATAR_COLORS = ['#1A5FB4', '#2E7D32', '#E65100', '#6A1B9A', '#00838F', '#AD1457'];

function EditProfileModal({ open, onClose, member }: { open: boolean; onClose: () => void; member: any }) {
  const { data: roles } = useRoles();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: member?.full_name || '',
    email: member?.email || '',
    new_password: '',
    role_id: member?.role_id || '',
    phone: member?.phone || '',
    is_active: member?.is_active ?? true,
    avatar_color: member?.avatar_color || AVATAR_COLORS[0],
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update profile fields (name, role, phone, active, avatar)
      const role = roles?.find(r => r.id === form.role_id);
      await updateProfile.mutateAsync({
        id: member.id,
        updates: {
          full_name: form.full_name,
          role_id: form.role_id || null,
          role_name: role?.name || member.role_name || '',
          phone: form.phone,
          is_active: form.is_active,
          avatar_color: form.avatar_color,
        },
      });

      // If email or password changed, call the admin API
      const emailChanged = form.email.trim() && form.email.trim() !== member.email;
      const passwordChanged = form.new_password.trim().length >= 6;

      if (emailChanged || passwordChanged) {
        const body: Record<string, string> = { id: member.id };
        if (emailChanged) body.email = form.email.trim();
        if (passwordChanged) body.password = form.new_password.trim();

        const res = await fetch('/api/team-members', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update credentials');
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
      }

      toast({ title: 'Team member updated' });
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
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
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label>New Password <span className="text-muted-foreground font-normal text-xs">(leave blank to keep current)</span></Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.new_password}
                onChange={e => set('new_password', e.target.value)}
                placeholder="Min 6 characters"
                className="pr-9"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.new_password && form.new_password.length < 6 && (
              <p className="text-xs text-destructive mt-1">Min 6 characters required</p>
            )}
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
                <button key={c} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${form.avatar_color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
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
          <Button
            onClick={handleSave}
            disabled={saving || !!(form.new_password && form.new_password.length < 6)}
          >
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save'}
          </Button>
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
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role_id: '', role_name: '', phone: '',
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
      toast({ title: 'Required fields missing', description: 'Name, email and password are required.', variant: 'destructive' }); return;
    }
    if (form.password.length < 6) {
      toast({ title: 'Password too short', description: 'Min 6 characters.', variant: 'destructive' }); return;
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
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Min 6 characters"
                className="pr-9"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
                <button key={c} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${form.avatar_color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
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

function DeleteMemberDialog({ member, onClose }: { member: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team-members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete member');
      toast({ title: `${member.full_name} has been removed` });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!member} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Remove Team Member
          </DialogTitle>
          <DialogDescription>
            Remove <strong>{member?.full_name}</strong> from the team? Their account will be deactivated and they will lose access to the CRM. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Removing…</> : 'Remove Member'}
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
  const [deleteMember, setDeleteMember] = useState<any>(null);
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
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => setEditMember(member)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteMember(member)} title="Remove">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
      {deleteMember && (
        <DeleteMemberDialog
          member={deleteMember}
          onClose={() => setDeleteMember(null)}
        />
      )}
      <AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} />
    </SidebarLayout>
  );
}
