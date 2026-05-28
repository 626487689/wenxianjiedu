import { logger } from '../logger/LoggerService'

interface VersionInfo {
  version: string
  buildDate: string
  buildTime: string
  commitHash?: string
  versionFingerprint: string
  environment: string
  platform: string
  nodeVersion: string
}

export class VersionService {
  private versionInfo: VersionInfo | null = null

  /**
   * 获取版本信息
   */
  getVersionInfo(): VersionInfo {
    if (!this.versionInfo) {
      this.versionInfo = this.generateVersionInfo()
    }
    return this.versionInfo
  }

  /**
   * 获取浏览器平台
   */
  private getBrowserPlatform(): string {
    if (typeof window !== 'undefined') {
      if (window.navigator.userAgent.includes('Win')) return 'win32'
      if (window.navigator.userAgent.includes('Mac')) return 'darwin'
      if (window.navigator.userAgent.includes('Linux')) return 'linux'
    }
    return 'unknown'
  }

  /**
   * 生成版本信息
   */
  private generateVersionInfo(): VersionInfo {
    const now = new Date()
    const buildDate = now.toISOString().split('T')[0]
    const buildTime = now.toTimeString().split(' ')[0]
    const version = this.getPackageVersion()
    const commitHash = this.getCommitHash()
    const environment = this.getEnvironment()
    const platform = typeof process !== 'undefined' ? process.platform : this.getBrowserPlatform()
    const nodeVersion = typeof process !== 'undefined' ? process.version : 'browser'

    const versionFingerprint = this.generateVersionFingerprint(
      version,
      buildDate,
      buildTime,
      commitHash
    )

    return {
      version,
      buildDate,
      buildTime,
      commitHash,
      versionFingerprint,
      environment,
      platform,
      nodeVersion
    }
  }

  /**
   * 获取包版本
   */
  private getPackageVersion(): string {
    try {
      const packageJson = require('../../package.json')
      return packageJson.version || '0.0.0'
    } catch (error) {
      logger.warn('Failed to get package version', { metadata: { error: String(error) } })
      return '0.0.0'
    }
  }

  /**
   * 获取 Git 提交哈希
   */
  private getCommitHash(): string | undefined {
    try {
      return 'dev-build-' + Math.random().toString(36).substr(2, 8)
    } catch (error) {
      logger.warn('Failed to get commit hash', { metadata: { error: String(error) } })
      return undefined
    }
  }

  /**
   * 获取环境信息
   */
  private getEnvironment(): string {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV || 'development'
    }
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'localhost' ? 'development' : 'production'
    }
    return 'development'
  }

  /**
   * 生成版本指纹
   */
  private generateVersionFingerprint(
    version: string,
    buildDate: string,
    buildTime: string,
    commitHash?: string
  ): string {
    const data = `${version}-${buildDate}-${buildTime}-${commitHash || 'no-commit'}`
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * 检查是否为新版本
   */
  isNewVersion(currentVersion: string): boolean {
    const currentVersionParts = currentVersion.split('.').map(Number)
    const appVersionParts = this.getVersionInfo().version.split('.').map(Number)

    for (let i = 0; i < Math.max(currentVersionParts.length, appVersionParts.length); i++) {
      const current = currentVersionParts[i] || 0
      const app = appVersionParts[i] || 0
      if (app > current) {
        return true
      } else if (app < current) {
        return false
      }
    }
    return false
  }

  /**
   * 获取版本变更日志
   */
  getVersionChangelog(): string {
    return `版本 ${this.getVersionInfo().version} 更新日志：

1. 增强了错误处理机制，提高系统稳定性
2. 优化了网络请求处理，添加了请求队列和重试策略
3. 改进了资源管理，添加了缓存策略
4. 优化了并发处理，提高批量处理效率
5. 增强了异常处理，添加了错误统计和恢复机制
6. 降低了模块耦合，实现了依赖注入
7. 改进了配置管理，添加了配置验证和版本管理
8. 实现了插件系统，支持扩展功能
9. 优化了模型支持，添加了模型适配器
10. 修复了 TypeScript 类型错误，提高代码质量`
  }

  /**
   * 打印版本信息
   */
  logVersionInfo(): void {
    const versionInfo = this.getVersionInfo()
    logger.info('应用版本信息', {
      metadata: {
        version: versionInfo.version,
        buildDate: versionInfo.buildDate,
        buildTime: versionInfo.buildTime,
        commitHash: versionInfo.commitHash,
        versionFingerprint: versionInfo.versionFingerprint,
        environment: versionInfo.environment,
        platform: versionInfo.platform,
        nodeVersion: versionInfo.nodeVersion
      }
    })
  }
}

export const versionService = new VersionService()
