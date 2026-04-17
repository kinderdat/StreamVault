import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', gap: 16, background: 'var(--black)', padding: 32,
          fontFamily: 'var(--font-ui)',
        }}>
          <div style={{ fontSize: 32 }}>⚠</div>
          <h2 style={{ color: 'var(--text-display)', margin: 0, fontSize: 18, fontWeight: 700 }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 13, textAlign: 'center', maxWidth: 400 }}>
            {this.state.error.message}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ marginTop: 8 }}
          >
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
