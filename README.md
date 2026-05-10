# 文献解读系统 (Wenxian Jiedu)

一款基于 AI 的智能文献解读桌面应用，支持 PDF 文献的自动解析、分块处理和结构化解读报告生成。

## 功能特性

### 核心功能
- **PDF 文档解析**：自动提取 PDF 文献文本内容，支持多页文档
- **智能分块处理**：自动处理超长文档，采用滚动汇总策略避免 token 限制
- **多模型支持**：兼容 OpenAI 兼容接口的 AI 模型
- **结构化输出**：生成 Markdown 格式的结构化解读报告
- **批量处理**：支持多篇文献的批量解读

### 技术亮点
- **滚动汇总策略**：长文档分块处理后，采用多轮滚动汇总生成完整报告，避免单次请求 token 超限
- **智能缓存**：分块处理结果自动缓存，避免重复调用
- **容错机制**：关键步骤添加重试和降级方案，提高稳定性
- **配置化设计**：模型参数、分块大小等配置外置，提高灵活性

## 技术栈

- **前端框架**：React 18 + TypeScript
- **桌面框架**：Tauri 2.x
- **PDF 解析**：pdf.js
- **构建工具**：Vite
- **后端**：Rust

## 项目结构

```
wenxianjiedu/
├── src/                          # 前端源代码
│   ├── app/                      # 应用入口和门面
│   ├── hooks/                    # React Hooks
│   ├── plugins/                  # 插件系统
│   ├── repositories/             # 数据仓库层
│   ├── services/                 # 业务服务层
│   │   ├── analyzer/             # 论文分析服务
│   │   ├── api/                 # API 相关服务
│   │   ├── chunking/            # 分块处理服务
│   │   ├── config/              # 配置管理服务
│   │   ├── error/               # 错误处理服务
│   │   ├── llm/                 # LLM 客户端服务
│   │   ├── logger/              # 日志服务
│   │   ├── monitoring/          # 性能监控服务
│   │   ├── output/              # 输出服务
│   │   ├── parser/              # 文档解析服务
│   │   ├── prompt/              # 提示词服务
│   │   └── version/             # 版本服务
│   ├── types/                   # TypeScript 类型定义
│   ├── ui/                     # UI 组件
│   ├── usecases/               # 用例层
│   └── utils/                   # 工具函数
├── src-tauri/                   # Tauri/Rust 后端
│   ├── src/                     # Rust 源代码
│   ├── icons/                   # 应用图标
│   ├── capabilities/            # Tauri 能力配置
│   └── Cargo.toml              # Rust 依赖配置
├── dist/                        # 构建输出目录
├── docs/                        # 项目文档
├── outputs/                     # 运行时输出目录
└── tests/                       # 测试文件
```

## 快速开始

### 环境要求

- Node.js >= 18
- Rust >= 1.77.2
- Windows 10+ / macOS 10.15+ / Ubuntu 20.04+

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动前端开发服务器
npm run dev

# 或启动 Tauri 开发模式（需要 Rust 环境）
npm run tauri:dev
```

### 构建应用

```bash
# 构建 Tauri 应用
npm run tauri:build
```

构建完成后，可执行文件位于：
- Windows: `src-tauri/target/release/app.exe`
- macOS: `src-tauri/target/release/app.app`
- 安装包: `src-tauri/target/release/bundle/`

### 运行测试

```bash
npm run test
```

## 使用说明

### 配置模型

1. 打开应用，进入"模型配置"面板
2. 选择模型提供商类型（OpenAI 兼容）
3. 填写 API Endpoint、模型名称和 API Key
4. 点击"测试连接"验证配置

### 添加文献

1. 在"输入选择"面板中点击"添加文件"
2. 选择 PDF 文献文件
3. 文件将自动解析并显示基本信息

### 开始解读

1. 在"提示词"面板中选择或编辑解读模板
2. 在"输出设置"中选择输出目录
3. 在"任务控制"面板中勾选"启用分块处理"（处理长文献时推荐）
4. 点击"开始处理"

### 分块处理说明

对于较长的文献（通常超过 20 页），建议启用分块处理：

- 系统会自动将文档分成多个块
- 每个块独立调用模型生成阶段性解读
- 最后通过滚动汇总策略生成完整报告
- 这样可以避免单次请求 token 超限的问题

## 配置说明

### 模型配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| providerType | 提供商类型 | openai_compatible |
| endpoint | API 端点地址 | - |
| modelName | 模型名称 | - |
| apiKey | API 密钥 | - |
| timeoutMs | 请求超时(ms) | 60000 |
| temperature | 生成温度 | 0.7 |
| maxTokens | 最大生成 tokens | 8192 |

### 分块配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| enabled | 是否启用分块 | false |
| maxChunkSize | 最大分块字符数 | 8000 |
| maxChunks | 最大分块数 | 20 |
| overlapPages | 分块重叠页数 | 1 |

## 开发指南

### 添加新的文档解析器

1. 在 `src/services/parser/` 目录下创建新的解析器类
2. 实现 `DocumentParser` 接口
3. 在 `DefaultDocumentParser` 中注册新的解析器

### 添加新的模型适配器

1. 在 `src/services/llm/` 目录下创建新的适配器类
2. 实现 `ModelAdapter` 接口
3. 在 `ModelClientFactory` 中注册新的适配器

## License

MIT License
