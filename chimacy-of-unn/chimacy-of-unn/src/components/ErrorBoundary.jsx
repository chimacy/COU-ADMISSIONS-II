import React from 'react'
import { RefreshCcw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-4">
          <div className="text-center max-w-sm">
            <h1 className="text-lg font-bold font-display text-slate-800 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              This page hit an unexpected error instead of showing you a blank screen. Reloading usually fixes it.
            </p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              <RefreshCcw className="h-4 w-4" /> Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
