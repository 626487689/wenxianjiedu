import type { PropsWithChildren, ReactNode } from 'react'

type PanelCardProps = PropsWithChildren<{
  title: string
  extra?: ReactNode
  variant?: 'default' | 'elevated' | 'subtle'
}>

export function PanelCard({ title, extra, children, variant = 'default' }: PanelCardProps) {
  const getCardStyle = () => {
    switch (variant) {
      case 'elevated':
        return {
          ...styles.card,
          ...styles.cardElevated,
        }
      case 'subtle':
        return {
          ...styles.card,
          ...styles.cardSubtle,
        }
      default:
        return styles.card
    }
  }

  return (
    <section style={getCardStyle()} className="animate-fadeIn">
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        {extra ? <div style={styles.extra}>{extra}</div> : null}
      </div>
      <div style={styles.body}>{children}</div>
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
    transition: 'all var(--transition-normal)',
  },
  cardElevated: {
    boxShadow: 'var(--shadow-md)',
    borderColor: 'transparent',
  },
  cardSubtle: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    boxShadow: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--spacing-md) var(--spacing-lg)',
    borderBottom: '1px solid var(--color-border)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
  },
  title: {
    margin: 0,
    fontSize: 'var(--font-lg)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.01em',
  },
  extra: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  body: {
    padding: 'var(--spacing-lg)',
  },
}
