'use client'

import React, { useEffect, useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import { format, parseISO } from 'date-fns'
import * as recurringService from '@/services/recurringService'
import type { CatchUpEntry, CatchUpResult } from '@/services/recurringService'
import { formatCurrency } from '@/utils/currencyUtils'
import { formatDate } from '@/utils/dateUtils'

// Module-level so React's dev double-mount (and remounts) can never post twice
let catchUpRun: Promise<CatchUpResult> | null = null

function runCatchUpOnce(): Promise<CatchUpResult> {
  catchUpRun ??= recurringService
    .processDueRecurring(formatDate(new Date()))
    .catch(() => ({ posted: [], failed: [] }))
  return catchUpRun
}

const MAX_LISTED = 4

function EntryList({ entries }: { entries: CatchUpEntry[] }) {
  const shown = entries.slice(0, MAX_LISTED)
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
      {shown.map((e) => (
        <li key={`${e.recurringId}-${e.date}`}>
          {e.description} · {formatCurrency(e.amount)} ·{' '}
          {format(parseISO(e.date), 'd MMM')}
          {e.message && ` — ${e.message}`}
        </li>
      ))}
      {entries.length > shown.length && (
        <li>and {entries.length - shown.length} more</li>
      )}
    </Box>
  )
}

/**
 * Posts recurring entries that came due while the app was closed, before any
 * page reads balances, then reports what happened.
 */
export function RecurringCatchUp({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<CatchUpResult | null>(null)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    let cancelled = false
    runCatchUpOnce().then((r) => {
      if (!cancelled) setResult(r)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Pages load their data on mount — hold them until catch-up has written
  if (!result) return null

  const { posted, failed } = result
  const hasNews = posted.length > 0 || failed.length > 0

  return (
    <>
      {children}
      <Snackbar
        open={hasNews && open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        // Failures need action, so they stay until dismissed
        autoHideDuration={failed.length > 0 ? null : 10000}
        onClose={(_, reason) => reason !== 'clickaway' && setOpen(false)}
      >
        <Alert
          severity={failed.length > 0 ? 'warning' : 'success'}
          onClose={() => setOpen(false)}
          sx={{ borderRadius: '10px', maxWidth: 420 }}
        >
          {posted.length > 0 && (
            <>
              <AlertTitle sx={{ fontWeight: 600 }}>
                Added {posted.length} recurring{' '}
                {posted.length === 1 ? 'entry' : 'entries'}
              </AlertTitle>
              <EntryList entries={posted} />
            </>
          )}
          {failed.length > 0 && (
            <>
              <AlertTitle sx={{ fontWeight: 600, mt: posted.length ? 1 : 0 }}>
                Couldn&apos;t add {failed.length}
              </AlertTitle>
              <EntryList entries={failed} />
              These retry automatically the next time you open the app.
            </>
          )}
        </Alert>
      </Snackbar>
    </>
  )
}
