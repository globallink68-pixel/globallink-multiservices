import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../App";
const user = { id: 1, name: "Test administrator" };
let signedIn = true;
const category = {
  id: 1,
  name: "Banking",
  slug: "banking",
  summary: "Summary",
  icon: "bank",
  sort_order: 0,
  is_active: true,
};
const provider = {
  id: 1,
  name: "SBI",
  code: "SBI",
  description: "Catalogue label only",
  is_active: true,
  sort_order: 0,
  logo_path: null,
};
const service = {
  id: 1,
  title: "Bank CSP",
  slug: "bank-csp",
  category_id: 1,
  short_description: "Summary",
  description: "Plain overview",
  icon: "bank",
  icon_path: null,
  hero_image: null,
  cta_text: "Discuss this service",
  is_published: true,
  featured: false,
  sort_order: 0,
  sections: [],
  items: [],
  fees: [],
  providers: [],
  faqs: [],
  seo_title: "",
  seo_description: "",
};
const settings = {
  company_name: "Global Link",
  phone: "+91 62931 37235",
  email: "support@globallinkmultiservice.in",
  whatsapp: "916293137235",
  footer: "Verified information only",
  seo_title: "Global Link",
  seo_description: "Company services",
};
const fetchMock = vi.fn();
afterEach(() => vi.useRealTimers());
function response(
  data: unknown,
  status = 200,
  errors?: Record<string, string[]>,
) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () =>
      status < 400 ? { data } : { message: "Validation failed", errors },
  } as Response);
}
function defaultFetch(url: string, options?: RequestInit) {
  const path = url.replace("/api/admin", "");
  if (path === "/session")
    return response({ user: signedIn ? user : null, csrf_token: "test-csrf" });
  if (path === "/login") {
    signedIn = true;
    return response({ user, csrf_token: "rotated-csrf" });
  }
  if (path === "/logout") {
    signedIn = false;
    return response({ message: "Signed out" });
  }
  if (path === "/dashboard")
    return response({
      total_services: 32,
      published_services: 31,
      draft_services: 1,
      categories: 5,
      active_providers: 8,
      faqs: 4,
      recent_changes: [],
      attention: [],
    });
  if (path === "/categories") return response([category]);
  if (
    (path === "/providers" && options?.method === "POST") ||
    (path === "/providers/1" && options?.method === "PUT")
  ) {
    const submitted = JSON.parse(String(options.body));
    return response({
      ...provider,
      ...submitted,
      id: path === "/providers" ? 2 : 1,
      code: submitted.code.trim().toUpperCase(),
    });
  }
  if (path === "/providers") return response([provider]);
  if (path === "/faqs")
    return response([
      {
        id: 1,
        question: "A question?",
        answer: "A plain answer",
        is_active: true,
        sort_order: 0,
        service_id: null,
      },
    ]);
  if (path === "/settings") return response(settings);
  if (path.startsWith("/services/1/publication"))
    return response({ message: "Publication updated" });
  if (path === "/services/1")
    return response(
      options?.method === "PUT"
        ? { ...service, ...JSON.parse(String(options.body)) }
        : service,
    );
  if (path.startsWith("/services")) return response([service]);
  if (path.startsWith("/audit-logs"))
    return response({
      data: [
        {
          id: 1,
          administrator: "Test administrator",
          action: "saved",
          entity_type: "service",
          entity_id: 1,
          summary: "Service saved",
          created_at: "2026-10-06",
        },
      ],
      last_page: 1,
    });
  return response({ message: "Saved" });
}
beforeEach(() => {
  signedIn = true;
  fetchMock.mockReset();
  fetchMock.mockImplementation(defaultFetch);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});
