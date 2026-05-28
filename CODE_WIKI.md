# 文献解读 (wenxianjiedu) 项目 Code Wiki

## 1. 项目概述

文献解读是一个基于 React + TypeScript + Vite 的前端应用，使用 Tauri 框架实现本地文件系统访问，支持对 PDF、MD、TXT 等格式的文档进行批量解读。

### 核心功能
- 支持多种文件格式解析（PDF、MD、TXT）
- 与 OpenAI 兼容的 API 进行交互，对文档内容进行智能解读
- 批量处理多个文件，支持并发执行和失败重试
- 提供提示词模板管理功能
- 配置模型参数和连接测试

### 技术栈
- React 18.3.1
- TypeScript 5.6.2
- Vite 5.4.8
- Tauri 2.10.1（用于文件系统访问）
- pdfjs-dist 5.6.205（用于 PDF 解析）

## 2. 项目架构

项目采用了清晰的分层架构，遵循了依赖倒置原则，通过 useCases 层将业务逻辑与具体实现分离。

### 架构图

```
┌─────────────────┐
│     UI 层       │
│ (components)    │
└────────┬────────┘
         │
┌────────▼────────┐
│   App Facade    │
│  (appFacade.ts) │
└────────┬────────┘
         │
┌────────▼────────┐
│   Use Cases     │
│ (业务用例层)    │
└────────┬────────┘
         │
┌────────▼────────┐
│   Services      │
│ (业务服务层)    │
└────────┬────────┘
         │
┌────────▼────────┐
│ Repositories    │
│ (数据访问层)    │
└─────────────────┘
```

## 3. 目录结构

```
src/
├── app/                # 应用核心逻辑
│   ├── App.tsx         # 应用入口组件
│   ├── appFacade.ts    # 应用门面，提供统一的 API 接口
│   └── services.ts     # 服务注册和初始化
├── repositories/       # 数据访问层
│   ├── config/         # 配置存储
│   ├── credential/     # 凭证存储
│   ├── file/           # 文件系统访问
│   └── template/       # 提示词模板存储
├── services/           # 业务服务层
│   ├── llm/            # LLM 客户端
│   ├── output/         # 输出写入
│   ├── parser/         # 文档解析
│   └── prompt/         # 提示词构建
├── types/              # 类型定义
├── ui/                 # UI 组件和页面
│   ├── components/     # 可复用组件
│   └── pages/          # 页面组件
├── usecases/           # 业务用例
│   ├── config/         # 配置相关用例
│   ├── files/          # 文件相关用例
│   ├── run/            # 运行相关用例
│   └── templates/      # 模板相关用例
├── utils/              # 工具函数
├── main.tsx            # 应用入口
└── styles.css          # 全局样式
```

## 4. 核心模块

### 4.1 模型配置模块

负责管理与 LLM 模型的连接配置，包括 endpoint、model name、API key 等参数。

**主要文件**：
- `src/usecases/config/LoadModelConfigUseCase.ts`
- `src/usecases/config/SaveModelConfigUseCase.ts`
- `src/usecases/config/TestModelConnectionUseCase.ts`

**核心功能**：
- 加载和保存模型配置
- 测试模型连接
- 验证 API 密钥有效性

### 4.2 文件处理模块

负责文件的选择、加载和解析，支持 PDF、MD、TXT 等格式。

**主要文件**：
- `src/usecases/files/LoadInputFilesUseCase.ts`
- `src/services/parser/DefaultDocumentParser.ts`
- `src/services/parser/PdfParser.ts`
- `src/services/parser/MdParser.ts`
- `src/services/parser/TxtParser.ts`

**核心功能**：
- 选择单个文件或文件夹
- 递归扫描文件夹中的文件
- 根据文件类型选择相应的解析器
- 提取文件内容

### 4.3 提示词管理模块

负责提示词模板的创建、保存、加载和删除。

**主要文件**：
- `src/usecases/templates/ListTemplatesUseCase.ts`
- `src/usecases/templates/SaveTemplateUseCase.ts`
- `src/usecases/templates/DeleteTemplateUseCase.ts`
- `src/services/prompt/DefaultPromptComposer.ts`

**核心功能**：
- 管理提示词模板
- 根据文档内容和提示词模板生成完整的提示词
- 支持文档分块处理

### 4.4 任务执行模块

负责执行单个或批量文档解读任务，支持并发执行和失败重试。

**主要文件**：
- `src/usecases/run/RunSingleInterpretationUseCase.ts`
- `src/usecases/run/RunBatchInterpretationUseCase.ts`
- `src/services/llm/OpenAICompatibleClient.ts`

