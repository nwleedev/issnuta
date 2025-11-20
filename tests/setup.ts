// Test environment setup for Vitest (jsdom)
// - Adds jest-dom matchers
// - Ensures fetch is available in Node environments

// 1) jest-dom matchers
// Note: this package will be added in the dependency step.
// @ts-ignore - available after devDeps install
import '@testing-library/jest-dom/vitest';

// 2) fetch polyfill (Node 18-20 already has fetch; this keeps consistency)
// @ts-ignore - available after devDeps install
import 'whatwg-fetch';

// 3) MSW(server) lifecycle was removed (no API mocking in remaining tests)
// Keep hooks as no-ops to avoid import churn
import { afterAll, afterEach, beforeAll } from 'vitest';
beforeAll(() => {});
afterEach(() => {});
afterAll(() => {});

// 4) Silence noisy console errors in tests (optional; keep minimal)
const originalError = console.error;
console.error = (...args: unknown[]) => {
  // Suppress React act() warnings in tests; keep others
  if (typeof args[0] === 'string' && args[0].includes('Warning: An update to')) return;
  originalError(...args);
};

// 5) Suppress known optional native dep noise from sharp in jsdom
process.on('unhandledRejection', (err) => {
  const msg = String(err?.toString?.() ?? err ?? '');
  if (msg.includes('Something went wrong installing the "sharp" module')) {
    // ignore optional native addon issues in unit tests
    return;
  }
  // rethrow others to keep tests honest
  throw (err instanceof Error ? err : new Error(String(err)));
});

