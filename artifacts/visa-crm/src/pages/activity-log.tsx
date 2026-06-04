import React, { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Search } from 'lucide-react';

const ENTITY_TYPES = ['All', 'lead', 'payment', 'document', 'user', 'service'];

function useActivityLog(filters: { type?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['activity_log', filters],
    queryFn: async () => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (filters.type && filters.type !== 'All') query = query.eq('entity_type', filters.type);
      if (filters.from) query = query.gte('created_at', filters.from);
      if (filters.to) query = query.lte('created_at', filters.to + 'T23:59:59');
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

function actionColor(action: string) {
  if (action?.includes('create') || action?.includes('add')) return 'bg-green-100 text-green-800';
  if (action?.includes('update') || action?.includes('edit')) return 'bg-blue-100 text-blue-800';
  if (action?.includes('delete') || action?.includes('remove')) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

export default function ActivityLog() {
  const { can } = useAuth();
  const [type, setType] = useState('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const { data: logs, isLoading } = useActivityLog({ type, from, to });

  const filtered = (logs || []).filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.description?.toLowerCase().includes(q) ||
      l.actor_name?.toLowerCase().includes(q) ||
      l.entity_type?.toLowerCase().includes(q);
  });

  if (!can('dash_mis')) {
    return <SidebarLayout><div className="p-8 text-muted-foreground">Access denied.</div></SidebarLayout>;
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground">System-wide audit trail of all actions.</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Entity type" /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'All' ? 'All Types' : t}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" placeholder="From date" />
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" placeholder="To date" />
            </div>
          </CardContent>
        </Card>

        {/* Log entries */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No activity found.</p>
            </div>
          ) : filtered.map((log: any) => (
            <div key={log.id} className="flex items-start gap-3 py-3 border-b last:border-0">
              <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {log.action && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  )}
                  {log.entity_type && <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>}
                </div>
                <p className="text-sm mt-1">{log.description || 'No description'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {log.actor_name || 'System'} · {new Date(log.created_at).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filtered.length > 0 && (
          <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
        )}
      </div>
    </SidebarLayout>
  );
}
