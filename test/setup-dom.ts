import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Only apply DOM polyfills when running in jsdom (not in Node environment)
if (typeof window !== "undefined") {
  // Radix Select uses ResizeObserver internally for popper positioning.
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver =
    window.ResizeObserver ||
    (ResizeObserverStub as unknown as typeof ResizeObserver);

  // Radix components check matchMedia for prefers-reduced-motion.
  window.matchMedia =
    window.matchMedia ||
    ((query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList);

  // Radix Select uses scrollIntoView and pointer capture methods
  // that jsdom does not implement.
  HTMLElement.prototype.scrollIntoView =
    HTMLElement.prototype.scrollIntoView || vi.fn();
  HTMLElement.prototype.hasPointerCapture =
    HTMLElement.prototype.hasPointerCapture || (() => false);
  HTMLElement.prototype.releasePointerCapture =
    HTMLElement.prototype.releasePointerCapture || vi.fn();
}
