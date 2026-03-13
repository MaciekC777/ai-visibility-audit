import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

export function scoreBg(score: number): string {
  if (score >= 70) return 'bg-green-100 text-green-800';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Preparing...',
    scraping: 'Analysing website...',
    third_party_check: 'Checking third-party presence...',
    generating_prompts: 'Preparing questions...',
    querying_models: 'Asking AI models (with web search)...',
    analyzing: 'Detecting hallucinations...',
    scoring: 'Generating recommendations...',
    completed: 'Your report is ready!',
    failed: 'Audit failed',
  };
  return labels[status] ?? status;
}

export function statusProgress(status: string): number {
  const progress: Record<string, number> = {
    pending: 2,
    scraping: 12,
    third_party_check: 22,
    generating_prompts: 28,
    querying_models: 65,
    analyzing: 80,
    scoring: 92,
    completed: 100,
    failed: 100,
  };
  return progress[status] ?? 0;
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Weak';
  return 'Invisible';
}
