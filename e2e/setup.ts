import { vi } from 'vitest';

import { execaMockImpl } from './helpers.js';

// Mock execa globally for all e2e tests
vi.mock('execa', () => ({
  execa: vi.fn(execaMockImpl),
}));
