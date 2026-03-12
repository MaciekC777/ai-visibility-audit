'use client';

import { useEffect, useState } from 'react';
import { Audit, AuditReport, AuditResult } from '@/types';
import { createClient } from '@/lib/supabase';

export function useAudit(auditId: string) {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchAudit() {
      const { data: audit, error: auditErr } = await supabase
        .from('audits')
        .select('*')
        .eq('id', auditId)
        .single();

      if (auditErr || !audit) {
        setError('Audit not found');
        setLoading(false);
        return;
      }

      const { data: results } = await supabase
        .from('audit_results')
        .select('*')
        .eq('audit_id', auditId);

      setReport(buildReport(audit as Audit, (results ?? []) as AuditResult[]));
      setLoading(false);
    }

    fetchAudit();
  }, [auditId]);

  return { report, loading, error };
}

function buildReport(audit: Audit, results: AuditResult[]): AuditReport {
  const get = (type: string) => results.find((r) => r.result_type === type)?.data;
  return {
    audit,
    brandProfile: get('brand_profile') as AuditReport['brandProfile'],
    promptResults: get('prompt_results') as AuditReport['promptResults'],
    hallucinations: get('hallucinations') as AuditReport['hallucinations'],
    competitors: get('competitors') as AuditReport['competitors'],
    sentiment: get('sentiment') as AuditReport['sentiment'],
    recommendations: get('recommendations') as AuditReport['recommendations'],
    websiteReadiness: get('website_readiness') as AuditReport['websiteReadiness'],
    thirdParty: get('third_party') as AuditReport['thirdParty'],
    visibilityAnalysis: get('visibility_analysis') as AuditReport['visibilityAnalysis'],
  };
}
