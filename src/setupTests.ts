import '@testing-library/jest-dom'

// Mock navigator.clipboard for jsdom environment
if (!navigator.clipboard) {
  ;(navigator as any).clipboard = {
    writeText: async () => {},
  }
}

// Mock formatBuildTime function
(globalThis as any).formatBuildTime = () => '2024-01-01'