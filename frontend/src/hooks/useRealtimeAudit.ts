'use client';

import { useEffect, useState } from 'react';
import { Audit } from '@/types';
import { createClient } from '@/lib/supabase';

export function useRealtimeAudit(auditId: string) {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let pollInterval: ReturnType<typeof setInterval>;

    async function fetchAudit() {
      const { data } = await supabase
        .from('audits')
        .select('*')
        .eq('id', auditId)
        .single();
      if (data) setAudit(data as Audit);
      setLoading(false);
      return data;
    }

    // Initial fetch
    fetchAudit().then((data) => {
      // If already done, no need to poll
      if (data?.status === 'completed' || data?.status === 'failed') return;

      // Poll every 3 seconds as fallback
      pollInterval = setInterval(async () => {
        const { data: fresh } = await supabase
          .from('audits')
          .select('*')
          .eq('id', auditId)
          .single();
        if (fresh) {
          setAudit(fresh as Audit);
          if (fresh.status === 'completed' || fresh.status === 'failed') {
            clearInterval(pollInterval);
          }
        }
      }, 3000);
    });

    // Realtime as bonus (may not work without Realtime enabled)
    const channel = supabase
      .channel(`audit_${auditId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'audits', filter: `id=eq.${auditId}` },
        (payload) => {
          setAudit(payload.new as Audit);
          if (payload.new.status === 'completed' || payload.new.status === 'failed') {
            clearInterval(pollInterval);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [auditId]);

  const isProcessing = audit ? !['completed', 'failed'].includes(audit.status) : true;

  return { audit, loading, isProcessing };
}
