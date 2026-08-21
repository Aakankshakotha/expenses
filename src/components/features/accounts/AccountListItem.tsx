'use client'

import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { formatCurrency } from '@/utils/currencyUtils'
import type { Account } from '@/types/account'

interface AccountListItemProps {
  account: Account
  onClick: () => void
  onEdit: (account: Account) => void
  onToggleStatus: (account: Account) => void
  onDelete: (account: Account) => void
}

export const AccountListItem: React.FC<AccountListItemProps> = ({
  account,
  onClick,
  onEdit,
  onDelete,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)

  const isPositive = account.balance >= 0
  const balanceColor = isPositive ? '#16a34a' : '#dc2626'

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
  }
  const handleMenuClose = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setMenuAnchor(null)
  }

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        p: '1rem 1.25rem',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
      }}
    >
      {/* Single row: name + balance + menu */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'text.primary' }}
        >
          {account.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{ fontSize: '1.1rem', fontWeight: 700, color: balanceColor }}
          >
            {formatCurrency(account.balance)}
          </Typography>
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{ color: 'text.secondary' }}
            title="More"
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => handleMenuClose()}
        onClick={(e) => e.stopPropagation()}
        slotProps={{
          paper: { elevation: 2, sx: { borderRadius: '10px', minWidth: 140 } },
        }}
      >
        <MenuItem
          onClick={(e) => {
            handleMenuClose(e)
            onEdit(account)
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          Edit
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={(e) => {
            handleMenuClose(e)
            onDelete(account)
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Paper>
  )
}

export default AccountListItem
