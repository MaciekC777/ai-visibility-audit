'use client';

import { useEffect, useState } from 'react';
import { Audit, AuditStatus } from '@/types';
import { createClient } from '@/lib/supabase';

export function useRealtimeAudit(auditId: string) {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    supabase
      .from('audits')
      .select('*')
      .eq('id', auditId)
      .single()
      .then(({ data }) => {
        if (data) setAudit(data as Audit);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`audit_${auditId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audits',
          filter: `id=eq.${auditId}`,
        },
        (payload) => {
          setAudit(payload.new as Audit);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auditId]);

  const isProcessing = audit
    ? !['completed', 'failed'].includes(audit.status)
    : true;

  return { audit, loading, isProcessing };
}
