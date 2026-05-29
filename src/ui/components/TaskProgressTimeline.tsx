 import type { TaskItem, TaskItemStatus } from '../../types/task'
 import { PanelCard } from './PanelCard'
 
 type TaskProgressTimelineProps = {
   items: TaskItem[]
   currentItemId?: string
 }
 
 const statusConfig: Record<TaskItemStatus, { color: string; label: string; icon: string; pulse?: boolean }> = {
   pending:  { color: 'var(--color-text-tertiary)', label: '等待中', icon: '⏳' },
   running:  { color: 'var(--color-info)',          label: '运行中', icon: '🔄', pulse: true },
   success:  { color: 'var(--color-success)',       label: '成功',   icon: '✅' },
   failed:   { color: 'var(--color-error)',         label: '失败',   icon: '❌' },
   cancelled:{ color: 'var(--color-warning)',       label: '已取消', icon: '⬜' },
 }
 
 function formatDuration(startedAt?: string, finishedAt?: string): string | null {
   if (!startedAt) return null
   const start = new Date(startedAt).getTime()
   const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
   const diff = Math.max(0, end - start)
 
   if (diff < 1000) return `${diff}ms`
   if (diff < 60_000) return `${(diff / 1000).toFixed(1)}s`
   const minutes = Math.floor(diff / 60_000)
   const seconds = Math.floor((diff % 60_000) / 1000)
   return `${minutes}m ${seconds}s`
 }
 
 export function TaskProgressTimeline({ items, currentItemId }: TaskProgressTimelineProps) {
   if (items.length === 0) {
     return (
       <PanelCard title="任务进度时间线">
         <div style={styles.empty}>暂无任务项</div>
       </PanelCard>
     )
   }
 
   return (
     <PanelCard
       title="任务进度时间线"
       extra={<span style={styles.count}>{items.length} 项</span>}
     >
       <div style={styles.list}>
         {items.map((item) => {
           const cfg = statusConfig[item.status]
           const isActive = item.id === currentItemId || item.status === 'running'
           const duration = formatDuration(item.startedAt, item.finishedAt)
 
           return (
             <div
               key={item.id}
               style={{
                 ...styles.item,
                 ...(isActive ? styles.itemActive : {}),
               }}
               className="animate-fadeIn"
             >
               {/* Status dot */}
               <div style={styles.dotColumn}>
                 <div
                   style={{
                     ...styles.dot,
                     backgroundColor: cfg.color,
                     ...(cfg.pulse ? styles.dotPulse : {}),
                   }}
                   className={cfg.pulse ? 'animate-pulse' : ''}
                 />
                 <div style={styles.line} />
               </div>
 
               {/* Content */}
               <div style={styles.content}>
                 <div style={styles.contentRow}>
                   <span style={styles.filename} title={item.file.path}>
                     {item.file.name}
                   </span>
                   <span style={{ ...styles.statusBadge, color: cfg.color, borderColor: cfg.color }}>
                     {cfg.icon} {cfg.label}
                   </span>
                 </div>
                 <div style={styles.metaRow}>
                   {duration && (
                     <span style={styles.duration}>⏱ {duration}</span>
                   )}
                   {item.attempts != null && item.attempts > 1 && (
                     <span style={styles.attempts}>重试 {item.attempts} 次</span>
                   )}
                   {item.skipped && (
                     <span style={styles.skipped}>已跳过</span>
                   )}
                   {item.errorMessage && (
                     <span style={styles.errorMessage}>{item.errorMessage}</span>
                   )}
                 </div>
               </div>
             </div>
           )
         })}
       </div>
     </PanelCard>
   )
 }
 
 const styles: Record<string, React.CSSProperties> = {
   empty: {
     textAlign: 'center',
     padding: 'var(--spacing-xl)',
     color: 'var(--color-text-tertiary)',
     fontSize: 'var(--font-sm)',
   },
   count: {
     fontSize: 'var(--font-xs)',
     color: 'var(--color-text-tertiary)',
   },
   list: {
     display: 'flex',
     flexDirection: 'column',
     maxHeight: '300px',
     overflowY: 'auto',
     gap: 0,
   },
   item: {
     display: 'flex',
     gap: 'var(--spacing-sm)',
     padding: 'var(--spacing-sm) var(--spacing-xs)',
     borderRadius: 'var(--radius-sm)',
     transition: 'background-color var(--transition-fast)',
   },
   itemActive: {
     backgroundColor: 'var(--color-bg-tertiary)',
   },
   dotColumn: {
     display: 'flex',
     flexDirection: 'column',
     alignItems: 'center',
     width: '16px',
     flexShrink: 0,
     paddingTop: '4px',
   },
   dot: {
     width: '10px',
     height: '10px',
     borderRadius: '50%',
     flexShrink: 0,
     transition: 'all var(--transition-fast)',
   },
   dotPulse: {
     boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.2)',
   },
   line: {
     width: '2px',
     flex: 1,
     backgroundColor: 'var(--color-border)',
     marginTop: '4px',
   },
   content: {
     flex: 1,
     minWidth: 0,
     display: 'flex',
     flexDirection: 'column',
     gap: '2px',
   },
   contentRow: {
     display: 'flex',
     alignItems: 'center',
     justifyContent: 'space-between',
     gap: 'var(--spacing-sm)',
   },
   filename: {
     fontSize: 'var(--font-sm)',
     fontWeight: 500,
     color: 'var(--color-text-primary)',
     overflow: 'hidden',
     textOverflow: 'ellipsis',
     whiteSpace: 'nowrap',
     flex: 1,
   },
   statusBadge: {
     fontSize: 'var(--font-xs)',
     padding: '1px 6px',
     borderRadius: 'var(--radius-sm)',
     border: '1px solid',
     whiteSpace: 'nowrap',
     flexShrink: 0,
   },
   metaRow: {
     display: 'flex',
     alignItems: 'center',
     gap: 'var(--spacing-sm)',
     flexWrap: 'wrap',
   },
   duration: {
     fontSize: 'var(--font-xs)',
     color: 'var(--color-text-tertiary)',
     fontFamily: 'var(--font-mono)',
   },
   attempts: {
     fontSize: 'var(--font-xs)',
     color: 'var(--color-warning)',
   },
   skipped: {
     fontSize: 'var(--font-xs)',
     color: 'var(--color-info)',
   },
   errorMessage: {
     fontSize: 'var(--font-xs)',
     color: 'var(--color-error)',
     overflow: 'hidden',
     textOverflow: 'ellipsis',
     whiteSpace: 'nowrap',
     maxWidth: '240px',
   },
 }