function open(path = "/admin/dashboard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
it("redirects protected routes to login without public marketing navigation", async () => {
  signedIn = false;
  open("/admin/services");
  expect(
    await screen.findByRole("heading", { name: "Welcome back." }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: "Main navigation" }),
  ).not.toBeInTheDocument();
});
it("signs in with session CSRF and same-origin credentials", async () => {
  signedIn = false;
  open("/admin/login");
  const u = userEvent.setup();
  await u.type(await screen.findByLabelText("Email"), "qa@example.test");
  await u.type(screen.getByLabelText("Password"), "FictionalPassword123");
  await u.click(screen.getByRole("button", { name: "Sign in" }));
  expect(
    await screen.findByRole("heading", { name: "Content overview" }),
  ).toBeInTheDocument();
  const call = fetchMock.mock.calls.find((c) => c[0] === "/api/admin/login");
  expect(call?.[1].credentials).toBe("same-origin");
  expect(call?.[1].headers["X-CSRF-TOKEN"]).toBe("test-csrf");
});
it("authenticated administrators visiting login receive the dashboard", async () => {
  open("/admin/login");
  expect(
    await screen.findByRole("heading", { name: "Content overview" }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
});
it("shows useful invalid login feedback", async () => {
  signedIn = false;
  fetchMock.mockImplementation((url: string, o?: RequestInit) =>
    url === "/api/admin/login"
      ? response(null, 422, { email: ["The sign-in details are not valid."] })
      : defaultFetch(url, o),
  );
  open("/admin/login");
  const u = userEvent.setup();
  await u.type(await screen.findByLabelText("Email"), "qa@example.test");
  await u.type(screen.getByLabelText("Password"), "wrong");
  await u.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The sign-in details are not valid.",
  );
  expect(screen.getByLabelText("Password")).toHaveValue("");
});
it("preserves real CMS counts without invented financial statistics", async () => {
  open();
  expect(await screen.findByText("32")).toBeInTheDocument();
  expect(screen.getByText("Drafts")).toBeInTheDocument();
  expect(screen.queryByText(/Revenue/)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Enquiries" })).toHaveAttribute(
    "href",
    "/admin/enquiries",
  );
});
it("filters services and requires deliberate publication", async () => {
  open("/admin/services");
  const u = userEvent.setup();
  await screen.findByText("Bank CSP");
  await u.selectOptions(screen.getByLabelText("Publication"), "draft");
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some((c) =>
        String(c[0]).includes("publication=draft"),
      ),
    ).toBe(true),
  );
  await u.click(await screen.findByRole("button", { name: "Unpublish" }));
  expect(
    await screen.findByRole("dialog", { name: "Confirm change" }),
  ).toBeInTheDocument();
  await u.click(screen.getByRole("button", { name: "Confirm change" }));
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(
        (c) =>
          c[0] === "/api/admin/services/1/publication" &&
          JSON.parse(c[1].body).is_published === false,
      ),
    ).toBe(true),
  );
});
it("edits structured optional documents and saves existing service", async () => {
  open("/admin/services/1/edit");
  const u = userEvent.setup();
  expect(await screen.findByLabelText("Service title")).toHaveValue("Bank CSP");
  expect(screen.getByLabelText("URL slug")).toHaveAttribute("readonly");
  await u.click(screen.getByRole("button", { name: "Documents" }));
  await u.click(screen.getByRole("button", { name: "Add row" }));
  await u.type(screen.getByLabelText("Document name"), "QA optional document");
  await u.click(screen.getByLabelText("Required document"));
  await u.click(screen.getByRole("button", { name: "Save service" }));
  await screen.findByText(/Service saved/);
  const call = fetchMock.mock.calls.find(
    (c) => c[0] === "/api/admin/services/1" && c[1]?.method === "PUT",
  );
  expect(JSON.parse(call?.[1].body).items[0]).toMatchObject({
    kind: "document",
    label: "QA optional document",
    is_required: false,
  });
});
it("adds verified fee rows without asking administrators to edit JSON", async () => {
  open("/admin/services/1/edit");
  const u = userEvent.setup();
  await screen.findByLabelText("Service title");
  await u.click(screen.getByRole("button", { name: "Fees" }));
  await u.click(screen.getByRole("button", { name: "Add row" }));
  await u.type(screen.getByLabelText("Fee label"), "Confirmed fee");
  await u.type(
    screen.getByLabelText("Amount in paise (blank for contact pricing)"),
    "10000",
  );
  await u.click(screen.getByLabelText("Confirmed / verified for publication"));
  await u.click(screen.getByRole("button", { name: "Save service" }));
  await screen.findByText(/Service saved/);
  const call = fetchMock.mock.calls.find(
    (c) => c[0] === "/api/admin/services/1" && c[1]?.method === "PUT",
  );
  expect(JSON.parse(call?.[1].body).fees[0].amount_paise).toBe(10000);
});
it("shows server validation errors in the service editor", async () => {
  fetchMock.mockImplementation((url: string, o?: RequestInit) =>
    url === "/api/admin/services/1" && o?.method === "PUT"
      ? response(null, 422, { title: ["The title is too long."] })
      : defaultFetch(url, o),
  );
  open("/admin/services/1/edit");
  await screen.findByLabelText("Service title");
  await userEvent.click(screen.getByRole("button", { name: "Save service" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The title is too long.",
  );
});
it("allows blank lines while editing provider requirements and omits them on save", async () => {
  open("/admin/services/1/edit");
  const u = userEvent.setup();
  await screen.findByLabelText("Service title");
  await u.click(screen.getByRole("button", { name: "Providers" }));
  await u.click(screen.getByRole("button", { name: "Add row" }));
  await u.type(
    screen.getByLabelText("Eligibility (one requirement per line)"),
    " First requirement \n\nSecond requirement\n",
  );
  await u.click(screen.getByRole("button", { name: "Save service" }));
  await screen.findByText(/Service saved/);
  const call = fetchMock.mock.calls.find(
    (c) => c[0] === "/api/admin/services/1" && c[1]?.method === "PUT",
  );
  expect(JSON.parse(call?.[1].body).providers[0].eligibility_overrides).toEqual(
    ["First requirement", "Second requirement"],
  );
});
it("category management edits an active category with locked slug", async () => {
  open("/admin/categories");
  await userEvent.click(
    await screen.findByRole("button", { name: "Edit Banking" }),
  );
  expect(screen.getByLabelText("Category slug")).toHaveAttribute("readonly");
  await userEvent.click(screen.getByLabelText("Active category"));
  await userEvent.click(screen.getByRole("button", { name: "Save record" }));
  await screen.findByText("Categories saved.");
  const call = fetchMock.mock.calls.find(
    (c) => c[0] === "/api/admin/categories/1",
  );
  expect(JSON.parse(call?.[1].body).is_active).toBe(false);
});
it("provider management edits labels and activation", async () => {
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Edit SBI" }));
  await u.clear(screen.getByLabelText("Provider name"));
  await u.type(screen.getByLabelText("Provider name"), "SBI edited");
  await u.click(screen.getByLabelText("Active provider"));
  await u.click(screen.getByRole("button", { name: "Save record" }));
  await screen.findByText("Providers saved.");
  const call = fetchMock.mock.calls.find(
    (c) => c[0] === "/api/admin/providers/1",
  );
  expect(JSON.parse(call?.[1].body)).toMatchObject({
    name: "SBI edited",
    is_active: false,
  });
});
it("creates a provider with the correct payload and refreshes the list", async () => {
  let created = false;
  let createdRow = provider;
  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (url === "/api/admin/providers" && options?.method === "POST") {
      created = true;
      const values = JSON.parse(String(options.body));
      createdRow = {
        ...provider,
        ...values,
        id: 2,
        code: values.code.trim().toUpperCase(),
      };
      return response(createdRow);
    }
    if (url === "/api/admin/providers" && created)
      return response([provider, createdRow]);
    return defaultFetch(url, options);
  });
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Add provider" }));
  await u.type(screen.getByLabelText("Provider name"), "New provider");
  await u.type(screen.getByLabelText("Short code"), "new");
  await u.click(screen.getByRole("button", { name: "Save record" }));
  await screen.findByRole("button", { name: "Edit New provider" });
  expect(screen.getByRole("status")).toHaveTextContent("Providers saved.");
  const calls = fetchMock.mock.calls.filter(
    ([url, options]) =>
      url === "/api/admin/providers" && options?.method === "POST",
  );
  expect(calls).toHaveLength(1);
  expect(calls[0][1]).toMatchObject({
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": "test-csrf",
    },
  });
  expect(JSON.parse(calls[0][1].body)).toEqual({
    name: "New provider",
    code: "new",
    description: "",
    is_active: true,
    sort_order: 0,
    logo_path: null,
  });
});
it("shows provider validation errors and keeps the form available", async () => {
  fetchMock.mockImplementation((url: string, options?: RequestInit) =>
    url === "/api/admin/providers" && options?.method === "POST"
      ? response(null, 422, { code: ["This provider code is already in use."] })
      : defaultFetch(url, options),
  );
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Add provider" }));
  await u.type(screen.getByLabelText("Provider name"), "Test provider");
  await u.type(screen.getByLabelText("Short code"), "SBI");
  await u.click(screen.getByRole("button", { name: "Save record" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This provider code is already in use.",
  );
  expect(screen.getByLabelText("Short code")).toHaveValue("SBI");
  expect(screen.getByRole("button", { name: "Save record" })).toBeEnabled();
});
it("ignores repeated provider submissions while the first request is pending", async () => {
  let finishSave!: (result: Awaited<ReturnType<typeof response>>) => void;
  fetchMock.mockImplementation((url: string, options?: RequestInit) =>
    url === "/api/admin/providers" && options?.method === "POST"
      ? new Promise((resolve) => {
          finishSave = resolve;
        })
      : defaultFetch(url, options),
  );
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Add provider" }));
  await u.type(screen.getByLabelText("Provider name"), "Pending provider");
  await u.type(screen.getByLabelText("Short code"), "PENDING");
  const form = screen
    .getByRole("button", { name: "Save record" })
    .closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(
    fetchMock.mock.calls.filter(
      ([url, options]) =>
        url === "/api/admin/providers" && options?.method === "POST",
    ),
  ).toHaveLength(1);
  finishSave(await response({ ...provider, id: 2 }));
  await screen.findByText("Providers saved.");
});
it("waits for logo upload and preserves edits made while uploading", async () => {
  let finishUpload!: (result: Awaited<ReturnType<typeof response>>) => void;
  fetchMock.mockImplementation((url: string, options?: RequestInit) =>
    url === "/api/admin/media"
      ? new Promise((resolve) => {
          finishUpload = resolve;
        })
      : defaultFetch(url, options),
  );
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Add provider" }));
  await u.upload(
    screen.getByLabelText("Provider logo"),
    new File(["test"], "logo.png", { type: "image/png" }),
  );
  expect(screen.getByRole("button", { name: "Save record" })).toBeDisabled();
  await u.type(screen.getByLabelText("Provider name"), "Edited during upload");
  await u.type(screen.getByLabelText("Short code"), "UPLOAD");
  finishUpload(
    await response(
      { url: "/api/media/11111111-1111-1111-1111-111111111111" },
      201,
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save record" })).toBeEnabled(),
  );
  expect(screen.getByLabelText("Provider name")).toHaveValue(
    "Edited during upload",
  );
  await u.click(screen.getByRole("button", { name: "Save record" }));
  const call = fetchMock.mock.calls.find(
    ([url, options]) =>
      url === "/api/admin/providers" && options?.method === "POST",
  );
  expect(JSON.parse(call?.[1].body)).toMatchObject({
    name: "Edited during upload",
    code: "UPLOAD",
    logo_path: "/api/media/11111111-1111-1111-1111-111111111111",
  });
});
it("cancels provider deletion without sending a request", async () => {
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Delete SBI" }));
  expect(screen.getByRole("dialog")).toHaveTextContent(
    "Permanently delete SBI?",
  );
  await u.click(screen.getByRole("button", { name: "Cancel" }));
  expect(
    fetchMock.mock.calls.some(([, options]) => options?.method === "DELETE"),
  ).toBe(false);
  expect(screen.getByRole("button", { name: "Edit SBI" })).toBeInTheDocument();
});
it("deletes after confirmation and refreshes records", async () => {
  let deleted = false;
  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (url === "/api/admin/providers/1" && options?.method === "DELETE") {
      deleted = true;
      return response({ message: "Provider deleted." });
    }
    if (url === "/api/admin/providers" && deleted) return response([]);
    return defaultFetch(url, options);
  });
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Delete SBI" }));
  await u.click(screen.getByRole("button", { name: "Confirm change" }));
  await screen.findByText("No records yet.");
  expect(screen.getByRole("status")).toHaveTextContent("Provider deleted.");
  expect(
    fetchMock.mock.calls.filter(([, options]) => options?.method === "DELETE"),
  ).toHaveLength(1);
});
it.each([409, 403, 500])(
  "keeps records after a failed delete (%s)",
  async (status) => {
    fetchMock.mockImplementation((url: string, options?: RequestInit) =>
      options?.method === "DELETE"
        ? response(null, status)
        : defaultFetch(url, options),
    );
    open("/admin/providers");
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: "Delete SBI" }));
    await u.click(screen.getByRole("button", { name: "Confirm change" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Delete SBI" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Edit SBI" }),
    ).toBeInTheDocument();
  },
);
it("reloads authoritative records after an unknown delete before permitting an explicit retry", async () => {
  fetchMock.mockImplementation((url: string, options?: RequestInit) =>
    options?.method === "DELETE"
      ? Promise.reject(new Error("Network unavailable"))
      : defaultFetch(url, options),
  );
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Delete SBI" }));
  await u.click(screen.getByRole("button", { name: "Confirm change" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Server records were refreshed",
  );
  expect(screen.getByRole("button", { name: "Delete SBI" })).toBeEnabled();
  expect(
    fetchMock.mock.calls.filter(([, options]) => options?.method === "DELETE"),
  ).toHaveLength(1);
});
it("FAQ management supports global scope and activation", async () => {
  open("/admin/faqs");
  const u = userEvent.setup();
  await u.click(
    await screen.findByRole("button", { name: "Edit A question?" }),
  );
  expect(screen.getByLabelText("FAQ scope")).toHaveValue("");
  await u.click(screen.getByLabelText("Active FAQ"));
  await u.click(screen.getByRole("button", { name: "Save record" }));
  await screen.findByText("FAQs saved.");
  expect(fetchMock.mock.calls.some((c) => c[0] === "/api/admin/faqs/1")).toBe(
    true,
  );
});
it("site settings update contacts and expose branding upload controls", async () => {
  open("/admin/settings");
  const u = userEvent.setup();
  const phone = await screen.findByLabelText("Public phone");
  await u.clear(phone);
  await u.type(phone, "+91 90000 00000");
  expect(screen.getByLabelText("Company logo")).toHaveAttribute(
    "accept",
    "image/png,image/jpeg,image/webp",
  );
  await u.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByText(/Settings saved/);
  const call = fetchMock.mock.calls.find(
    (c) => c[0] === "/api/admin/settings" && c[1]?.method === "PUT",
  );
  expect(JSON.parse(call?.[1].body).phone).toBe("+91 90000 00000");
});
it("unsafe upload errors are visible and no unsafe image is rendered", async () => {
  fetchMock.mockImplementation((url: string, o?: RequestInit) =>
    url === "/api/admin/media"
      ? response(null, 422, { image: ["Use a safe raster image."] })
      : defaultFetch(url, o),
  );
  open("/admin/settings");
  const input = await screen.findByLabelText("Company logo");
  await userEvent.setup({ applyAccept: false }).upload(
    input,
    new File(["<svg onload=alert(1)>"], "unsafe.svg", {
      type: "image/svg+xml",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Use a safe raster image.",
  );
  expect(document.querySelector('img[src*="unsafe"]')).toBeNull();
});
it("audit values containing HTML stay literal text", async () => {
  fetchMock.mockImplementation((url: string, o?: RequestInit) =>
    String(url).includes("/audit-logs")
      ? response({
          data: [
            {
              id: 1,
              summary: "<img src=x onerror=alert(1)>",
              action: "saved",
              entity_type: "service",
              administrator: "Admin",
            },
          ],
          last_page: 1,
        })
      : defaultFetch(url, o),
  );
  open("/admin/audit-logs");
  expect(
    await screen.findByText("<img src=x onerror=alert(1)>"),
  ).toBeInTheDocument();
  expect(document.querySelector('img[src="x"]')).toBeNull();
});
it("session expiry returns the administrator to sign in", async () => {
  fetchMock.mockImplementation((url: string, o?: RequestInit) =>
    url === "/api/admin/dashboard" ? response(null, 401) : defaultFetch(url, o),
  );
  open();
  expect(
    await screen.findByRole("heading", { name: "Welcome back." }),
  ).toBeInTheDocument();
});
it("logout protects subsequent routes and navigation collapses after selection", async () => {
  open();
  const u = userEvent.setup();
  await screen.findByRole("heading", { name: "Content overview" });
  await u.click(screen.getByRole("button", { name: "Open admin navigation" }));
  expect(
    screen.getByRole("button", { name: "Close admin navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  await u.click(screen.getByRole("link", { name: "Services" }));
  await screen.findByRole("heading", { name: "Services" });
  expect(
    screen.getByRole("button", { name: "Open admin navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  await u.click(screen.getByRole("button", { name: "Sign out" }));
  expect(
    await screen.findByRole("heading", { name: "Welcome back." }),
  ).toBeInTheDocument();
});

it("late category data does not overwrite unsaved service edits", async () => {
  let finishCategories: (value: Response) => void = () => {};
  const categoriesResponse = new Promise<Response>((resolve) => {
    finishCategories = resolve;
  });
  fetchMock.mockImplementation((url: string, o?: RequestInit) =>
    url === "/api/admin/categories" ? categoriesResponse : defaultFetch(url, o),
  );
  open("/admin/services/1/edit");
  const title = await screen.findByLabelText("Service title");
  await userEvent.clear(title);
  await userEvent.type(title, "Unsaved edited title");
  finishCategories(await response([category]));
  await waitFor(() =>
    expect(screen.getByRole("option", { name: "Banking" })).toBeInTheDocument(),
  );
  expect(title).toHaveValue("Unsaved edited title");
});

it("reconciles a committed provider creation after the response is lost without another POST", async () => {
  let current = [provider];
  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (url === "/api/admin/providers" && options?.method === "POST") {
      const values = JSON.parse(String(options.body));
      current = [
        ...current,
        { ...provider, ...values, id: 2, code: values.code.toUpperCase() },
      ];
      return Promise.reject(new TypeError("Lost committed response"));
    }
    return url === "/api/admin/providers"
      ? response(current)
      : defaultFetch(url, options);
  });
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Add provider" }));
  await u.type(screen.getByLabelText("Provider name"), "Recovered provider");
  await u.type(screen.getByLabelText("Short code"), "recovered");
  await u.click(screen.getByRole("button", { name: "Save record" }));
  await screen.findByText("Providers saved.");
  expect(
    screen.getByRole("button", { name: "Edit Recovered provider" }),
  ).toBeEnabled();
  expect(
    fetchMock.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});

it("blocks writes when reconciliation fails until an explicit successful server recheck", async () => {
  let unknown = false;
  let failRead = true;
  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (options?.method === "PUT") {
      unknown = true;
      return response({});
    }
    if (url === "/api/admin/providers" && unknown && failRead)
      return Promise.reject(new Error("Read unavailable"));
    return defaultFetch(url, options);
  });
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Edit SBI" }));
  await u.clear(screen.getByLabelText("Provider name"));
  await u.type(screen.getByLabelText("Provider name"), "Changed provider");
  await u.click(screen.getByRole("button", { name: "Save record" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("still unknown");
  expect(screen.getByRole("button", { name: "Save record" })).toBeDisabled();
  fireEvent.submit(
    screen.getByRole("button", { name: "Save record" }).closest("form")!,
  );
  expect(
    fetchMock.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
  failRead = false;
  await u.click(screen.getByRole("button", { name: "Recheck server state" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Server records were refreshed",
  );
  expect(screen.getByRole("button", { name: "Save record" })).toBeEnabled();
  expect(screen.getByLabelText("Provider name")).toHaveValue(
    "Changed provider",
  );
  expect(
    fetchMock.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});

it("reconciles a lost committed deletion from an authoritative empty list", async () => {
  let deleted = false;
  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (options?.method === "DELETE") {
      deleted = true;
      return Promise.reject(new Error("Lost response"));
    }
    if (url === "/api/admin/providers" && deleted) return response([]);
    return defaultFetch(url, options);
  });
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Delete SBI" }));
  await u.click(screen.getByRole("button", { name: "Confirm change" }));
  await screen.findByText("No records yet.");
  expect(screen.getByRole("status")).toHaveTextContent("Provider deleted.");
  expect(
    fetchMock.mock.calls.filter(([, options]) => options?.method === "DELETE"),
  ).toHaveLength(1);
});

it("keeps permanent delete disabled by server policy while allowing edits", async () => {
  fetchMock.mockImplementation((url: string, options?: RequestInit) =>
    url === "/api/admin/providers"
      ? response([{ ...provider, deletion_available: false }])
      : defaultFetch(url, options),
  );
  open("/admin/providers");
  expect(
    await screen.findByRole("button", { name: "Delete SBI" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Edit SBI" })).toBeEnabled();
});

it("reconciles an unknown service save without repeating its PUT", async () => {
  let current = service;
  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (url === "/api/admin/services/1" && options?.method === "PUT") {
      current = { ...service, ...JSON.parse(String(options.body)) };
      return Promise.reject(new Error("Lost response"));
    }
    return url === "/api/admin/services/1"
      ? response(current)
      : defaultFetch(url, options);
  });
  open("/admin/services/1/edit");
  const u = userEvent.setup();
  await u.clear(await screen.findByLabelText("Service title"));
  await u.type(screen.getByLabelText("Service title"), "Recovered service");
  await u.click(screen.getByRole("button", { name: "Save service" }));
  await screen.findByText(/Service saved/);
  expect(screen.getByLabelText("Service title")).toHaveValue(
    "Recovered service",
  );
  expect(
    fetchMock.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});

it("cancels a pending upload, releases the form, and ignores a late result", async () => {
  let finish!: (value: Awaited<ReturnType<typeof response>>) => void;
  fetchMock.mockImplementation((url: string, options?: RequestInit) =>
    url === "/api/admin/media"
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : defaultFetch(url, options),
  );
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Add provider" }));
  const input = screen.getByLabelText("Provider logo");
  await u.upload(input, new File(["test"], "logo.png", { type: "image/png" }));
  expect(screen.getByRole("button", { name: "Save record" })).toBeDisabled();
  await u.click(screen.getByRole("button", { name: "Cancel upload" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save record" })).toBeEnabled(),
  );
  expect(input).toHaveValue("");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "may have completed",
  );
  await act(async () => {
    finish(
      await response({
        url: "/api/media/11111111-1111-1111-1111-111111111111",
      }),
    );
  });
  expect(document.querySelector('img[src*="11111111"]')).toBeNull();
  expect(
    fetchMock.mock.calls.filter(([url]) => url === "/api/admin/media"),
  ).toHaveLength(1);
});

it("aborts uploads on unmount without assigning late results", async () => {
  fetchMock.mockImplementation((url: string, options?: RequestInit) =>
    url === "/api/admin/media"
      ? new Promise(() => {})
      : defaultFetch(url, options),
  );
  const view = open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Add provider" }));
  await u.upload(
    screen.getByLabelText("Provider logo"),
    new File(["test"], "logo.png", { type: "image/png" }),
  );
  const request = fetchMock.mock.calls.find(
    ([url]) => url === "/api/admin/media",
  );
  view.unmount();
  expect(request?.[1].signal.aborted).toBe(true);
});

it("releases the provider form after upload timeout and permits an explicit new upload", async () => {
  fetchMock.mockImplementation((url: string, options?: RequestInit) =>
    url === "/api/admin/media"
      ? new Promise(() => {})
      : defaultFetch(url, options),
  );
  open("/admin/providers");
  await userEvent.click(
    await screen.findByRole("button", { name: "Add provider" }),
  );
  vi.useFakeTimers();
  const file = new File(["test"], "logo.png", { type: "image/png" });
  const input = screen.getByLabelText("Provider logo");
  fireEvent.change(input, { target: { files: [file] } });
  expect(screen.getByRole("button", { name: "Save record" })).toBeDisabled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(90000);
  });
  expect(screen.getByRole("button", { name: "Save record" })).toBeEnabled();
  expect(screen.getByRole("alert")).toHaveTextContent("may have completed");
  expect(
    fetchMock.mock.calls.filter(([url]) => url === "/api/admin/media"),
  ).toHaveLength(1);
  vi.useRealTimers();
  fetchMock.mockImplementation((url: string, options?: RequestInit) =>
    url === "/api/admin/media"
      ? response(
          { url: "/api/media/22222222-2222-2222-2222-222222222222" },
          201,
        )
      : defaultFetch(url, options),
  );
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save record" })).toBeEnabled(),
  );
  await waitFor(() =>
    expect(document.querySelector('img[src*="22222222"]')).not.toBeNull(),
  );
  expect(
    fetchMock.mock.calls.filter(([url]) => url === "/api/admin/media"),
  ).toHaveLength(2);
});

it("returns to sign in after upload session expiry without repeating the upload", async () => {
  fetchMock.mockImplementation((url: string, options?: RequestInit) =>
    url === "/api/admin/media"
      ? response(null, 419)
      : defaultFetch(url, options),
  );
  open("/admin/providers");
  const u = userEvent.setup();
  await u.click(await screen.findByRole("button", { name: "Add provider" }));
  await u.upload(
    screen.getByLabelText("Provider logo"),
    new File(["test"], "logo.png", { type: "image/png" }),
  );
  await screen.findByRole("heading", { name: "Welcome back." });
  expect(
    fetchMock.mock.calls.filter(([url]) => url === "/api/admin/media"),
  ).toHaveLength(1);
});
