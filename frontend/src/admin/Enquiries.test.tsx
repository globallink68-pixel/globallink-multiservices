import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, it, expect, vi } from "vitest";
import App from "../App";
const reference = "GL-01K70000000000000000000000";
const lead = {
  reference,
  name: "Fictional visitor",
  mobile: "9000000000",
  email: "fictional@example.test",
  state: "West Bengal",
  city: "Kolkata",
  status: "NEW",
  created_at: "2026-10-06 10:00:00",
  service_id: 1,
  service_title: "Bank CSP",
  service_slug: "bank-csp",
};
let current = { ...lead };
let histories: {
  from_status: string | null;
  status: string;
  note: string | null;
  created_at: string;
  administrator: string | null;
}[] = [];
let notes: { body: string; created_at: string; administrator: string }[] = [];
let authenticated = true;
const fetchMock = vi.fn();
function reply(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () =>
      status < 400
        ? { data }
        : {
            message: "This lead changed. Reload it before updating.",
            errors: {},
          },
  } as Response);
}
function api(url: string, options?: RequestInit) {
  const path = url.replace("/api/admin", "");
  if (path === "/session")
    return reply({
      user: authenticated ? { id: 1, name: "Test admin" } : null,
      csrf_token: "admin-csrf",
    });
  if (path === "/logout") {
    authenticated = false;
    return reply({ message: "Signed out" });
  }
  if (path === "/services")
    return reply([{ id: 1, title: "Bank CSP", slug: "bank-csp" }]);
  if (path === "/dashboard")
    return reply({
      total_services: 32,
      published_services: 32,
      draft_services: 0,
      categories: 5,
      active_providers: 8,
      faqs: 4,
      recent_changes: [],
      attention: [],
      lead_counts: { NEW: 2, FOLLOW_UP: 1, QUALIFIED: 0, CONVERTED: 0 },
    });
  if (path.endsWith("/status")) {
    const values = JSON.parse(String(options?.body));
    histories.unshift({
      from_status: current.status,
      status: values.status,
      note: values.note,
      created_at: "2026-10-06",
      administrator: "Test admin",
    });
    current = { ...current, status: values.status };
    return reply({ message: "Updated" });
  }
  if (path.endsWith("/notes")) {
    notes.unshift({
      body: JSON.parse(String(options?.body)).body,
      created_at: "2026-10-06",
      administrator: "Test admin",
    });
    return reply({ message: "Added" });
  }
  if (path === "/enquiries/" + reference)
    return reply({
      ...current,
      message: "<script>alert(1)</script> visitor text",
      source_path: "/services/bank-csp",
      consented_at: "2026-10-06",
      consent_version: "contact-enquiry-v1",
      history: histories,
      notes,
    });
  if (path.startsWith("/enquiries?"))
    return reply({ data: [current], current_page: 1, last_page: 1, total: 1 });
  return reply({});
}
beforeEach(() => {
  current = { ...lead };
  histories = [
    {
      from_status: null,
      status: "NEW",
      note: null,
      created_at: "2026-10-06",
      administrator: null,
    },
  ];
  notes = [];
  authenticated = true;
  fetchMock.mockReset();
  fetchMock.mockImplementation(api);
  vi.stubGlobal("fetch", fetchMock);
});
function open(path = "/admin/enquiries") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
it("list displays service contact reference and bounded pagination", async () => {
  open();
  expect(await screen.findByText("Fictional visitor")).toBeInTheDocument();
  expect(screen.getByText("9000000000")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "View lead " + reference }),
  ).toHaveAttribute("href", "/admin/enquiries/" + reference);
  expect(screen.getByRole("button", { name: "Next leads" })).toBeDisabled();
});
it("applies search service status and UTC dates", async () => {
  open();
  await screen.findByText("Fictional visitor");
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("Search leads"), "Fictional");
  await u.selectOptions(screen.getByLabelText("Lead service"), "1");
  await u.selectOptions(screen.getByLabelText("Lead status"), "FOLLOW_UP");
  await u.type(screen.getByLabelText("From date (UTC)"), "2026-10-01");
  await u.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(
        (c) =>
          String(c[0]).includes("search=Fictional") &&
          String(c[0]).includes("service_id=1") &&
          String(c[0]).includes("status=FOLLOW_UP") &&
          String(c[0]).includes("from=2026-10-01"),
      ),
    ).toBe(true),
  );
});
it("records NEW CONTACTED FOLLOW_UP with previous states and note", async () => {
  open("/admin/enquiries/" + reference);
  await screen.findByText("Fictional visitor");
  const u = userEvent.setup();
  await u.selectOptions(screen.getByLabelText("New lead status"), "CONTACTED");
  await u.type(
    screen.getByLabelText("Status note (optional)"),
    "Called fictional visitor",
  );
  await u.click(screen.getByRole("button", { name: "Update lead status" }));
  await screen.findByText("NEW → CONTACTED");
  await u.selectOptions(screen.getByLabelText("New lead status"), "FOLLOW_UP");
  await u.click(screen.getByRole("button", { name: "Update lead status" }));
  expect(await screen.findByText("CONTACTED → FOLLOW UP")).toBeInTheDocument();
  expect(screen.getByText("Called fictional visitor")).toBeInTheDocument();
  const calls = fetchMock.mock.calls.filter((c) =>
    String(c[0]).endsWith("/status"),
  );
  expect(JSON.parse(calls[0][1].body).expected_status).toBe("NEW");
  expect(JSON.parse(calls[1][1].body).expected_status).toBe("CONTACTED");
});
it("visitor and internal XSS-looking text render without executable elements", async () => {
  open("/admin/enquiries/" + reference);
  await screen.findByText("<script>alert(1)</script> visitor text");
  const u = userEvent.setup();
  await u.type(
    screen.getByLabelText("Internal note"),
    '<img src=x onerror="alert(1)"> Fictional note',
  );
  await u.click(screen.getByRole("button", { name: "Add note" }));
  expect(
    await screen.findByText('<img src=x onerror="alert(1)"> Fictional note'),
  ).toBeInTheDocument();
  expect(document.querySelector("main script")).toBeNull();
  expect(document.querySelector("main img[onerror]")).toBeNull();
});
it("stale update gives reload and no false success", async () => {
  fetchMock.mockImplementation((url: string, o?: RequestInit) =>
    url.endsWith("/status") ? reply(null, 409) : api(url, o),
  );
  open("/admin/enquiries/" + reference);
  await screen.findByText("Fictional visitor");
  await userEvent.selectOptions(
    screen.getByLabelText("New lead status"),
    "CONTACTED",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Update lead status" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This lead changed",
  );
  expect(
    screen.getByRole("button", { name: "Reload lead" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Lead status updated.")).not.toBeInTheDocument();
});
it("dashboard counts link to service-authorized lead filters", async () => {
  open("/admin/dashboard");
  expect(
    await screen.findByRole("link", { name: "New enquiries 2" }),
  ).toHaveAttribute("href", "/admin/enquiries?status=NEW");
  expect(screen.getByRole("link", { name: "Follow-up 1" })).toHaveAttribute(
    "href",
    "/admin/enquiries?status=FOLLOW_UP",
  );
});
it("guest detail redirects without fetching contact data", async () => {
  authenticated = false;
  open("/admin/enquiries/" + reference);
  await screen.findByRole("heading", { name: "Welcome back." });
  expect(
    fetchMock.mock.calls.some((c) => String(c[0]).includes("/enquiries")),
  ).toBe(false);
});
it("logout removes protected contact and detail display", async () => {
  open("/admin/enquiries/" + reference);
  await screen.findByText("Fictional visitor");
  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await screen.findByRole("heading", { name: "Welcome back." });
  expect(screen.queryByText("9000000000")).not.toBeInTheDocument();
});

it("distinguishes AI source in CRM and sends the trusted source filter", async () => {
  current = { ...lead, lead_source: "AI_ASSISTANT" } as typeof current;
  open();
  await screen.findByText("Fictional visitor");
  expect(
    screen.getByRole("cell", { name: "AI assistant" }),
  ).toBeInTheDocument();
  const u = userEvent.setup();
  await u.selectOptions(screen.getByLabelText("Lead source"), "AI_ASSISTANT");
  await u.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some((c) =>
        String(c[0]).includes("lead_source=AI_ASSISTANT"),
      ),
    ).toBe(true),
  );
});
