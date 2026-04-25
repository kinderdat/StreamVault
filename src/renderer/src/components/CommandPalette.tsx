import { useEffect, useMemo, useState } from 'react'

import { useNavigate } from 'react-router'

import { usePlayerStore } from '@renderer/stores/playerStore'
import { useRecordingsStore } from '@renderer/stores/recordingsStore'
import { useStreamersStore } from '@renderer/stores/streamersStore'
import type { Recording, Streamer } from '@renderer/types/domain'
import { Command } from 'cmdk'

import { Icon } from './Icon'

type CommandItem =
  | { kind: 'nav'; label: string; to: string; keywords?: string[] }
  | { kind: 'action'; label: string; run: () => void; keywords?: string[] }
  | { kind: 'recording'; rec: Recording }
  | { kind: 'streamer'; streamer: Streamer }

function normalize(s: string): string {
  return s.toLowerCase().trim()
}

export function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const recordings = useRecordingsStore((s) => s.recordings)
  const streamers = useStreamersStore((s) => s.streamers)
  const loadPlayer = usePlayerStore((s) => s.load)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === 'k'
      const isCmdK = isK && (e.ctrlKey || e.metaKey)
      if (!isCmdK) return
      e.preventDefault()
      setOpen((v) => !v)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const items = useMemo<CommandItem[]>(() => {
    const base: CommandItem[] = [
      { kind: 'nav', label: 'Go to Dashboard', to: '/' },
      { kind: 'nav', label: 'Go to Recordings', to: '/recordings' },
      { kind: 'nav', label: 'Go to Streamers', to: '/streamers' },
      { kind: 'nav', label: 'Go to Clips', to: '/clips' },
      { kind: 'nav', label: 'Go to Settings', to: '/settings' },
      { kind: 'nav', label: 'Go to Player', to: '/player' },
      {
        kind: 'action',
        label: 'Open recordings folder',
        run: () => window.electronAPI.openRecordingsFolder(),
        keywords: ['folder', 'open', 'recordings', 'path'],
      },
      {
        kind: 'action',
        label: 'Open app data folder',
        run: () => window.electronAPI.openAppDataFolder(),
        keywords: ['folder', 'open', 'data', 'appdata'],
      },
    ]

    const q = normalize(query)
    const limit = q ? 30 : 12

    const recMatches = q
      ? recordings
          .filter((r) => {
            const t = normalize(r.title ?? '')
            const s = normalize(r.streamer_name ?? '')
            const p = normalize(r.platform ?? '')
            return t.includes(q) || s.includes(q) || p.includes(q) || String(r.id).includes(q)
          })
          .slice(0, limit)
          .map((rec) => ({ kind: 'recording', rec }) as const)
      : []

    const streamerMatches = q
      ? streamers
          .filter((s) => {
            const dn = normalize(s.display_name ?? '')
            const un = normalize(s.username ?? '')
            const p = normalize(s.platform ?? '')
            return dn.includes(q) || un.includes(q) || p.includes(q) || String(s.id).includes(q)
          })
          .slice(0, limit)
          .map((streamer) => ({ kind: 'streamer', streamer }) as const)
      : []

    return [...base, ...recMatches, ...streamerMatches]
  }, [query, recordings, streamers])

  function closeAnd(fn: () => void) {
    setOpen(false)
    queueMicrotask(fn)
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="cmdk-dialog"
      overlayClassName="cmdk-overlay"
    >
      <div className="cmdk-shell">
        <div className="cmdk-input-row">
          <Icon name="search-line" size={16} />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search recordings, streamers, or actions…"
            className="cmdk-input"
          />
          <kbd className="cmdk-kbd">Ctrl K</kbd>
        </div>
        <Command.List className="cmdk-list">
          <Command.Empty className="cmdk-empty">No results.</Command.Empty>

          <Command.Group heading="Actions" className="cmdk-group">
            {items
              .filter((i) => i.kind === 'nav' || i.kind === 'action')
              .map((i) => {
                const key = i.kind === 'nav' ? `nav:${i.to}` : `act:${i.label}`
                const label = i.label
                return (
                  <Command.Item
                    key={key}
                    className="cmdk-item"
                    value={label + ' ' + (i.keywords?.join(' ') ?? '')}
                    onSelect={() => {
                      if (i.kind === 'nav') closeAnd(() => navigate(i.to))
                      else closeAnd(() => i.run())
                    }}
                  >
                    <span className="cmdk-item-label">{label}</span>
                  </Command.Item>
                )
              })}
          </Command.Group>

          {query.trim() ? (
            <>
              <Command.Separator className="cmdk-sep" />
              <Command.Group heading="Recordings" className="cmdk-group">
                {items
                  .filter((i) => i.kind === 'recording')
                  .slice(0, 12)
                  .map((i) => (
                    <Command.Item
                      key={`rec:${i.rec.id}`}
                      className="cmdk-item"
                      value={`${i.rec.title ?? ''} ${i.rec.streamer_name ?? ''} ${i.rec.platform ?? ''} ${i.rec.id}`}
                      onSelect={() => {
                        const rec = i.rec
                        if (!rec.file_path) return
                        closeAnd(() => {
                          loadPlayer({
                            id: rec.id,
                            kind: 'recording',
                            filePath: rec.file_path,
                            title: rec.title ?? 'Untitled stream',
                            durationSecs: rec.duration_secs,
                            platform: rec.platform,
                          })
                          navigate('/player')
                        })
                      }}
                    >
                      <span className="cmdk-item-label">{i.rec.title ?? 'Untitled stream'}</span>
                      <span className="cmdk-item-meta">{i.rec.streamer_name}</span>
                    </Command.Item>
                  ))}
              </Command.Group>

              <Command.Group heading="Streamers" className="cmdk-group">
                {items
                  .filter((i) => i.kind === 'streamer')
                  .slice(0, 12)
                  .map((i) => (
                    <Command.Item
                      key={`streamer:${i.streamer.id}`}
                      className="cmdk-item"
                      value={`${i.streamer.display_name ?? ''} ${i.streamer.username ?? ''} ${i.streamer.platform ?? ''} ${i.streamer.id}`}
                      onSelect={() => closeAnd(() => navigate('/streamers'))}
                    >
                      <span className="cmdk-item-label">{i.streamer.display_name}</span>
                      <span className="cmdk-item-meta">@{i.streamer.username}</span>
                    </Command.Item>
                  ))}
              </Command.Group>
            </>
          ) : null}
        </Command.List>
      </div>
    </Command.Dialog>
  )
}
