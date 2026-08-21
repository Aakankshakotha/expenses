'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import type { TransactionCategory } from '@/types/transaction'
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@/services/categoryService'
import {
  listAllCategories,
  createUserCategory,
  updateUserCategory,
  deleteUserCategory,
} from '@/services/categoryService'

// ── Constants ────────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<TransactionCategory['group'], string> = {
  income: 'Income',
  home: 'Housing & Home',
  transportation: 'Transportation',
  food: 'Food & Dining',
  healthcare: 'Healthcare',
  entertainment: 'Entertainment',
  utilities: 'Utilities & Bills',
  personal: 'Personal',
  other: 'Other',
}

const GROUP_ORDER: TransactionCategory['group'][] = [
  'income',
  'home',
  'transportation',
  'food',
  'healthcare',
  'entertainment',
  'utilities',
  'personal',
  'other',
]

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#6b7280',
]

const EMPTY_FORM: CreateCategoryDto = {
  name: '',
  group: 'other',
  color: '#6b7280',
  icon: '',
}

// ── Category Form Dialog ──────────────────────────────────────────────────────

interface CategoryFormProps {
  open: boolean
  editing: TransactionCategory | null
  onClose: () => void
  onSave: (dto: CreateCategoryDto | UpdateCategoryDto) => Promise<void>
}

function CategoryForm({ open, editing, onClose, onSave }: CategoryFormProps) {
  const [form, setForm] = useState<CreateCategoryDto>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name,
              group: editing.group,
              color: editing.color,
              icon: editing.icon ?? '',
            }
          : EMPTY_FORM
      )
      setError(null)
    }
  }, [open, editing])

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Category name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          pt: '16px !important',
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        {/* Icon + preview */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              backgroundColor: form.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0,
            }}
          >
            {form.icon || '📌'}
          </Box>
          <TextField
            label="Emoji icon"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            size="small"
            sx={{ width: 120 }}
            placeholder="📌"
            inputProps={{ maxLength: 4 }}
          />
        </Box>

        <TextField
          label="Category name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          autoFocus
          size="small"
          fullWidth
        />

        <FormControl size="small" fullWidth>
          <InputLabel>Group</InputLabel>
          <Select
            label="Group"
            value={form.group}
            onChange={(e) =>
              setForm({
                ...form,
                group: e.target.value as TransactionCategory['group'],
              })
            }
          >
            {GROUP_ORDER.map((g) => (
              <MenuItem key={g} value={g}>
                {GROUP_LABELS[g]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Color picker */}
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: 'block' }}
          >
            Color
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PRESET_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border:
                    form.color === c ? '3px solid' : '2px solid transparent',
                  borderColor:
                    form.color === c ? 'text.primary' : 'transparent',
                  transition: 'transform 0.1s',
                  '&:hover': { transform: 'scale(1.15)' },
                }}
              />
            ))}
            {/* Custom hex input */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                style={{
                  width: 28,
                  height: 28,
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title="Custom color"
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Category Card ────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: TransactionCategory
  onEdit: (cat: TransactionCategory) => void
  onDelete: (cat: TransactionCategory) => void
}

function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderRadius: '10px',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: 2 },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '8px',
          backgroundColor: category.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          flexShrink: 0,
        }}
      >
        {category.icon || '📌'}
      </Box>

      <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
        {category.name}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {!category.isCustom && (
          <Tooltip title="Built-in category">
            <Chip
              icon={<LockOutlinedIcon sx={{ fontSize: '0.8rem !important' }} />}
              label="Built-in"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20, opacity: 0.6 }}
            />
          </Tooltip>
        )}

        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(category)}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {category.isCustom && (
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => onDelete(category)}
              color="error"
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Paper>
  )
}

// ── Main Categories View ──────────────────────────────────────────────────────

export default function Categories() {
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionCategory | null>(null)
  const [deleteConfirm, setDeleteConfirm] =
    useState<TransactionCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const all = await listAllCategories()
      setCategories(all)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const grouped = GROUP_ORDER.reduce(
    (acc, group) => {
      acc[group] = categories.filter((c) => c.group === group)
      return acc
    },
    {} as Record<TransactionCategory['group'], TransactionCategory[]>
  )

  const handleSave = async (dto: CreateCategoryDto | UpdateCategoryDto) => {
    if (editing) {
      await updateUserCategory(editing.id, dto as UpdateCategoryDto)
    } else {
      await createUserCategory(dto as CreateCategoryDto)
    }
    await load()
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await deleteUserCategory(deleteConfirm.id)
      setDeleteConfirm(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete category')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Categories
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Organize your spending with categories — attach them to transactions
            and budgets for full tracking.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          sx={{ flexShrink: 0 }}
        >
          Add Category
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {GROUP_ORDER.map((group) => {
            const cats = grouped[group]
            if (cats.length === 0) return null
            const customCount = cats.filter((c) => c.isCustom).length
            return (
              <Box key={group}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    color="text.secondary"
                  >
                    {GROUP_LABELS[group].toUpperCase()}
                  </Typography>
                  <Chip
                    label={`${cats.length} total${customCount > 0 ? ` · ${customCount} custom` : ''}`}
                    size="small"
                    sx={{ fontSize: '0.65rem', height: 18 }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 1,
                  }}
                >
                  {cats.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      onEdit={(c) => {
                        setEditing(c)
                        setFormOpen(true)
                      }}
                      onDelete={(c) => setDeleteConfirm(c)}
                    />
                  ))}
                </Box>
              </Box>
            )
          })}
        </Box>
      )}

      {/* Create / Edit form */}
      <CategoryForm
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Category?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete{' '}
            <strong>
              {deleteConfirm?.icon} {deleteConfirm?.name}
            </strong>
            ? Existing transactions with this category will keep their
            assignment, but you won't be able to select it going forward.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : undefined}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
