import type { PropsWithChildren, ReactNode } from 'react'

type PanelCardProps = PropsWithChildren<{
  title: string
  extra?: ReactNode
}>

export function PanelCard({ title, extra, children }: PanelCardProps) {
  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        {extra ? <div>{extra}</div> : null}
      </div>
      <div style={styles.body}>{children}</div>
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #eef2f7',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  body: {
    padding: '16px',
  },
}
