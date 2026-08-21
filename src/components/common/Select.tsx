'use client'

import { SelectHTMLAttributes, useId, type FocusEvent } from 'react'
import Box from '@mui/material/Box'
import FormHelperText from '@mui/material/FormHelperText'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'onChange' | 'color' | 'size'
> {
  label?: string
  options: SelectOption[]
  error?: string
  helperText?: string
  placeholder?: string
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void
}

export function Select({
  label,
  options,
  error,
  helperText,
  placeholder,
  required,
  disabled,
  className = '',
  id,
  onChange,
  onBlur,
  onFocus,
  value,
  ...rest
}: SelectProps): JSX.Element {
  const generatedId = useId()
  const selectId = id || generatedId
  const descriptionId =
    error || helperText ? `${selectId}-description` : undefined

  return (
    <Box
      className={className || undefined}
      sx={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
    >
      {label && (
        <label
          htmlFor={selectId}
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '0.25rem',
          }}
        >
          {label}
          {required && (
            <span style={{ color: '#dc2626', marginLeft: '0.15rem' }}>*</span>
          )}
        </label>
      )}

      <Box sx={{ position: 'relative' }}>
        <Box
          component="select"
          id={selectId}
          aria-describedby={descriptionId}
          aria-invalid={error ? 'true' : undefined}
          required={required}
          disabled={disabled}
          onChange={onChange}
          onBlur={(e: FocusEvent<HTMLSelectElement>) => onBlur?.(e)}
          onFocus={(e: FocusEvent<HTMLSelectElement>) => onFocus?.(e)}
          value={value}
          {...rest}
          sx={{
            width: '100%',
            appearance: 'none',
            WebkitAppearance: 'none',
            px: '0.875rem',
            py: '0.625rem',
            border: '1px solid',
            borderColor: error ? 'error.main' : 'divider',
            borderRadius: '0.5rem',
            backgroundColor: 'background.paper',
            fontSize: '0.9375rem',
            color: value ? 'text.primary' : 'text.secondary',
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: 'none',
            transition: 'border-color 0.15s ease',
            '&:focus': {
              borderColor: 'primary.main',
            },
            '&:disabled': {
              opacity: 0.5,
            },
          }}
        >
          <option value="" disabled>
            {placeholder || 'Select an option...'}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </Box>

        {/* Chevron icon */}
        <Box
          sx={{
            position: 'absolute',
            right: '0.625rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <KeyboardArrowDownIcon sx={{ fontSize: '1.25rem' }} />
        </Box>
      </Box>

      {(error || helperText) && (
        <FormHelperText id={descriptionId} error={Boolean(error)}>
          {error || helperText}
        </FormHelperText>
      )}
    </Box>
  )
}
