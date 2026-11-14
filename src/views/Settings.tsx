'use client'

import React, { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import {
  differenceInDays,
  format,
  formatDistanceToNow,
  parseISO,
} from 'date-fns'
import type { ExportData } from '@/services/storageService'
import * as backupService from '@/services/backupService'
import type { BackupSummary } from '@/services/backupService'

const STALE_AFTER_DAYS = 7

const primaryButtonSx = {
  textTransform: 'none',
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  py: 1,
  backgroundColor: '#1e2d4a',
  '&:hover': { backgroundColor: '#162238' },
} as const

const secondaryButtonSx = {
  textTransform: 'none',
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  py: 1,
} as const

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '14px',
        border: 1,
        borderColor: 'divider',
        mb: 2,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: '1rem', mb: 0.5 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 2 }}>
        {description}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>{children}</Box>
    </Paper>
  )
}

function BackupStatus({ lastBackupAt }: { lastBackupAt: string | null }) {
  if (!lastBackupAt) {
    return (
      <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
        You have never backed up. Your data lives only in this browser —
        clearing site data or switching devices will lose it.
      </Alert>
    )
  }

  const last = parseISO(lastBackupAt)
  const stale = differenceInDays(new Date(), last) >= STALE_AFTER_DAYS
  return (
    <Alert
      severity={stale ? 'warning' : 'success'}
      sx={{ mb: 2, borderRadius: '10px' }}
    >
      Last backed up {formatDistanceToNow(last, { addSuffix: true })} (
      {format(last, 'd MMM yyyy, h:mm a')}).
      {stale && ' Time for a fresh backup.'}
    </Alert>
  )
}

export default function Settings(): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lastBackupAt, setLastBackupAt] = useState(
    backupService.getLastBackupAt
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    data: ExportData
    summary: BackupSummary
  } | null>(null)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const handleBackup = () =>
    run(async () => {
      await backupService.downloadBackup()
      setLastBackupAt(backupService.getLastBackupAt())
    })

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow choosing the same file again
    if (!file) return
    run(async () => setPending(await backupService.readBackupFile(file)))
  }

  const handleRestore = () =>
    run(async () => {
      if (!pending) return
      // Close first so a failure shows its error on the page, not behind the dialog
      setPending(null)
      await backupService.restoreBackup(pending.data)
      // Every screen loads its data on mount, so reload to show the restored data
      window.location.reload()
    })

  return (
    <Box sx={{ padding: '2rem', maxWidth: '760px', margin: '0 auto' }}>
      <Box sx={{ mb: '2rem' }}>
        <Typography
          component="h1"
          sx={{
            fontSize: '1.8rem',
            fontWeight: 700,
            color: 'text.primary',
            m: 0,
          }}
        >
          Backup & Data
        </Typography>
        <Typography
          sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: '0.25rem' }}
        >
          Keep a copy of your finances outside this browser
        </Typography>
      </Box>

      <BackupStatus lastBackupAt={lastBackupAt} />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <Section
        title="Back up"
        description="Downloads everything — accounts, transactions, recurring entries, budgets and custom categories — as a single file you can restore later."
      >
        <Button
          variant="contained"
          startIcon={<DownloadOutlinedIcon />}
          onClick={handleBackup}
          disabled={busy}
          sx={primaryButtonSx}
        >
          Download backup
        </Button>
      </Section>

      <Section
        title="Export to spreadsheet"
        description="All transactions as a CSV that opens in Excel or Google Sheets. Amounts are in rupees. This is for viewing — use a backup file to restore."
      >
        <Button
          variant="outlined"
          startIcon={<TableChartOutlinedIcon />}
          onClick={() => run(backupService.downloadTransactionsCsv)}
          disabled={busy}
          sx={secondaryButtonSx}
        >
          Export transactions (CSV)
        </Button>
      </Section>

      <Section
        title="Restore"
        description="Replace the data in this browser with a backup file. You'll see what's in the file before anything changes."
      >
        <Button
          variant="outlined"
          startIcon={<UploadFileOutlinedIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          sx={secondaryButtonSx}
        >
          Choose backup file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleFileChosen}
        />
      </Section>

      <Dialog
        open={pending !== null}
        onClose={() => !busy && setPending(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Restore this backup?</DialogTitle>
        <DialogContent>
          {pending && (
            <>
              <Typography sx={{ fontSize: '0.875rem', mb: 1.5 }}>
                Backup from{' '}
                <strong>
                  {pending.summary.exportedAt
                    ? format(
                        parseISO(pending.summary.exportedAt),
                        'd MMM yyyy, h:mm a'
                      )
                    : 'an unknown date'}
                </strong>
                :
              </Typography>
              <Box
                component="ul"
                sx={{
                  m: 0,
                  pl: 2.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                <li>{pending.summary.accounts} accounts</li>
                <li>{pending.summary.transactions} transactions</li>
                <li>{pending.summary.recurring} recurring entries</li>
                <li>{pending.summary.budgets} budgets</li>
                <li>{pending.summary.categories} custom categories</li>
              </Box>
              <Alert severity="warning" sx={{ mt: 2, borderRadius: '10px' }}>
                This replaces everything currently in this browser. Download a
                backup first if you might want today's data back.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPending(null)}
            disabled={busy}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRestore}
            disabled={busy}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '10px',
            }}
          >
            Replace my data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
