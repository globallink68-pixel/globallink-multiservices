import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
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
      options?.method === "PUT" ? JSON.parse(String(options.body)) : service,
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
