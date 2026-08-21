'use client'

import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MuiSelect from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Badge from '@mui/material/Badge'
import Tooltip from '@mui/material/Tooltip'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import TuneIcon from '@mui/icons-material/Tune'
import CloseIcon from '@mui/icons-material/Close'
import type { TransactionType } from '@/hooks/useTransactionFilters'
import { ALL_TYPES } from '@/hooks/useTransactionFilters'
import type { TransactionCategory } from '@/types/transaction'

interface TransactionFiltersProps {
  categories: TransactionCategory[]
  customStartDate: string
  onCustomStartChange: (value: string) => void
  customEndDate: string
  onCustomEndChange: (value: string) => void
  searchTerm: string
  onSearchTermChange: (value: string) => void
  typeFilter: TransactionType[]
  onTypeFilterChange: (value: TransactionType[]) => void
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
}

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Expenses',
  income: 'Income',
  transfer: 'Transfer between accounts',
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  categories,
  customStartDate,
  onCustomStartChange,
  customEndDate,
  onCustomEndChange,
  searchTerm,
  onSearchTermChange,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
}) => {
  const [open, setOpen] = useState(false)

  const activeFilterCount = [
    !!customStartDate || !!customEndDate,
    searchTerm.trim() !== '',
    typeFilter.length < ALL_TYPES.length,
    categoryFilter !== 'all',
  ].filter(Boolean).length

  const handleClearAll = () => {
    onCustomStartChange('')
    onCustomEndChange('')
    onSearchTermChange('')
    onTypeFilterChange(ALL_TYPES)
    onCategoryFilterChange('all')
  }

  const handleTypeToggle = (type: TransactionType) => {
    if (typeFilter.includes(type)) {
      onTypeFilterChange(typeFilter.filter((t) => t !== type))
    } else {
      onTypeFilterChange([...typeFilter, type])
    }
  }

  const groupMeta: Record<TransactionCategory['group'], string> = {
    income: 'Income',
    home: 'Home',
    transportation: 'Transportation',
    food: 'Food & Dining',
    healthcare: 'Healthcare',
    entertainment: 'Entertainment',
    utilities: 'Utilities & Bills',
    personal: 'Personal',
    other: 'Other',
  }
  const groupOrder: TransactionCategory['group'][] = [
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
  const categoryGroups = groupOrder.map((key) => ({
    key,
    label: groupMeta[key],
    categories: categories.filter((c) => c.group === key),
  }))

  return (
    <>
      <Tooltip title="Filters">
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            border: '1px solid',
            borderColor: activeFilterCount > 0 ? 'primary.main' : 'divider',
            borderRadius: '8px',
            color: activeFilterCount > 0 ? 'primary.main' : 'text.secondary',
          }}
        >
          <Badge badgeContent={activeFilterCount} color="primary">
            <TuneIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: { width: 320, display: 'flex', flexDirection: 'column' },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Filter
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {activeFilterCount > 0 && (
              <Button
                size="small"
                onClick={handleClearAll}
                sx={{ fontSize: '0.75rem' }}
              >
                Clear all
              </Button>
            )}
            <IconButton size="small" onClick={() => setOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            overflowY: 'auto',
            flex: 1,
            px: 2.5,
            py: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {/* Category */}
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, mb: 1, color: 'text.primary' }}
            >
              Category
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <MuiSelect
                label="Category"
                value={categoryFilter}
                onChange={(e) => onCategoryFilterChange(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categoryGroups.map((group) =>
                  group.categories.length > 0
                    ? [
                        <MenuItem
                          key={`group-${group.key}`}
                          disabled
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            opacity: 0.55,
                            py: 0.5,
                          }}
                        >
                          {group.label}
                        </MenuItem>,
                        ...group.categories.map((cat) => (
                          <MenuItem key={cat.id} value={cat.id} sx={{ pl: 3 }}>
                            {cat.icon || '📌'} {cat.name}
                          </MenuItem>
                        )),
                      ]
                    : []
                )}
              </MuiSelect>
            </FormControl>
          </Box>

          <Divider />

          {/* From / To */}
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, mb: 1, color: 'text.primary' }}
            >
              From / To
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From"
                value={customStartDate}
                onChange={(e) => onCustomStartChange(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To"
                value={customEndDate}
                onChange={(e) => onCustomEndChange(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          </Box>

          <Divider />

          {/* Description */}
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, mb: 1, color: 'text.primary' }}
            >
              Description
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder="Search in description..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
            />
          </Box>

          <Divider />

          {/* Type */}
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, mb: 1, color: 'text.primary' }}
            >
              Type
            </Typography>
            <FormGroup>
              {ALL_TYPES.map((type) => (
                <FormControlLabel
                  key={type}
                  control={
                    <Checkbox
                      checked={typeFilter.includes(type)}
                      onChange={() => handleTypeToggle(type)}
                      size="small"
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">{TYPE_LABELS[type]}</Typography>
                  }
                />
              ))}
            </FormGroup>
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            fullWidth
            variant="text"
            color="primary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </Box>
      </Drawer>
    </>
  )
}
