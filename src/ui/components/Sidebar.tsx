import { type CSSProperties } from 'react'
import type { DashboardSection } from '../layouts/DashboardLayout'

interface NavItem {
  key: DashboardSection
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'model', label: '模型管理', icon: '🤖' },
  { key: 'files', label: '文件管理', icon: '📁' },
  { key: 'templates', label: '提示词', icon: '📝' },
  { key: 'task', label: '任务', icon: '⚡' },
  { key: 'results', label: '结果', icon: '📊' },
  { key: 'zotero', label: 'Zotero', icon: '📚' },
  { key: 'settings', label: '设置', icon: '⚙️' },
]

interface SidebarProps {
  activeSection: DashboardSection
  onSectionChange: (section: DashboardSection) => void
  collapsed: boolean
  onToggleCollapse: () => void
  badgeCounts?: Partial<Record<DashboardSection, number>>
}

export function Sidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onToggleCollapse,
  badgeCounts,
}: SidebarProps) {
  return (
    <nav style={{
      ...sidebarStyles.nav,
      width: collapsed ? 56 : 220,
    }}>
      <div style={sidebarStyles.header}>
        {!collapsed && <span style={sidebarStyles.logo}>📖 文献解读</span>}
        <button
          onClick={onToggleCollapse}
          style={sidebarStyles.collapseBtn}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
      <ul style={sidebarStyles.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.key
          const badge = badgeCounts?.[item.key]
          return (
            <li key={item.key} style={sidebarStyles.navItem}>
              <button
                onClick={() => onSectionChange(item.key)}
                style={{
                  ...sidebarStyles.navButton,
                  ...(isActive ? sidebarStyles.navButtonActive : {}),
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px 0' : '10px 16px',
                }}
                title={collapsed ? item.label : undefined}
              >
                <span style={sidebarStyles.icon}>{item.icon}</span>
                {!collapsed && (
                  <span style={sidebarStyles.label}>{item.label}</span>
                )}
                {!collapsed && badge !== undefined && badge > 0 && (
                  <span style={sidebarStyles.badge}>{badge}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const sidebarStyles: Record<string, CSSProperties> = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    backgroundColor: 'var(--color-bg-primary)',
    borderRight: '1px solid var(--color-border)',
    transition: 'width var(--transition-normal)',
    overflow: 'hidden',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 12px',
    borderBottom: '1px solid var(--color-border)',
    minHeight: 56,
  },
  logo: {
    fontSize: 'var(--font-md)',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    whiteSpace: 'nowrap',
  },
  collapseBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: 'var(--font-sm)',
    color: 'var(--color-text-secondary)',
    flexShrink: 0,
  },
  navList: {
    listStyle: 'none',
    margin: 0,
    padding: '8px 0',
    flex: 1,
    overflowY: 'auto',
  },
  navItem: {
    margin: '2px 8px',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: 'var(--font-sm)',
    color: 'var(--color-text-secondary)',
    transition: 'all var(--transition-fast)',
    textAlign: 'left',
  },
  navButtonActive: {
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-primary)',
    fontWeight: 600,
  },
  icon: {
    fontSize: 'var(--font-lg)',
    flexShrink: 0,
    width: 24,
    textAlign: 'center',
  },
  label: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    marginLeft: 'auto',
    minWidth: 20,
    height: 20,
    padding: '0 6px',
    borderRadius: 10,
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    fontSize: 'var(--font-xs)',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
