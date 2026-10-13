type RecordValue = Record<string, unknown>;
const record = (v: unknown): v is RecordValue =>
  !!v && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown) =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const nullableText = (v: unknown) => v === null || typeof v === "string";
const strings = (v: unknown) =>
  Array.isArray(v) && v.every((s) => typeof s === "string");
export function isProvider(v: unknown): v is RecordValue {
  return (
    record(v) &&
    id(v.id) &&
    typeof v.name === "string" &&
    v.name.trim().length > 0 &&
    typeof v.code === "string" &&
    /^[A-Z0-9_-]{1,40}$/.test(v.code) &&
    nullableText(v.description) &&
    nullableText(v.logo_path) &&
    [true, false, 0, 1].includes(v.is_active as boolean | number) &&
    typeof v.sort_order === "number" &&
    Number.isInteger(v.sort_order) &&
    v.sort_order >= 0 &&
    v.sort_order <= 10000
  );
}
export function isService(v: unknown): v is RecordValue {
  return (
    record(v) &&
    id(v.id) &&
    typeof v.title === "string" &&
    !!v.title.trim() &&
    typeof v.slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug) &&
    ["sections", "items", "fees", "faqs"].every((key) =>
      Array.isArray(v[key]),
    ) &&
    Array.isArray(v.providers) &&
    v.providers.every(
      (p) =>
        record(p) &&
        id(p.provider_id) &&
        strings(p.eligibility_overrides) &&
        strings(p.document_overrides) &&
        (p.description === undefined || nullableText(p.description)) &&
        ["fee_information", "processing_notes", "notes", "disclaimer"].every(
          (key) => p[key] === undefined || nullableText(p[key]),
        ),
    )
  );
}
export function validResponse(
  path: string,
  method: string,
  value: unknown,
): boolean {
  if (
    record(value) &&
    ("error" in value || "errors" in value || value.success === false)
  )
    return false;
  if (path === "/providers" && method === "GET")
    return Array.isArray(value) && value.every(isProvider);
  if (/^\/providers(?:\/\d+)?$/.test(path)) {
    if (method === "DELETE")
      return record(value) && value.message === "Provider deleted.";
    if (method === "POST" || method === "PUT")
      return (
        isProvider(value) &&
        (method !== "PUT" || value.id === Number(path.split("/").pop()))
      );
  }
  if (
    /^\/services(?:\/\d+)?$/.test(path) &&
    (method === "POST" ||
      method === "PUT" ||
      (method === "GET" && path !== "/services"))
  )
    return (
      isService(value) &&
      (path === "/services" ||
        (record(value) && value.id === Number(path.split("/").pop())))
    );
  if (path === "/services" && method === "GET")
    return (
      Array.isArray(value) &&
      value.every(
        (row) =>
          record(row) &&
          id(row.id) &&
          typeof row.slug === "string" &&
          typeof row.title === "string",
      )
    );
  if (path === "/media" && method === "POST")
    return (
      record(value) &&
      typeof value.url === "string" &&
      /^\/api\/media\/[a-f0-9-]{36}$/.test(value.url)
    );
  return record(value) || Array.isArray(value);
}
export function matchesSubmission(
  actual: unknown,
  submitted: unknown,
  key = "",
): boolean {
  if (Array.isArray(submitted))
    return (
      Array.isArray(actual) &&
      actual.length === submitted.length &&
      submitted.every((v, i) => matchesSubmission(actual[i], v))
    );
  if (record(submitted))
    return (
      record(actual) &&
      Object.entries(submitted).every(
        ([k, v]) =>
          [
            "id",
            "created_at",
            "updated_at",
            "service_id",
            "deletion_available",
          ].includes(k) || matchesSubmission(actual[k], v, k),
      )
    );
  const normalize = (v: unknown) =>
    key === "is_active" ||
    key === "is_published" ||
    key === "featured" ||
    key === "is_required" ||
    key === "is_verified"
      ? !!v
      : key === "code" && typeof v === "string"
        ? v.trim().toUpperCase()
        : typeof v === "string"
          ? v.trim() || null
          : v;
  return normalize(actual) === normalize(submitted);
}
