export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogOptions {
  category?: string;
  level?: LogLevel;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category?: string;
  message: string;
  metadata?: Record<string, any>;
}

class LoggerService {
  private logHandlers: ((entry: LogEntry) => void)[] = [];
  private logLevel: LogLevel = 'info';
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  debug(message: string, options?: LogOptions): void {
    this.log('debug', message, options);
  }

  info(message: string, options?: LogOptions): void {
    this.log('info', message, options);
  }

  warn(message: string, options?: LogOptions): void {
    this.log('warn', message, options);
  }

  error(message: string, options?: LogOptions): void {
    this.log('error', message, options);
  }

  private log(level: LogLevel, message: string, options?: LogOptions): void {
    // 检查日志级别
    if (this.shouldLog(level)) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        category: options?.category,
        message,
        metadata: options?.metadata
      };

      // 格式化并输出到控制台
      const formattedMessage = this.formatLog(entry);
      this.outputToConsole(level, formattedMessage);

      // 添加到历史记录
      this.addToHistory(entry);

      // 通知所有处理程序
      this.logHandlers.forEach(handler => handler(entry));
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levelOrder: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levelOrder.indexOf(level) >= levelOrder.indexOf(this.logLevel);
  }

  private formatLog(entry: LogEntry): string {
    const category = entry.category ? `[${entry.category}] ` : '';
    const metadata = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${category}${entry.message}${metadata}`;
  }

  private outputToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case 'debug':
        console.debug(message);
        break;
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
        console.error(message);
        break;
    }
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  addLogHandler(handler: (entry: LogEntry) => void): void {
    this.logHandlers.push(handler);
  }

  removeLogHandler(handler: (entry: LogEntry) => void): void {
    this.logHandlers = this.logHandlers.filter(h => h !== handler);
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`日志级别已设置为: ${level}`, { category: 'logger' });
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  getLogHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  clearLogHistory(): void {
    const count = this.logHistory.length;
    this.logHistory = [];
    this.info(`已清除 ${count} 条日志历史`, { category: 'logger' });
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(100, size);
    // 确保历史记录不超过新的最大大小
    while (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
    this.info(`日志历史最大大小已设置为: ${this.maxHistorySize}`, { category: 'logger' });
  }

  // 性能监控日志
  startTimer(name: string, category?: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.info(`${name} 执行时间: ${duration}ms`, { 
        category: category || 'performance',
        metadata: { duration, name }
      });
    };
  }

  // 批量日志
  logBatch(messages: Array<{ message: string; level?: LogLevel; category?: string }>): void {
    messages.forEach(msg => {
      const level = msg.level || 'info';
      this.log(level, msg.message, { category: msg.category });
    });
  }
}

// 创建单例实例
export const logger = new LoggerService();
export { LoggerService };