**核心功能**：
- 执行单个文档解读
- 批量执行多个文档解读
- 支持并发执行
- 处理失败重试
- 生成输出文件

### 4.5 结果展示模块

负责展示解读结果和任务执行状态。

**主要文件**：
- `src/ui/components/ResultPanel.tsx`
- `src/ui/components/TaskPanel.tsx`

**核心功能**：
- 展示任务执行状态
- 展示解读结果
- 处理错误信息

## 5. 关键类与函数

### 5.1 AppFacade

应用门面，提供统一的 API 接口，是 UI 层与业务逻辑层的桥梁。

**主要方法**：
- `loadInitialData()`: 加载初始数据，包括配置、API 密钥状态和模板列表
- `saveModelConfig()`: 保存模型配置
- `testModelConnection()`: 测试模型连接
- `loadFiles()`: 加载输入文件
- `runSingle()`: 执行单个文档解读
- `runBatch()`: 执行批量文档解读

### 5.2 OpenAICompatibleClient

与 OpenAI 兼容的 LLM 客户端，负责与模型 API 进行交互。

**主要方法**：
- `generate()`: 调用模型 API 生成文本

**核心逻辑**：
- 处理 API 请求的超时和取消
- 解析 API 响应
- 处理错误情况

### 5.3 DefaultDocumentParser

文档解析器，根据文件类型选择相应的解析器。

**主要方法**：
- `parse()`: 解析文档内容

### 5.4 DefaultPromptComposer

提示词构建器，根据文档内容和提示词模板生成完整的提示词。

**主要方法**：
- `compose()`: 构建提示词

### 5.5 DefaultMarkdownWriter

输出写入器，将解读结果写入 Markdown 文件。

**主要方法**：
- `write()`: 写入解读结果

### 5.6 RunSingleInterpretationUseCase

执行单个文档解读的用例。

**主要方法**：
- `execute()`: 执行单个文档解读

**核心逻辑**：
- 解析文档内容
- 构建提示词
- 调用 LLM API
- 写入解读结果

### 5.7 RunBatchInterpretationUseCase

执行批量文档解读的用例。

**主要方法**：
- `execute()`: 执行批量文档解读

**核心逻辑**：
- 并发执行多个文档解读
- 处理失败重试
- 跟踪任务执行状态

## 6. 数据结构

### 6.1 配置相关

```typescript
// 模型提供商类型
export type ModelProviderType = 'openai_compatible';

// 端点模式
export type EndpointMode = 'auto' | 'manual';

// 模型配置
export interface ModelConfig {
  providerType: ModelProviderType;
  endpoint: string;
  endpointMode: EndpointMode;
  modelName: string;
  timeoutMs: number;
  temperature?: number;
  maxTokens?: number;
}

// 批处理配置
export interface BatchConfig {
  concurrency: number;
  retryCount: number;
  skipExistingOutput: boolean;
}

// 应用配置
export interface AppConfig {
  model: ModelConfig;
  batch: BatchConfig;
  apiKeySaved: boolean;
  lastInputPath?: string;
  lastOutputPath?: string;
  recursiveDefault: boolean;
}
```

### 6.2 文件相关

```typescript
// 文件类型
export type FileKind = 'pdf' | 'md' | 'txt';

// 源文件引用
export interface SourceFileRef {
  id: string;
  path: string;
  name: string;
  ext: FileKind;
}
```

### 6.3 任务相关

```typescript
// 任务模式
export type TaskMode = 'single' | 'batch';

// 任务项状态
export type TaskItemStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled';

// 任务项
export interface TaskItem {
  id: string;
  file: SourceFileRef;
  status: TaskItemStatus;
  attempts?: number;
  skipped?: boolean;
  startedAt?: string;
  finishedAt?: string;
  outputPath?: string;
  errorCode?: string;
  errorMessage?: string;
  chunking?: ChunkingMetadata;
}

// 任务状态
export interface JobState {
  id: string;
  mode: TaskMode;
  total: number;
  completed: number;
  failed: number;
  cancelledCount: number;
  skippedCount: number;
  cancelled: boolean;
  currentItemId?: string;
  currentItemIds: string[];
  reportPath?: string;
  items: TaskItem[];
}
```

### 6.4 提示词相关

