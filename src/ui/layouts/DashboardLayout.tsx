import { useState, type ReactNode } from 'react'
import { Sidebar } from '../components/Sidebar'

export type DashboardSection =
  | 'model'
  | 'files'
  | 'templates'
  | 'task'
  | 'results'
  | 'zotero'
  | 'settings'

interface DashboardLayoutProps {
  children: ReactNode
  activeSection: DashboardSection
  onSectionChange: (section: DashboardSection) => void
  /** Optional badge counts for sidebar navigation items */
  badgeCounts?: Partial<Record<DashboardSection, number>>
}

export function DashboardLayout({
  children,
  activeSection,
  onSectionChange,
  badgeCounts,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={styles.container}>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        badgeCounts={badgeCounts}
      />
      <main style={{
        ...styles.main,
        marginLeft: collapsed ? 56 : 220,
      }}>
        <div style={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: 'var(--color-bg-secondary)',
  },
  main: {
    flex: 1,
    transition: 'margin-left var(--transition-normal)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  content: {
    flex: 1,
    padding: 'var(--spacing-xl)',
    maxWidth: 1200,
    width: '100%',
    margin: '0 auto',
  },
}
