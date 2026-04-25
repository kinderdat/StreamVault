import * as React from 'react'

import { cn } from '../../utils/cn'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-[var(--control-height-md)] w-full min-w-0 rounded-[var(--radius-xs)] px-3 text-[13px]',
        'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-visible)]',
        'placeholder:text-[var(--text-disabled)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'