```typescript
// 提示词模板
export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// 分块元数据
export interface ChunkingMetadata {
  enabled: boolean;
  chunkCount?: number;
  originalLength: number;
  finalLength: number;
  degraded?: boolean;
  degradeReason?: string;
}

// 构建提示词输入
export interface ComposePromptInput {
  promptContent: string;
  document: ParsedDocument;
}

// 构建提示词输出
export interface ComposedPrompt {
  userPrompt: string;
  sourceSummary: {
    fileName: string;
    filePath: string;
    kind: FileKind;
  };
  truncation: {
    applied: boolean;
    originalLength: number;
    finalLength: number;
  };
  chunking?: ChunkingMetadata;
}
```

### 6.5 解析器相关

```typescript
// 解析文档
export interface ParsedDocument {
  id: string;
  path: string;
  name: string;
  kind: FileKind;
  text: string;
  meta: {
    byteSize?: number;
    extractedAt: string;
    title?: string;
  };
}
```

## 7. 依赖关系

### 7.1 核心依赖

| 依赖项 | 版本 | 用途 |
|-------|------|------|
| React | ^18.3.1 | 前端 UI 框架 |
| React DOM | ^18.3.1 | React DOM 操作 |
| pdfjs-dist | ^5.6.205 | PDF 解析 |
| @tauri-apps/plugin-dialog | ^2.0.0 | 文件选择对话框 |
| @tauri-apps/plugin-fs | ^2.0.0 | 文件系统操作 |

### 7.2 开发依赖

| 依赖项 | 版本 | 用途 |
|-------|------|------|
| TypeScript | ^5.6.2 | 类型系统 |
| Vite | ^5.4.8 | 构建工具 |
| @vitejs/plugin-react | ^4.3.1 | Vite React 插件 |
| @tauri-apps/cli | ^2.10.1 | Tauri 命令行工具 |

## 8. 项目运行方式

### 8.1 开发模式

```bash
npm run dev
```

### 8.2 构建生产版本

```bash
npm run build
```

### 8.3 预览生产版本

```bash
npm run preview
```

## 9. 核心工作流程

### 9.1 单个文档解读流程

1. 用户配置模型参数（endpoint、model name、API key 等）
2. 用户选择单个输入文件
3. 用户选择输出目录
4. 用户选择或创建提示词模板
5. 用户点击开始按钮
6. 应用解析文件内容
7. 应用根据提示词模板生成提示词
8. 应用调用 LLM API 进行解读
9. 应用将结果写入输出目录
10. 应用展示处理结果

### 9.2 批量文档解读流程

1. 用户配置模型参数（endpoint、model name、API key 等）
2. 用户选择文件夹（可选择是否递归扫描）
3. 用户选择输出目录
4. 用户选择或创建提示词模板
5. 用户配置批量处理参数（并发数、重试次数等）
6. 用户点击开始按钮
7. 应用加载所有文件
8. 应用并发执行多个文档解读任务
9. 应用处理失败重试
10. 应用将结果写入输出目录
11. 应用展示处理结果和任务执行状态

## 10. 关键技术点

### 10.1 文档解析

- 支持 PDF、MD、TXT 等多种文件格式
- 使用 pdfjs-dist 库解析 PDF 文件
- 针对不同文件类型使用不同的解析策略

### 10.2 提示词构建

- 支持提示词模板管理
- 根据文档内容和提示词模板生成完整的提示词
- 支持文档分块处理，适应长文档

### 10.3 LLM 交互

- 与 OpenAI 兼容的 API 进行交互
- 支持流式响应处理
- 处理 API 请求的超时和取消

### 10.4 批量处理

- 支持并发执行多个文档解读任务
- 处理失败重试
- 跟踪任务执行状态

### 10.5 文件系统操作

- 使用 Tauri 框架实现本地文件系统访问
- 支持文件选择、目录选择和文件写入

## 11. 配置与部署

### 11.1 配置文件

应用配置存储在本地，包括：
- 模型配置（endpoint、model name、timeout 等）
- UI 偏好设置（上次输入路径、上次输出路径等）
- 批量处理配置（并发数、重试次数等）

### 11.2 部署方式

- 作为桌面应用部署（使用 Tauri）
- 作为 Web 应用部署（使用 Vite 构建）

## 12. 总结

文献解读项目是一个功能完整的文档智能解读工具，通过与 LLM API 集成，实现了对多种格式文档的智能解读。项目采用了清晰的分层架构，代码组织合理，功能完善，用户体验良好。

### 主要亮点

- 支持多种文件格式解析
- 与 OpenAI 兼容的 API 集成
- 批量处理能力，支持并发执行
- 提示词模板管理
- 友好的用户界面
- 完善的错误处理和状态管理

项目为用户提供了一个便捷的工具，帮助用户快速理解和分析大量文档内容，提高工作效率。