import { useState } from 'react'
import { AppProvider, useAppContext } from '../contexts/AppContext'
import { useModelContext } from '../contexts/ModelContext'
import { useTaskContext } from '../contexts/TaskContext'
import { DashboardLayout, type DashboardSection } from '../layouts/DashboardLayout'
import { ModelConfigPanel } from '../components/ModelConfigPanel'
import { InputSelectorPanel } from '../components/InputSelectorPanel'
import { OutputPanel } from '../components/OutputPanel'
import { PromptEditorPanel } from '../components/PromptEditorPanel'
import { TaskPanel } from '../components/TaskPanel'
import { ResultPanel } from '../components/ResultPanel'
import { ZoteroPanel } from '../components/ZoteroPanel'
import { PanelCard } from '../components/PanelCard'
import { MultiModelManager } from '../components/MultiModelManager'
import { ModelStatusCard } from '../components/ModelStatusCard'
import { ToastNotification } from '../components/ToastNotification'
import { TaskProgressTimeline } from '../components/TaskProgressTimeline'
import { RealTimeLogPanel } from '../components/RealTimeLogPanel'
import { ParallelResultCompare } from '../components/ParallelResultCompare'

export function DashboardPage() {
  return (
    <AppProvider>
      <DashboardPageInner />
    </AppProvider>
  )
}

function DashboardPageInner() {
  const [activeSection, setActiveSection] = useState<DashboardSection>('model')
  const app = useAppContext()
  const model = useModelContext()
  const task = useTaskContext()

  const badgeCounts = {
    task: task.isRunning ? task.jobState?.total : undefined,
    files: app.files.length > 0 ? app.files.length : undefined,
  }

  if (app.loadingConfig) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner} />
        <p style={loadingStyles.text}>正在加载应用配置...</p>
      </div>
    )
  }

  if (app.bootstrapError) {
    return (
      <div style={loadingStyles.container}>
        <h2 style={{ color: 'var(--color-error)', marginBottom: 16 }}>初始化失败</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>{app.bootstrapError}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
          重新加载
        </button>
      </div>
    )
  }

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      badgeCounts={badgeCounts}
    >
      <ToastNotification />
      {activeSection === 'model' && (
        <>
          <MultiModelManager />
          {model.models.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)',
            }}>
              {model.models
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map(entry => (
                  <ModelStatusCard key={entry.id} entry={entry} />
                ))}
            </div>
          )}
          <ModelConfigPanel
            providerType={model.providerType}
            endpoint={model.endpoint}
            endpointMode={model.endpointMode}
            modelName={model.modelName}
            apiKeyInput={model.apiKeyInput}
            apiKeySaved={model.apiKeySaved}
            timeoutMs={model.timeoutMs}
            rememberApiKey={model.rememberApiKey}
            onProviderTypeChange={model.setProviderType}
            onEndpointChange={model.setEndpoint}
            onEndpointModeChange={model.setEndpointMode}
            onModelNameChange={model.setModelName}
            onApiKeyChange={model.setApiKeyInput}
            onTimeoutChange={model.setTimeoutMs}
            onRememberApiKeyChange={model.setRememberApiKey}
            onSave={model.handleSaveConfig}
            saving={model.savingConfig}
            testing={model.testingConnection}
          />
        </>
      )}
      {activeSection === 'files' && (
        <InputSelectorPanel
          sourceType={app.sourceType}
          sourcePath={app.sourcePath}
          recursive={app.recursive}
          loading={app.loadingFiles}
          onPickFile={app.handlePickFile}
          onPickFolder={app.handlePickFolder}
          files={app.files}
            onRecursiveChange={app.handleRecursiveChange}
            onToggleZotero={() => setActiveSection('zotero')}
        />
      )}
      {activeSection === 'templates' && (
        <PromptEditorPanel
          templates={app.templates}
          selectedTemplateId={app.selectedTemplateId}
          templateNameInput={app.templateNameInput}
          promptContent={app.promptContent}
          onSelectTemplate={(id) => app.setSelectedTemplateId(id)}
            onTemplateNameChange={app.setTemplateNameInput}
            onPromptChange={app.setPromptContent}
            onNewTemplate={() => {}}
            onSaveTemplate={app.handleSaveTemplate}
            onDeleteTemplate={() => { if (app.selectedTemplateId) app.handleDeleteTemplate(app.selectedTemplateId) }}
            saving={app.savingTemplate}
            deleting={app.deletingTemplate}
        />
      )}
      {activeSection === 'task' && (
        <>
          <TaskPanel
            isRunning={task.isRunning}
            total={task.jobState?.total ?? 0}
            completed={task.jobState?.completed ?? 0}
            failed={task.jobState?.failed ?? 0}
            cancelledCount={task.jobState?.cancelledCount ?? 0}
            skippedCount={task.jobState?.skippedCount ?? 0}
            isCancelling={task.isCancelling}
            canStart={app.loadingConfig ? false : task.canStart}
            canCancel={task.canCancel}
            concurrency={task.concurrency}
            retryCount={task.retryCount}
            skipExistingOutput={task.skipExistingOutput}
            enableChunking={task.enableChunking}
            currentFileNames={task.currentFileNames}
            currentStage={task.currentStage}
            onStart={() => { /* TODO: wire up start */ }}
            onCancel={() => { task.cancelRequestedRef.current = true }}
            onConcurrencyChange={task.setConcurrency}
            onRetryCountChange={task.setRetryCount}
            onSkipExistingOutputChange={task.setSkipExistingOutput}
            onEnableChunkingChange={task.setEnableChunking}
          />
          {task.jobState && task.jobState.items.length > 0 && (
            <TaskProgressTimeline
              items={task.jobState.items}
              currentItemId={task.jobState.currentItemId}
            />
          )}
          <OutputPanel
            outputDir={app.outputDir}
            outputFormat={app.outputFormat}
            onPickOutputDir={app.handlePickOutputDir}
            onOutputFormatChange={app.handleOutputFormatChange}
          />
          {task.logs && task.logs.length > 0 && (
            <RealTimeLogPanel logs={task.logs} />
          )}
        </>
      )}
      {activeSection === 'results' && (
        <>
          <ResultPanel
            latestChunking={task.latestChunking}
            jobState={task.jobState}
          />
          <ParallelResultCompare results={[]} />
        </>
      )}
      {activeSection === 'zotero' && <ZoteroPanel onSelectZoteroItem={(items) => { /* TODO */ }} />}
      {activeSection === 'settings' && (
        <PanelCard title="应用设置">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>输出格式</span>
              <select
                value={app.outputFormat}
                onChange={(e) => app.handleOutputFormatChange(e.target.value as 'default' | 'obsidian')}
                style={{ maxWidth: 300 }}
              >
                <option value="default">默认 Markdown</option>
                <option value="obsidian">Obsidian 格式</option>
              </select>
            </label>
            <label>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>并发数</span>
              <input
                type="number"
                min={1}
                max={5}
                value={task.concurrency}
                onChange={(e) => task.setConcurrency(Number(e.target.value))}
                style={{ maxWidth: 100 }}
              />
            </label>
            <label>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>重试次数</span>
              <input
                type="number"
                min={0}
                max={5}
                value={task.retryCount}
                onChange={(e) => task.setRetryCount(Number(e.target.value))}
                style={{ maxWidth: 100 }}
              />
            </label>
          </div>
        </PanelCard>
      )}
    </DashboardLayout>
  )
}

const loadingStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: 16,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  text: {
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-md)',
  },
}