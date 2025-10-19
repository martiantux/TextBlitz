import { vi } from 'vitest';

// Manual Chrome API mock
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

// @ts-ignore - Chrome API mock
global.chrome = mockChrome;

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
