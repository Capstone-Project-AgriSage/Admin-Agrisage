import type { AiEscalationAction, AiEscalationCase, AiEscalationStatus } from '../types'
import { aiEscalations as seedCases } from '../data/mockAiEscalations'

/** Mock "backend" for AI escalation cases — see accountsService.ts for the pattern
 * this follows (in-memory store, mutations return the updated record, actions
 * derived from status instead of hand-duplicated per record). */

let store: AiEscalationCase[] = seedCases.map((c) => ({ ...c }))

export function actionsFor(status: AiEscalationStatus): AiEscalationAction[] {
  if (status !== 'Chờ Admin xử lý') return []
  return [
    { id: 'approve', label: 'Phê duyệt', icon: 'check_circle', tone: 'primary' },
    { id: 'reject', label: 'Từ chối', icon: 'cancel', tone: 'danger' },
    { id: 'survey', label: 'Yêu cầu khảo sát lại', icon: 'travel_explore' },
  ]
}

export function list(): AiEscalationCase[] {
  return store
}

const DECISION_STATUS: Record<'approve' | 'reject' | 'survey', AiEscalationStatus> = {
  approve: 'Đã phê duyệt',
  reject: 'Đã từ chối',
  survey: 'Đã yêu cầu khảo sát lại',
}

export function decide(id: string, decision: 'approve' | 'reject' | 'survey', note?: string): AiEscalationCase | undefined {
  const status = DECISION_STATUS[decision]
  let updated: AiEscalationCase | undefined
  store = store.map((c) => {
    if (c.id !== id) return c
    updated = { ...c, status, adminDecisionNote: note || c.adminDecisionNote }
    return updated
  })
  return updated
}
