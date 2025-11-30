import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useServiceWorkerUpdate } from "./use-service-worker-update";

// Mock ServiceWorker types
type MockServiceWorker = {
  state: ServiceWorkerState;
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

type MockServiceWorkerRegistration = {
  waiting: MockServiceWorker | null;
  installing: MockServiceWorker | null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

type MockServiceWorkerContainer = {
  ready: Promise<MockServiceWorkerRegistration>;
  controller: MockServiceWorker | null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

describe("useServiceWorkerUpdate", () => {
  let mockRegistration: MockServiceWorkerRegistration;
  let mockContainer: MockServiceWorkerContainer;
  let originalServiceWorker: ServiceWorkerContainer | undefined;
  let readyResolve: (reg: MockServiceWorkerRegistration) => void;

  beforeEach(() => {
    mockRegistration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const readyPromise = new Promise<MockServiceWorkerRegistration>(
      (resolve) => {
        readyResolve = resolve;
      }
    );

    mockContainer = {
      ready: readyPromise,
      controller: { state: "activated" } as MockServiceWorker,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    originalServiceWorker =
      "serviceWorker" in navigator ? navigator.serviceWorker : undefined;

    Object.defineProperty(navigator, "serviceWorker", {
      value: mockContainer,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();

    if (originalServiceWorker !== undefined) {
      Object.defineProperty(navigator, "serviceWorker", {
        value: originalServiceWorker,
        configurable: true,
        writable: true,
      });
    }
  });

  it("should return initial state with no update", async () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());

    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.isUpdating).toBe(false);

    await act(async () => {
      readyResolve(mockRegistration);
    });

    expect(result.current.hasUpdate).toBe(false);
  });

  it("should detect existing waiting worker on mount", async () => {
    const mockWaitingWorker: MockServiceWorker = {
      state: "installed",
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mockRegistration.waiting = mockWaitingWorker;

    const { result } = renderHook(() => useServiceWorkerUpdate());

    await act(async () => {
      readyResolve(mockRegistration);
    });

    expect(result.current.hasUpdate).toBe(true);
  });

  it("should register event listeners on mount", async () => {
    renderHook(() => useServiceWorkerUpdate());

    await act(async () => {
      readyResolve(mockRegistration);
    });

    expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
      "updatefound",
      expect.any(Function)
    );
    expect(mockContainer.addEventListener).toHaveBeenCalledWith(
      "controllerchange",
      expect.any(Function),
      { once: true }
    );
  });

  it("should cleanup event listeners on unmount", async () => {
    const { unmount } = renderHook(() => useServiceWorkerUpdate());

    await act(async () => {
      readyResolve(mockRegistration);
    });

    unmount();

    expect(mockContainer.removeEventListener).toHaveBeenCalledWith(
      "controllerchange",
      expect.any(Function)
    );
    expect(mockRegistration.removeEventListener).toHaveBeenCalledWith(
      "updatefound",
      expect.any(Function)
    );
  });

  it("should send SKIP_WAITING message when applyUpdate is called", async () => {
    const mockWaitingWorker: MockServiceWorker = {
      state: "installed",
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mockRegistration.waiting = mockWaitingWorker;

    const { result } = renderHook(() => useServiceWorkerUpdate());

    await act(async () => {
      readyResolve(mockRegistration);
    });

    expect(result.current.hasUpdate).toBe(true);

    act(() => {
      result.current.applyUpdate();
    });

    expect(result.current.isUpdating).toBe(true);
    expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({
      type: "SKIP_WAITING",
    });
  });

  it("should not call postMessage when applyUpdate is called without waiting worker", async () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());

    await act(async () => {
      readyResolve(mockRegistration);
    });

    act(() => {
      result.current.applyUpdate();
    });

    expect(result.current.isUpdating).toBe(false);
  });

  it("should set hasUpdate to false when dismissUpdate is called", async () => {
    const mockWaitingWorker: MockServiceWorker = {
      state: "installed",
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mockRegistration.waiting = mockWaitingWorker;

    const { result } = renderHook(() => useServiceWorkerUpdate());

    await act(async () => {
      readyResolve(mockRegistration);
    });

    expect(result.current.hasUpdate).toBe(true);

    act(() => {
      result.current.dismissUpdate();
    });

    expect(result.current.hasUpdate).toBe(false);
  });

  it("should not allow multiple applyUpdate calls", async () => {
    const mockWaitingWorker: MockServiceWorker = {
      state: "installed",
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mockRegistration.waiting = mockWaitingWorker;

    const { result } = renderHook(() => useServiceWorkerUpdate());

    await act(async () => {
      readyResolve(mockRegistration);
    });

    act(() => {
      result.current.applyUpdate();
    });

    act(() => {
      result.current.applyUpdate();
    });

    expect(mockWaitingWorker.postMessage).toHaveBeenCalledTimes(1);
  });

  it("should clear interval on unmount", async () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    const { unmount } = renderHook(() => useServiceWorkerUpdate());

    await act(async () => {
      readyResolve(mockRegistration);
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
    vi.useRealTimers();
  });
});
