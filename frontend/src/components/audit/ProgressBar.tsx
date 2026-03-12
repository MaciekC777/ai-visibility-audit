'use client';

import { statusLabel, statusProgress } from '@/lib/utils';
import { AuditStatus } from '@/types';

interface ProgressBarProps {
  status: AuditStatus;
}

const STEPS: AuditStatus[] = [
  'scraping',
  'third_party_check',
  'generating_prompts',
  'querying_models',
  'analyzing',
  'scoring',
  'completed',
];

export function ProgressBar({ status }: ProgressBarProps) {
  const progress = statusProgress(status);
  const isFailed = status === 'failed';

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${isFailed ? 'text-red-600' : 'text-gray-700'}`}>
          {statusLabel(status)}
        </span>
        <span className="text-gray-400">{isFailed ? '' : `${progress}%`}</span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isFailed
              ? 'bg-red-400'
              : status === 'completed'
              ? 'bg-green-500'
              : 'bg-primary-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-7 gap-1">
        {STEPS.map((step) => {
          const stepProgress = statusProgress(step);
          const isActive = progress >= stepProgress;
          return (
            <div key={step} className="text-center">
              <div
                className={`w-2 h-2 rounded-full mx-auto mb-1 transition-colors ${
                  isActive
                    ? status === 'failed'
                      ? 'bg-red-400'
                      : 'bg-primary-500'
                    : 'bg-gray-200'
                }`}
              />
              <p className="text-xs text-gray-400 leading-tight hidden sm:block">
                {step.replace(/_/g, ' ').slice(0, 8)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
