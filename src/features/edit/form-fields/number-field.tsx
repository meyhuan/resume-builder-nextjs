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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { value, onValueChange, min, max, ...rest } = props
  const str: string = value == null || Number.isNaN(value) ? '' : String(value)
  return (
    <TextField
      {...rest}
      type="text"
      inputMode="numeric"
      value={str}
      onValueChange={(next: string): void => {
        const cleaned = next.replace(/\D/g, '')
        if (!cleaned) {
          onValueChange(undefined)
          return
        }
        const parsed: number = parseInt(cleaned, 10)
        if (Number.isNaN(parsed)) {
          onValueChange(undefined)
          return
        }
        onValueChange(parsed)
      }}
    />
  )
}
