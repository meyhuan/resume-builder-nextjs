'use client'

import { type ReactElement } from 'react'
import { TextField, type TextFieldProps } from './text-field'

type Props = Omit<TextFieldProps, 'value' | 'onValueChange' | 'type'> & {
  readonly value: number | undefined
  readonly onValueChange: (next: number | undefined) => void
  readonly min?: number
  readonly max?: number
}

/**
 * Number text field that emits parsed integers (or undefined when empty).
 */
export function NumberField(props: Props): ReactElement {
  const { value, onValueChange, min, max, ...rest } = props
  const str: string = value === undefined || Number.isNaN(value) ? '' : String(value)
  return (
    <TextField
      {...rest}
      type="number"
      inputMode="numeric"
      value={str}
      onValueChange={(next: string): void => {
        if (!next.trim()) {
          onValueChange(undefined)
          return
        }
        let parsed: number = parseInt(next, 10)
        if (Number.isNaN(parsed)) {
          onValueChange(undefined)
          return
        }
        if (min !== undefined) parsed = Math.max(min, parsed)
        if (max !== undefined) parsed = Math.min(max, parsed)
        onValueChange(parsed)
      }}
    />
  )
}
