import * as React from 'react'

import * as SelectPrimitive from '@radix-ui/react-select'

import { cn } from '../../utils/cn'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full select-none items-center justify-between rounded-[10px] border border-[var(--border-visible)] bg-[color-mix(in_srgb,var(--surface)_85%,var(--black))] px-3 py-2 text-sm font-[650] text-[var(--text-primary)] shadow-none transition',
      'placeholder:text-[var(--text-disabled)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      'hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border-visible))] hover:text-[var(--text-display)]',
      'data-[state=open]:border-[var(--accent)] data-[state=open]:shadow-[0_0_0_3px_var(--accent-subtle)]',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <span className="ml-2 text-[var(--text-disabled)]">▾</span>
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-[var(--z-popover)] min-w-[10rem] overflow-hidden rounded-[12px] border border-[var(--border-visible)] bg-[color-mix(in_srgb,var(--surface-raised)_94%,var(--black))] text-[var(--text-primary)] shadow-[0_20px_56px_rgba(0,0,0,0.58)] backdrop-blur-md',
        position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-xs font-[750] text-[var(--text-disabled)]', className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-[9px] py-2 pl-2.5 pr-8 text-[13px] font-[650] outline-none',
      'focus:bg-[color-mix(in_srgb,var(--surface)_84%,var(--black))] focus:text-[var(--text-display)]',
      'data-[highlighted]:bg-[color-mix(in_srgb,var(--surface)_84%,var(--black))] data-[highlighted]:text-[var(--text-display)]',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex size-4 items-center justify-center text-[var(--accent)]">
      <SelectPrimitive.ItemIndicator>✓</SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-[var(--border)]', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName
