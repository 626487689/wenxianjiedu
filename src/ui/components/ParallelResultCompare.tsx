 import { PanelCard } from './PanelCard'
 
 type ResultEntry = {
   modelName: string
   content: string
   modelId: string
 }
 
 type ParallelResultCompareProps = {
   results: ResultEntry[]
 }
 
 export function ParallelResultCompare({ results }: ParallelResultCompareProps) {
   if (results.length === 0) {
     return (
       <PanelCard title="多模型结果对比">
         <div style={styles.empty}>
           <div style={styles.emptyIcon}>📊</div>
           <div style={styles.emptyText}>暂无多模型结果</div>
           <div style={styles.emptyHint}>启用多模型并行后，结果将在此处并排展示</div>
         </div>
       </PanelCard>
     )
   }
 
   // Determine column count: 1-2 results → 2 cols, 3+ → 3 cols
   const columnCount = results.length >= 3 ? 3 : 2
 
   return (
     <PanelCard
       title="多模型结果对比"
       extra={<span style={styles.countBadge}>{results.length} 个模型</span>}
     >
       <div
         style={{
           ...styles.grid,
           gridTemplateColumns: `repeat(${Math.min(results.length, columnCount)}, 1fr)`,
         }}
       >
         {results.map((result) => (
           <div key={result.modelId} style={styles.column} className="animate-fadeIn">
             <div style={styles.columnHeader}>
               <span style={styles.modelName}>{result.modelName}</span>
               <span style={styles.modelId}>{result.modelId}</span>
             </div>
             <div style={styles.contentScroll}>
               <pre style={styles.content}>{result.content || '（无内容）'}</pre>
             </div>
           </div>
         ))}
       </div>
     </PanelCard>
   )
 }
 
 const styles: Record<string, React.CSSProperties> = {
   empty: {
     textAlign: 'center',
     padding: 'var(--spacing-2xl) var(--spacing-xl)',
   },
   emptyIcon: {
     fontSize: '32px',
     marginBottom: 'var(--spacing-sm)',
   },
   emptyText: {
     fontSize: 'var(--font-md)',
     color: 'var(--color-text-secondary)',
     fontWeight: 500,
   },
   emptyHint: {
     fontSize: 'var(--font-sm)',
     color: 'var(--color-text-tertiary)',
     marginTop: 'var(--spacing-xs)',
   },
   countBadge: {
     fontSize: 'var(--font-xs)',
     color: 'var(--color-text-tertiary)',
     fontFamily: 'var(--font-mono)',
   },
   grid: {
     display: 'grid',
     gap: 'var(--spacing-md)',
   },
   column: {
     display: 'flex',
     flexDirection: 'column',
     border: '1px solid var(--color-border)',
     borderRadius: 'var(--radius-md)',
     overflow: 'hidden',
   },
   columnHeader: {
     display: 'flex',
     alignItems: 'center',
     justifyContent: 'space-between',
     padding: 'var(--spacing-sm) var(--spacing-md)',
     backgroundColor: 'var(--color-bg-tertiary)',
     borderBottom: '1px solid var(--color-border)',
   },
   modelName: {
     fontSize: 'var(--font-sm)',
     fontWeight: 600,
     color: 'var(--color-text-primary)',
   },
   modelId: {
     fontSize: 'var(--font-xs)',
     color: 'var(--color-text-tertiary)',
     fontFamily: 'var(--font-mono)',
   },
   contentScroll: {
     maxHeight: '400px',
     overflowY: 'auto',
     padding: 'var(--spacing-md)',
     backgroundColor: 'var(--color-surface)',
   },
   content: {
     margin: 0,
     fontFamily: 'var(--font-mono)',
     fontSize: 'var(--font-xs)',
     lineHeight: 1.6,
     color: 'var(--color-text-primary)',
     whiteSpace: 'pre-wrap',
     wordBreak: 'break-word',
   },
 }
