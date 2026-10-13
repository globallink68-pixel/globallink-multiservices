import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { adminApi, ADMIN_UPLOAD_TIMEOUT_MS } from "./api";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.useRealTimers());
it.each([{}, { data: null }, { data: true }])(
  "rejects incomplete successful API responses (%j)",
  async (json) => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => json,
    });
    await expect(adminApi("/providers", "POST", {})).rejects.toThrow(
      "Reload server records before retrying",
    );
  },
);
it("reports unreadable server responses without exposing HTML or losing expiry handling", async () => {
  const expire = vi.fn();
  window.addEventListener("admin-session-expired", expire);
  fetchMock.mockResolvedValue({
    ok: false,
    status: 419,
    json: async () => {
      throw new SyntaxError("private server HTML");
    },
  });
  await expect(adminApi("/providers", "POST", {})).rejects.toThrow(
    "Your session expired. Please sign in again.",
  );
  expect(expire).toHaveBeenCalledOnce();
  window.removeEventListener("admin-session-expired", expire);
});
it.each([
  {},
  [],
  { message: "Saved" },
  { id: 1 },
  {
    id: 2,
    name: "QA",
    code: "QA",
    description: null,
    logo_path: null,
    is_active: true,
    sort_order: 0,
  },
])(
  "marks invalid or wrong-ID PUT acknowledgments unknown (%j)",
  async (data) => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data }),
    });
    await expect(adminApi("/providers/1", "PUT", {})).rejects.toMatchObject({
      outcome: "unknown",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  },
);
it("keeps request references for generic server failures without raw error details", async () => {
  const requestId = "11111111-1111-1111-1111-111111111111";
  fetchMock.mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ request_id: requestId, message: "private SQL" }),
  });
  await expect(adminApi("/providers", "POST", {})).rejects.toMatchObject({
    outcome: "unknown",
    requestId,
  });
  expect(fetchMock).toHaveBeenCalledOnce();
});
it("does not retry a lost write response", async () => {
  fetchMock.mockRejectedValue(new TypeError("Connection lost"));
  await expect(adminApi("/providers", "POST", {})).rejects.toMatchObject({
    outcome: "unknown",
    status: 0,
  });
  expect(fetchMock).toHaveBeenCalledOnce();
});
it("bounds stalled uploads even when fetch ignores cancellation", async () => {
  vi.useFakeTimers();
  fetchMock.mockReturnValue(new Promise(() => {}));
  const result = expect(
    adminApi("/media", "POST", new FormData()),
  ).rejects.toMatchObject({ outcome: "unknown" });
  await vi.advanceTimersByTimeAsync(ADMIN_UPLOAD_TIMEOUT_MS);
  await result;
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
it("bounds a stalled JSON response and permits only explicit new attempts", async () => {
  vi.useFakeTimers();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => new Promise(() => {}),
  });
  const result = expect(
    adminApi("/providers", "POST", {}, { timeoutMs: 20 }),
  ).rejects.toMatchObject({ outcome: "unknown" });
  await vi.advanceTimersByTimeAsync(20);
  await result;
  expect(fetchMock).toHaveBeenCalledOnce();
});
it("supports explicit upload cancellation and avoids sending already-cancelled requests", async () => {
  const controller = new AbortController();
  fetchMock.mockReturnValue(new Promise(() => {}));
  const result = expect(
    adminApi("/media", "POST", new FormData(), { signal: controller.signal }),
  ).rejects.toMatchObject({ outcome: "unknown" });
  controller.abort();
  await result;
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  fetchMock.mockClear();
  await expect(
    adminApi("/media", "POST", new FormData(), { signal: controller.signal }),
  ).rejects.toMatchObject({ outcome: "unknown" });
  expect(fetchMock).not.toHaveBeenCalled();
});
it("preserves useful validation errors", async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 422,
    json: async () => ({
      message: "Invalid provider",
      errors: { code: ["Code is already used"] },
    }),
  });
  await expect(adminApi("/providers", "POST", {})).rejects.toMatchObject({
    status: 422,
    errors: { code: ["Code is already used"] },
    message: "Invalid provider",
  });
});
