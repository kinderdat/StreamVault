import * as React from 'react'

import { cn } from '../../utils/cn'

export type ButtonVariant = 'default' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-xs)] font-[650] transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]',
          'disabled:pointer-events-none disabled:opacity-50',
          size === 'sm' && 'h-[var(--control-height-sm)] px-3 text-[12px]',
          size === 'md' && 'h-[var(--control-height-md)] px-4 text-[13px]',
          size === 'icon' && 'h-[var(--control-height-md)] w-[var(--control-height-md)] p-0',
          variant === 'default' &&
            'bg-[color-mix(in_srgb,var(--accent)_24%,var(--surface-raised))] text-[var(--text-display)] shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
          variant === 'secondary' &&
            'bg-[color-mix(in_srgb,var(--surface-raised)_80%,var(--black))] text-[var(--text-primary)]',
          variant === 'ghost' &&
            'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]',
          variant === 'danger' &&
            'bg-[color-mix(in_srgb,var(--danger)_14%,var(--surface-raised))] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_22%,var(--surface-raised))]',
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
