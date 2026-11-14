import { describe, it, expect } from 'vitest'
import { getBudgetPeriodRange } from '../budgetService'

describe('getBudgetPeriodRange', () => {
  // Local-time constructors so the result doesn't depend on the UTC offset
  // (toISOString used to shift IST month starts back to the previous day)
  it('starts monthly budgets on the 1st, even just after local midnight', () => {
    const justAfterMidnight = new Date(2026, 10, 1, 0, 30) // 1 Nov, 00:30 local
    expect(getBudgetPeriodRange('monthly', justAfterMidnight)).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    })
  })

  it('starts weekly budgets on Monday, including when today is Sunday', () => {
    const sunday = new Date(2026, 10, 8, 12) // Sun 8 Nov 2026
    expect(getBudgetPeriodRange('weekly', sunday)).toEqual({
      startDate: '2026-11-02',
      endDate: '2026-11-08',
    })
  })

  it('covers the full calendar year for yearly budgets', () => {
    expect(getBudgetPeriodRange('yearly', new Date(2026, 5, 15))).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    })
  })
})
