import { useState, useEffect, useCallback } from 'react'
import { fallbackStrategyService, type FallbackNotification } from '../../services/llm/FallbackStrategyService'

const TYPE_CONFIG = {
  warning: { bg: '#fef3c7', border: '#f59e0b', icon: '⚠️', color: '#92400e' },
  error: { bg: '#fef2f2', border: '#ef4444', icon: '❌', color: '#991b1b' },
  success: { bg: '#f0fdf4', border: '#10b981', icon: '✅', color: '#065f46' },
  info: { bg: '#eff6ff', border: '#3b82f6', icon: 'ℹ️', color: '#1e40af' },
} as const

export function ToastNotification() {
  const [notifications, setNotifications] = useState<FallbackNotification[]>([])

  const handleNotification = useCallback((notif: FallbackNotification) => {
    setNotifications(prev => [notif, ...prev].slice(0, 5))
  }, [])

  useEffect(() => {
    const unsubscribe = fallbackStrategyService.addListener(handleNotification)
    return unsubscribe
  }, [handleNotification])

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (notifications.length === 0) return
    const timer = setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1))
    }, 5000)
    return () => clearTimeout(timer)
  }, [notifications])

  function dismiss(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id))
    fallbackStrategyService.dismissNotification(id)
  }

  if (notifications.length === 0) return null

  return (
    <div style={styles.container}>
      {notifications.map((notif) => {
        const config = TYPE_CONFIG[notif.type]
        return (
          <div
            key={notif.id}
            style={{
              ...styles.toast,
              backgroundColor: config.bg,
              borderLeft: `4px solid ${config.border}`,
              color: config.color,
            }}
          >
            <span style={styles.icon}>{config.icon}</span>
            <span style={styles.message}>{notif.message}</span>
            <button style={styles.dismissBtn} onClick={() => dismiss(notif.id)}>×</button>
          </div>
        )
      })}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxWidth: 400,
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    fontSize: 'var(--font-sm)',
    animation: 'slideIn 0.3s ease-out',
  },
  icon: {
    fontSize: 'var(--font-lg)',
    flexShrink: 0,
  },
  message: {
    flex: 1,
    lineHeight: 1.4,
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-lg)',
    cursor: 'pointer',
    color: 'inherit',
    opacity: 0.6,
    padding: '0 4px',
  },
}
