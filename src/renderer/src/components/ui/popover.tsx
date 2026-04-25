import * as React from 'react'

import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '../../utils/cn'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-[var(--z-popover)] w-72 rounded-[var(--radius-sm)] border border-[var(--border-visible)] bg-[var(--surface-raised)] p-3 text-[var(--text-primary)] shadow-[0_12px_40px_rgba(0,0,0,0.6)] outline-none',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName
