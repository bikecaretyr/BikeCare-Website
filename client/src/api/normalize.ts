/**
 * Data normalization layer — fixes inconsistent backend responses before
 * they reach React components. Backend may populate requestedBy as a full
 * User object OR leave it as a plain string ID. We normalize to always be
 * an object so the UI never needs to handle the union.
 */
import type { ApprovalRequest, ApprovalRequestedBy } from '../types'

function normalizeRequestedBy(raw: unknown): ApprovalRequestedBy {
  if (!raw) return { name: 'Unknown', role: '' }
  if (typeof raw === 'string') return { _id: raw, name: raw.slice(-6), role: '' }
  const r = raw as Record<string, unknown>
  return {
    _id:  (r._id  as string) || '',
    name: (r.name as string) || 'Unknown',
    role: (r.role as string) || '',
  }
}

export function normalizeApproval(r: Record<string, unknown>): ApprovalRequest {
  return {
    ...(r as unknown as ApprovalRequest),
    requestedBy: normalizeRequestedBy(r.requestedBy),
    createdAt: (r.createdAt as string) || new Date().toISOString(),
  }
}

export function normalizeApprovals(list: Record<string, unknown>[]): ApprovalRequest[] {
  return list.map(normalizeApproval)
}