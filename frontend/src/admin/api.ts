let csrf = "";
export class AdminError extends Error {
  constructor(
    public status: number,
    public errors: Record<string, string[]>,
    message: string,
  ) {
    super(message);
  }
}
export async function adminApi<T>(
  path: string,
  method = "GET",
  body?: unknown,
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
  const response = await fetch("/api/admin" + path, options);
  const json = await response.json();
  if (!response.ok) {
    if (response.status === 401 || response.status === 419)
      window.dispatchEvent(new Event("admin-session-expired"));
    throw new AdminError(
      response.status,
      json.errors ?? {},
      response.status === 419
        ? "Your session expired. Please sign in again."
        : (json.message ?? "The request could not be completed."),
    );
  }
  if (json.data.csrf_token) csrf = json.data.csrf_token;
  return json.data as T;
}
