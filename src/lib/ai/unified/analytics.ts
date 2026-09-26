'use client';

import { track } from '@/lib/analytics';
import type { AssistantTask } from './types';

export type AssistantAction =
  | 'entry_view'
  | 'entry_open'
  | 'panel_view'
  | 'start'
  | 'success'
  | 'clarify'
  | 'preview'
  | 'proposal_view'
  | 'apply'
  | 'keep'
  | 'direct_apply'
  | 'undo'
  | 'conflict'
  | 'followup_view'
  | 'followup_click'
  | 'failed'
  | 'cancel'
  | 'quota_blocked';
export type FailureReason =
  | 'quota'
  | 'auth'
  | 'rate_limit'
  | 'invalid_request'
  | 'unavailable'
  | 'server'
  | 'network'
  | 'invalid_response'
  | 'timeout'
  | 'cancelled';
export interface AssistantAnalytics {
  feature?: AssistantTask['feature'];
  requestedFeature?: AssistantTask['feature'];
  entry?: AssistantTask['entry'];
  surface?: 'header' | 'menu' | 'workspace' | 'block';
  taskId?: string;
  requestId?: string;
  proposalId?: string;
  proposalIndex?: number;
  proposalCount?: number;
  optionId?: string;
  optionIndex?: number;
  optionCount?: number;
  sourceRequestId?: string;
  sourceOptionId?: string;
  previousRequestId?: string;
  retryOfRequestId?: string;
  submissionSource?: 'typed' | 'starter' | 'followup' | 'handoff' | 'retry';
  resultType?: 'clarification' | 'proposals' | 'answer';
  previousResultType?: 'clarification' | 'proposals' | 'answer';
  questionCount?: number;
  elapsedMs?: number;
  statusCode?: number;
  failureReason?: FailureReason;
  operation?: 'apply' | 'undo';
  mode?: 'preview' | 'direct';
  charged?: boolean;
}

/** Only operational metadata: never pass resume text, prompts, labels or errors. */
export function trackAssistant(
  action: AssistantAction,
  properties: AssistantAnalytics,
): void {
  try {
    track('ai_assist_interaction', {
      ...properties,
      action,
      schemaVersion: 2,
      assistantVersion: 'unified',
      eventId: crypto.randomUUID(),
    });
  } catch {
    /* Telemetry cannot interrupt editing, including unavailable storage. */
  }
}

export const proposalId = (requestId: string, index: number) =>
  `${requestId}:proposal:${index}`;
export const optionId = (requestId: string, index: number) =>
  `${requestId}:followup:${index}`;

export function failureForStatus(
  status: number,
  quotaExceeded = false,
): FailureReason {
  if (quotaExceeded) return 'quota';
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status === 404) return 'unavailable';
  if (status === 408 || status === 504) return 'timeout';
  return status >= 500 ? 'server' : 'invalid_request';
}
