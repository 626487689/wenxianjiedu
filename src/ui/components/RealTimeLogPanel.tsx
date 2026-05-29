 import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
 import { PanelCard } from './PanelCard'
 
 type LogLevel = 'INFO' | 'WARN' | 'ERROR'
 
 type RealTimeLogPanelProps = {
   logs: string[]
   maxEntries?: number
 }
 
 const LEVEL_COLORS: Record<LogLevel, string> = {
   INFO: 'var(--color-info)',
   WARN: 'var(--color-warning)',
   ERROR: 'var(--color-error)',
 }
 
 function detectLevel(line: string): LogLevel {
   const upper = line.toUpperCase()
   if (upper.includes('ERROR') || upper.includes('FAIL')) return 'ERROR'
   if (upper.includes('WARN')) return 'WARN'
   return 'INFO'
 }
 
 export function RealTimeLogPanel({ logs, maxEntries = 200 }: RealTimeLogPanelProps) {
   const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(new Set(['INFO', 'WARN', 'ERROR']))
   const [searchText, setSearchText] = useState('')
   const [autoScroll, setAutoScroll] = useState(true)
   const scrollRef = useRef<HTMLDivElement>(null)
   const userScrollingRef = useRef(false)
 
   // Detect user scroll to pause auto-scroll
   const handleScroll = useCallback(() => {
     const el = scrollRef.current
     if (!el) return
     const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30
     userScrollingRef.current = !atBottom
   }, [])
 
   // Auto-scroll when new logs arrive
   useEffect(() => {
     if (autoScroll && !userScrollingRef.current && scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight
     }
   }, [logs, autoScroll])
 
   const toggleLevel = (level: LogLevel) => {
     setActiveLevels((prev) => {
       const next = new Set(prev)
       if (next.has(level)) {
         if (next.size > 1) next.delete(level)
       } else {
         next.add(level)
       }
       return next
     })
   }
 
   const filteredLogs = useMemo(() => {
     const search = searchText.toLowerCase()
     const capped = logs.slice(-maxEntries)
     return capped.filter((line) => {
       const level = detectLevel(line)
       if (!activeLevels.has(level)) return false
       if (search && !line.toLowerCase().includes(search)) return false
       return true
     })
   }, [logs, maxEntries, activeLevels, searchText])
 
   const levelButtons: LogLevel[] = ['INFO', 'WARN', 'ERROR']
 
   return (
     <PanelCard
       title="实时日志"
       extra={
         <span style={styles.countBadge}>
           {filteredLogs.length} / {Math.min(logs.length, maxEntries)}
         </span>
       }
     >
       <div style={styles.container}>
         {/* Toolbar */}
         <div style={styles.toolbar}>
           <div style={styles.levelButtons}>
             {levelButtons.map((level) => (
               <button
                 key={level}
                 style={{
                   ...styles.levelButton,
                   ...(activeLevels.has(level) ? styles.levelButtonActive : {}),
                   color: activeLevels.has(level) ? LEVEL_COLORS[level] : 'var(--color-text-tertiary)',
                   borderColor: activeLevels.has(level) ? LEVEL_COLORS[level] : 'var(--color-border)',
                 }}
                 onClick={() => toggleLevel(level)}
               >
                 {level}
               </button>
             ))}
           </div>
 
           <div style={styles.toolbarRight}>
             <input
               style={styles.searchInput}
               type="text"
               placeholder="搜索日志..."
               value={searchText}
               onChange={(e) => setSearchText(e.target.value)}
             />
             <button
               style={{
                 ...styles.autoScrollButton,
                 ...(autoScroll ? styles.autoScrollActive : {}),
               }}
               onClick={() => {
                 setAutoScroll((prev) => !prev)
                 userScrollingRef.current = false
                 if (!autoScroll && scrollRef.current) {
                   scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                 }
               }}
             >
               {autoScroll ? '⬇ 自动滚动' : '⏸ 暂停滚动'}
             </button>
           </div>
         </div>
 
         {/* Log entries */}
         <div ref={scrollRef} style={styles.logContainer} onScroll={handleScroll}>
           {filteredLogs.length === 0 ? (
             <div style={styles.empty}>暂无日志</div>
           ) : (
             filteredLogs.map((line, idx) => {
               const level = detectLevel(line)
               return (
                 <div key={idx} style={styles.logLine}>
                   <span
                     style={{
                       ...styles.levelTag,
                       color: LEVEL_COLORS[level],
                       borderColor: LEVEL_COLORS[level],
                     }}
                   >
                     {level}
                   </span>
                   <span style={styles.logText}>{line}</span>
                 </div>
               )
             })
           )}
         </div>
 
         {/* Clear button */}
         <div style={styles.footer}>
           <button
             style={styles.clearButton}
             onClick={() => {
               // Trigger a custom event that parent can listen to
               window.dispatchEvent(new CustomEvent('logs:clear'))
             }}
             disabled={logs.length === 0}
           >
             🗑 清空日志
           </button>
         </div>
       </div>
     </PanelCard>
   )
 }
 
 const styles: Record<string, React.CSSProperties> = {
   container: {
     display: 'flex',
     flexDirection: 'column',
     gap: 'var(--spacing-sm)',
   },
   countBadge: {
     fontSize: 'var(--font-xs)',
     color: 'var(--color-text-tertiary)',
     fontFamily: 'var(--font-mono)',
   },
   toolbar: {
     display: 'flex',
     alignItems: 'center',
     justifyContent: 'space-between',
     gap: 'var(--spacing-sm)',
     flexWrap: 'wrap',
   },
   levelButtons: {
     display: 'flex',
     gap: '4px',
   },
   levelButton: {
     padding: '2px 8px',
     fontSize: 'var(--font-xs)',
     fontWeight: 600,
     fontFamily: 'var(--font-mono)',
     border: '1px solid var(--color-border)',
     borderRadius: 'var(--radius-sm)',
     backgroundColor: 'var(--color-surface)',
     cursor: 'pointer',
     transition: 'all var(--transition-fast)',
   },
   levelButtonActive: {
     backgroundColor: 'var(--color-bg-tertiary)',
   },
   toolbarRight: {
     display: 'flex',
     alignItems: 'center',
     gap: 'var(--spacing-xs)',
   },
   searchInput: {
     width: '160px',
     padding: '2px 8px',
     fontSize: 'var(--font-xs)',
     height: '26px',
   },
   autoScrollButton: {
     padding: '2px 8px',
     fontSize: 'var(--font-xs)',
     whiteSpace: 'nowrap',
   },
   autoScrollActive: {
     color: 'var(--color-primary)',
     borderColor: 'var(--color-primary)',
   },
   logContainer: {
     maxHeight: '300px',
     overflowY: 'auto',
     fontFamily: 'var(--font-mono)',
     fontSize: 'var(--font-xs)',
     backgroundColor: 'var(--color-bg-tertiary)',
     borderRadius: 'var(--radius-md)',
     padding: 'var(--spacing-sm)',
     display: 'flex',
     flexDirection: 'column',
     gap: '1px',
   },
   empty: {
     textAlign: 'center',
     padding: 'var(--spacing-xl)',
     color: 'var(--color-text-tertiary)',
   },
   logLine: {
     display: 'flex',
     alignItems: 'flex-start',
     gap: 'var(--spacing-sm)',
     padding: '2px 0',
     lineHeight: 1.5,
   },
   levelTag: {
     fontSize: '10px',
     fontWeight: 700,
     border: '1px solid',
     borderRadius: '3px',
     padding: '0 4px',
     flexShrink: 0,
     lineHeight: '16px',
   },
   logText: {
     color: 'var(--color-text-primary)',
     whiteSpace: 'pre-wrap',
     wordBreak: 'break-all',
     flex: 1,
   },
   footer: {
     display: 'flex',
     justifyContent: 'flex-end',
   },
   clearButton: {
     padding: '2px 10px',
     fontSize: 'var(--font-xs)',
   },
 }
