import React from 'react'

import {
  AppWindow,
  ArrowClockwise,
  CaretDown as ArrowDownIcon,
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  ArrowsOutSimple,
  Article,
  Bell,
  CaretDown,
  Check,
  Checks,
  Database,
  EjectSimple,
  FilmSlate,
  FloppyDisk,
  FolderSimple,
  GearSix,
  HardDrive,
  Info,
  LinkSimple,
  ListBullets,
  MagnifyingGlass,
  Minus,
  Pause,
  PictureInPicture,
  Play,
  PlayCircle,
  Plus,
  Radio,
  Scissors,
  Sliders,
  SpeakerHigh,
  SpeakerSlash,
  Square,
  SquaresFour,
  StopCircle,
  Television,
  Trash,
  UsersThree,
  X,
} from '@phosphor-icons/react'

interface IconProps {
  name: string
  size?: 16 | 20
  className?: string
  title?: string
  style?: React.CSSProperties
}

const ICONS: Record<string, React.ComponentType<React.ComponentProps<typeof Play>>> = {
  'play-circle-line': PlayCircle,
  'play-circle-fill': PlayCircle,
  'play-fill': Play,
  'pause-fill': Pause,
  'layout-grid-line': SquaresFour,
  'list-unordered': ListBullets,
  'user-3-line': UsersThree,
  'tv-2-line': Television,
  'settings-3-line': GearSix,
  'video-line': FilmSlate,
  'article-line': Article,
  'folder-open-line': FolderSimple,
  'delete-bin-line': Trash,
  'arrow-down-s-line': CaretDown,
  'check-line': Check,
  'arrow-left-line': ArrowLeft,
  'arrow-left-s-line': ArrowLeft,
  'arrow-right-s-line': ArrowRight,
  'arrow-down-line': ArrowDownIcon,
  'fullscreen-line': ArrowsOutSimple,
  'volume-up-line': SpeakerHigh,
  'volume-mute-line': SpeakerSlash,
  'search-line': MagnifyingGlass,
  'scissors-2-line': Scissors,
  'radio-line': Radio,
  'hard-drive-2-line': HardDrive,
  'equalizer-line': Sliders,
  'notification-3-line': Bell,
  'database-2-line': Database,
  'information-line': Info,
  link: LinkSimple,
  'add-line': Plus,
  'refresh-line': ArrowClockwise,
  'external-link-line': ArrowSquareOut,
  'close-line': X,
  'window-line': AppWindow,
  'checkbox-blank-line': Square,
  'picture-in-picture-line': PictureInPicture,
  'subtract-line': Minus,
  'check-double-line': Checks,
  'save-3-line': FloppyDisk,
  'stop-circle-line': StopCircle,
  'eject-line': EjectSimple,
}

export function Icon({ name, size = 16, className = '', title, style }: IconProps) {
  const PhIcon = ICONS[name] ?? Play
  return <PhIcon size={size} className={className} weight="bold" aria-label={title} style={style} />
}
