import * as Select from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'

interface RSelectProps {
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
  minWidth?: number
}

export function RSelect({ value, onValueChange, children, minWidth = 140 }: RSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', border: '1px solid var(--border-visible)',
          color: 'var(--text-primary)', padding: '0 12px',
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500,
          height: 38, borderRadius: 'var(--radius-xs)',
          cursor: 'pointer', outline: 'none', userSelect: 'none',
          minWidth, whiteSpace: 'nowrap',
          transition: 'border-color 120ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-visible)')}
      >
        <Select.Value />
        <Select.Icon style={{ marginLeft: 'auto', color: 'var(--text-disabled)' }}>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-visible)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            zIndex: 9999,
            minWidth: 'var(--radix-select-trigger-width)',
          }}
        >
          <Select.Viewport style={{ padding: 4 }}>
            {children}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export function ROption({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Select.Item
      value={value}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 32px 7px 10px',
        fontFamily: 'var(--font-ui)', fontSize: 14,
        color: 'var(--text-primary)', cursor: 'pointer',
        borderRadius: 'var(--radius-xs)',
        outline: 'none', position: 'relative',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator style={{ position: 'absolute', right: 10 }}>
        <Check size={12} style={{ color: 'var(--accent)' }} />
      </Select.ItemIndicator>
    </Select.Item>
  )
}
