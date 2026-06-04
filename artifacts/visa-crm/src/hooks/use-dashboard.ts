import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcGST } from '@/utils/gst';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard_summary'],
    queryFn: async () => {
      const { data: leads, error } = await supabase.from('leads').select('*');
      if (error) throw error;

      let total_leads = 0;
      let under_process = 0;
      let submitted = 0;
      let completed = 0;
      let cancelled = 0;
      let base_revenue = 0;
      let amount_paid = 0;
      let walkin_today = 0;
      let walkin_week = 0;
      let walkin_month = 0;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const weekAgo = today - 7 * 24 * 60 * 60 * 1000;
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime();

      leads.forEach(lead => {
        total_leads++;
        if (lead.status === 'Under Process') under_process++;
        if (lead.status === 'Submitted') submitted++;
        if (lead.status === 'Completed') completed++;
        if (lead.status === 'Cancelled') cancelled++;

        if (lead.status !== 'Cancelled') {
          base_revenue += (lead.base_fee || 0);
          amount_paid += (lead.amount_paid || 0);
        }

        if (lead.source === 'Walk-in') {
          const cTime = new Date(lead.created_at).getTime();
          if (cTime >= today) walkin_today++;
          if (cTime >= weekAgo) walkin_week++;
          if (cTime >= monthAgo) walkin_month++;
        }
      });

      const { gstAmount, totalAmount } = calcGST(base_revenue);

      return {
        total_leads,
        under_process,
        submitted,
        completed,
        cancelled,
        base_revenue,
        gst_collected: gstAmount,
        total_invoiced: totalAmount,
        revenue_collected: amount_paid,
        balance_pending: Math.max(0, totalAmount - amount_paid),
        cash_received: 0, // Would need payments table for exact split
        upi_received: 0,
        completion_rate: total_leads ? Math.round((completed / total_leads) * 100) : 0,
        walkin_today,
        walkin_week,
        walkin_month
      };
    }
  });
}

export function useAgentPerformance() {
  return useQuery({
    queryKey: ['agent_performance'],
    queryFn: async () => {
      const { data: leads, error } = await supabase.from('leads').select('*, agent:profiles!assigned_to(full_name)');
      if (error) throw error;

      const map = new Map<string, any>();
      leads.forEach(lead => {
        if (!lead.assigned_to) return;
        if (!map.has(lead.assigned_to)) {
          map.set(lead.assigned_to, {
            agent_id: lead.assigned_to,
            agent_name: lead.agent?.full_name || 'Unknown',
            total_leads: 0,
            completed: 0,
            balance_pending: 0,
            completion_rate: 0
          });
        }
        const a = map.get(lead.assigned_to);
        a.total_leads++;
        if (lead.status === 'Completed') a.completed++;
        
        const { totalAmount } = calcGST(lead.base_fee || 0);
        const bal = Math.max(0, totalAmount - (lead.amount_paid || 0));
        a.balance_pending += bal;
      });

      const arr = Array.from(map.values()).map(a => ({
        ...a,
        completion_rate: a.total_leads ? Math.round((a.completed / a.total_leads) * 100) : 0
      }));

      return arr.sort((a, b) => b.completed - a.completed);
    }
  });
}
