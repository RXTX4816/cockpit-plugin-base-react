// Base Vitest setup for Cockpit plugins.
// Installs DOM mocks that must be in place before i18n initializes.
// Each plugin's own setup.ts (listed second in vitest setupFiles) adds:
//   - await import("../i18n")
//   - vi.stubGlobal("cockpit", { spawn: ..., http: ... })

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

// localStorage mock must be installed before i18n's cockpitDetector runs.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();
vi.stubGlobal("localStorage", localStorageMock);
Object.defineProperty(window, "localStorage", { value: localStorageMock });

vi.stubGlobal("requestAnimationFrame", (callback: (timestamp: number) => void) => {
  callback(0);
  return 0;
});
vi.stubGlobal("cancelAnimationFrame", () => {});

const consoleError = console.error.bind(console);
vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
  const message = args.map(String).join(" ");
  if (message.includes("not wrapped in act(...)") || message.includes("Not implemented: navigation to another Document")) {
    return;
  }
  consoleError(...args);
});

const consoleWarn = console.warn.bind(console);
vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
  const message = args.map(String).join(" ");
  if (message.includes("not wrapped in act(...)") || message.includes("Not implemented: navigation to another Document")) {
    return;
  }
  consoleWarn(...args);
});

// jsdom doesn't implement HTMLCanvasElement.getContext; stub it to silence the warning
window.HTMLCanvasElement.prototype.getContext = () => null;
