import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import React from "react";
import ReactDOM from "react-dom";

// Ensure React is available globally for tests
globalThis.React = React;
globalThis.ReactDOM = ReactDOM;

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (used by theme detection)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock URL.createObjectURL and revokeObjectURL (used by image blocks)
// These browser APIs are not available in jsdom test environment
globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
globalThis.URL.revokeObjectURL = vi.fn();

// Suppress specific console errors/warnings in tests to keep output clean
// We only suppress known, expected warnings that don't indicate real problems
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || "";

    // Suppress React act() warnings for async state updates
    // These occur in BlockEditor tests due to useEffect hooks updating state
    // The tests still pass and verify correct behavior
    if (message.includes("An update to") && message.includes("was not wrapped in act")) {
      return;
    }

    // Suppress image loading errors in test environment
    // URL.createObjectURL is mocked but still triggers catch blocks
    if (message.includes("Failed to load image blob")) {
      return;
    }

    // Let real errors through - we want to see actual problems
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || "";

    // Suppress act warnings (same as above)
    if (message.includes("An update to") && message.includes("was not wrapped in act")) {
      return;
    }

    // Let real warnings through
    originalWarn.apply(console, args);
  };
});

afterEach(() => {
  // Restore original console methods after each test
  console.error = originalError;
  console.warn = originalWarn;
});
