import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('应用错误:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backgroundColor: '#f5f7fb',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '16px' }}>应用启动失败</h1>
          <pre style={{
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
            padding: '16px',
            borderRadius: '8px',
            maxWidth: '800px',
            maxHeight: '400px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.errorInfo?.componentStack}
          </pre>
          <button
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

console.log('=== 应用开始加载 ===')

try {
  const root = document.getElementById('root')
  if (!root) {
    throw new Error('未找到 root 元素')
  }
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
  
  console.log('=== 应用渲染完成 ===')
} catch (error) {
  console.error('应用初始化失败:', error)
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; background: #f5f7fb;">
        <h1 style="color: #ef4444;">应用启动失败</h1>
        <p style="color: #64748b; margin-top: 16px;">${(error as Error).message}</p>
        <button style="margin-top: 16px; padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer;" onclick="window.location.reload()">
          重新加载
        </button>
      </div>
    `
  }
}
