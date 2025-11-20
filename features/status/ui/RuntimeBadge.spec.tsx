import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, afterEach } from 'vitest';
import { RuntimeBadge } from './RuntimeBadge';

const setGpu = (present: boolean) => {
  const nav = navigator as Navigator & { gpu?: unknown };
  if (present) {
    Object.defineProperty(nav, 'gpu', { value: {}, configurable: true });
  } else {
    // ensure property is removed for this test
    try { delete (nav as { gpu?: unknown }).gpu; } catch { /* ignore */ }
  }
};

afterEach(() => {
  cleanup();
  // reset gpu to undefined between tests
  setGpu(false);
});

describe('RuntimeBadge', () => {
  test('shows WASM when WebGPU is not available', () => {
    setGpu(false);
    render(<RuntimeBadge />);
    const badge = screen.getByLabelText('runtime-backend');
    expect(badge).toHaveAttribute('data-backend', 'wasm');
    expect(badge).toHaveTextContent(/Local · WASM/i);
  });

  test('shows WebGPU when navigator.gpu is present', () => {
    setGpu(true);
    render(<RuntimeBadge />);
    const badge = screen.getByLabelText('runtime-backend');
    expect(badge).toHaveAttribute('data-backend', 'webgpu');
    expect(badge).toHaveTextContent(/Local · WebGPU/i);
  });

  test('force prop overrides detection', () => {
    setGpu(true);
    render(<RuntimeBadge force="wasm" />);
    const badge = screen.getByLabelText('runtime-backend');
    expect(badge).toHaveAttribute('data-backend', 'wasm');
    expect(badge).toHaveTextContent(/Local · WASM/i);
  });
});
