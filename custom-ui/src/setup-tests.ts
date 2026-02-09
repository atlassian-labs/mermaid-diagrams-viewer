import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Configure React Testing Library to auto-wrap state updates in act()
import { configure } from '@testing-library/react';

configure({
  // Automatically wrap async utilities in act()
  asyncUtilTimeout: 2000,
  // This helps with automatic act() wrapping
  reactStrictMode: true,
});

// Option 2: Use fake timers to control async operations
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg></svg>' }),
    registerLayoutLoaders: vi.fn(),
  },
}));

vi.mock('@mermaid-js/layout-elk', () => ({
  default: {},
}));

// Mock @forge/bridge
vi.mock('@forge/bridge', () => ({
  view: {
    getContext: vi.fn(),
    theme: {
      enable: vi.fn(),
    },
  },
  Modal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
  })),
}));

// Mock react-inlinesvg
vi.mock('react-inlinesvg', () => ({
  default: (props: { src: string; [key: string]: unknown }) => {
    return React.createElement('div', {
      'data-testid': 'svg',
      'data-src': props.src,
      ...props,
    });
  },
}));

// Mock react-zoom-pan-pinch
vi.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      'div',
      { 'data-testid': 'transform-wrapper' },
      children,
    );
  },
  TransformComponent: ({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      'div',
      { 'data-testid': 'transform-component' },
      children,
    );
  },
}));
