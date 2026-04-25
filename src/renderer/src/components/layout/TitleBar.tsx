import './titlebar.css'

export function TitleBar() {
  return (
    <div className="titlebar" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="titlebar-drag" />
    </div>
  )
}
