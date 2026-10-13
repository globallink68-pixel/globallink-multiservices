import { validResponse } from "./contracts";
let csrf = "";
export const ADMIN_REQUEST_TIMEOUT_MS = 30000;
export const ADMIN_UPLOAD_TIMEOUT_MS = 90000;
export class AdminError extends Error {
  constructor(
    public status: number,
    public errors: Record<string, string[]>,
    message: string,
    public outcome: "rejected" | "unknown" = "rejected",
    public requestId?: string,
  ) {
    super(message);
  }
}
export async function adminApi<T>(
  path: string,
  method = "GET",
  body?: unknown,
  settings: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") headers["X-CSRF-TOKEN"] = csrf;
  const isFile = body instanceof FormData;
  if (body && !isFile) headers["Content-Type"] = "application/json";
  const options: RequestInit = {
    method,
    credentials: "same-origin",
    headers,
  };
  if (method !== "GET" && body !== undefined)
    options.body = isFile ? (body as FormData) : JSON.stringify(body);
  const isWrite = method !== "GET";
  const controller = new AbortController();
  options.signal = controller.signal;
  const unknown = (status = 0, requestId?: string) =>
    new AdminError(
      status,
      {},
      isWrite
        ? "The result could not be confirmed. Reload server records before retrying; the request may have completed."
        : "Server records could not be loaded. Please retry the read.",
      isWrite ? "unknown" : "rejected",
      requestId,
    );
  const abort = () => controller.abort();
  settings.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(
    abort,
    settings.timeoutMs ??
      (isFile ? ADMIN_UPLOAD_TIMEOUT_MS : ADMIN_REQUEST_TIMEOUT_MS),
  );
  let onAbort: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => reject(unknown());
    controller.signal.addEventListener("abort", onAbort, { once: true });
  });
  if (settings.signal?.aborted) controller.abort();
  const request = async () => {
    if (controller.signal.aborted) throw unknown();
    const response = await fetch("/api/admin" + path, options);
    if (controller.signal.aborted) throw unknown();
    if (response.status === 401 || response.status === 419)
      window.dispatchEvent(new Event("admin-session-expired"));
    let json;
    try {
      json = await response.json();
    } catch {
      if (response.status === 401 || response.status === 419)
        throw new AdminError(
          response.status,
          {},
          "Your session expired. Please sign in again.",
        );
      throw unknown(response.status);
    }
    if (controller.signal.aborted) throw unknown();
    const requestId =
      typeof json?.request_id === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        json.request_id,
      )
        ? json.request_id
        : undefined;
    if (!response.ok) {
      if (response.status >= 500) throw unknown(response.status, requestId);
      throw new AdminError(
        response.status,
        json?.errors &&
          typeof json.errors === "object" &&
          Object.values(json.errors).every(
            (v) => Array.isArray(v) && v.every((s) => typeof s === "string"),
          )
          ? json.errors
          : {},
        response.status === 419
          ? "Your session expired. Please sign in again."
          : typeof json?.message === "string"
            ? json.message
            : "The request could not be completed.",
        "rejected",
        requestId,
      );
    }
    if (
      !json ||
      typeof json !== "object" ||
      !("data" in json) ||
      !validResponse(path, method, json.data)
    ) {
      throw unknown(response.status);
    }
    if (json.data.csrf_token) csrf = json.data.csrf_token;
    return json.data as T;
  };
  try {
    return await Promise.race([request(), cancelled]);
  } catch (error) {
    if (error instanceof AdminError) throw error;
    throw unknown();
  } finally {
    clearTimeout(timeout);
    settings.signal?.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", onAbort);
  }
}
