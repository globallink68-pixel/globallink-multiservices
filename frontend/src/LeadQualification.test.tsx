import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, it, expect, vi } from "vitest";
import LeadQualification from "./LeadQualification";
const fetchMock = vi.fn();
const cancel = vi.fn();
const busy = vi.fn();
const fields = {
  name: "Fictional visitor",
  mobile: "9000000000",
  email: null,
  state: "West Bengal",
  city: "Kolkata",
  service_id: 1,
  message: "Please call about Bank CSP.",
};
const review = {
  review_token: "a".repeat(40),
  expires_in: 600,
  summary: fields,
  service: { id: 1, title: "Bank CSP" },
};
function response(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () => (status < 400 ? { data } : { message: data }),
  } as Response);
}
function api(url: string) {
  if (url === "/api/services")
    return response([{ id: 1, slug: "bank-csp", title: "Bank CSP" }]);
  if (url.endsWith("/session")) return response({ csrf_token: "csrf-test" });
  if (url.endsWith("/review")) return response(review);
  if (url.endsWith("/cancel")) return response({ message: "Cancelled" });
  return response({ reference: "GL-FICTIONAL-REFERENCE" });
}
beforeEach(() => {
  cancel.mockReset();
  busy.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(api);
  vi.stubGlobal("fetch", fetchMock);
});
function open(
  interest: { slug: string; title: string } | null = {
    slug: "bank-csp",
    title: "Bank CSP",
  },
) {
  return render(
    <LeadQualification
      interest={interest}
      onCancel={cancel}
      onBusyChange={busy}
    />,
  );
}
async function fill(consent = true) {
  const u = userEvent.setup();
  await screen.findByRole("option", { name: "Bank CSP" });
  await u.type(screen.getByLabelText("Name"), "Fictional visitor");
  await u.type(screen.getByLabelText("Indian mobile"), "9000000000");
  await u.type(screen.getByLabelText("State"), "West Bengal");
  await u.type(screen.getByLabelText("City / district"), "Kolkata");
  await u.type(
    screen.getByLabelText("Short requirement"),
    "Please call about Bank CSP.",
  );
  if (consent)
    await u.click(screen.getByRole("checkbox", { name: /I consent/ }));
  return u;
}
async function prepare() {
  const u = await fill();
  await u.click(screen.getByRole("button", { name: "Review enquiry" }));
  await screen.findByRole("heading", { name: "Confirm your enquiry" });
  return u;
}
it("preselects only published catalogue context and warns against sensitive details", async () => {
  open();
  await screen.findByRole("option", { name: "Bank CSP" });
  expect(screen.getByLabelText("Relevant service")).toHaveValue("1");
  expect(screen.getByText(/Do not enter Aadhaar/)).toBeInTheDocument();
  expect(
    fetchMock.mock.calls.filter((c) => c[1]?.method === "POST"),
  ).toHaveLength(0);
});
it("does not accept unavailable context or invent a service selection", async () => {
  open({ slug: "unpublished", title: "Hidden" });
  await screen.findByRole("option", { name: "Bank CSP" });
  expect(screen.getByLabelText("Relevant service")).toHaveValue("");
});
it("missing consent does not review or create a lead", async () => {
  open();
  const u = await fill(false);
  await u.click(screen.getByRole("button", { name: "Review enquiry" }));
  expect(
    fetchMock.mock.calls.some((c) => c[0] === "/api/chat/enquiry/review"),
  ).toBe(false);
});
it("requires separate confirmation and returns only reference after success", async () => {
  open();
  const u = await prepare();
  expect(screen.getByText("Fictional visitor")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Confirm and send enquiry" }),
  ).toBeDisabled();
  expect(fetchMock.mock.calls.some((c) => c[0] === "/api/chat/enquiry")).toBe(
    false,
  );
  await u.click(screen.getByRole("checkbox", { name: /I confirm/ }));
  await u.click(
    screen.getByRole("button", { name: "Confirm and send enquiry" }),
  );
  expect(await screen.findByText("GL-FICTIONAL-REFERENCE")).toBeInTheDocument();
  expect(screen.queryByText("9000000000")).not.toBeInTheDocument();
  expect(screen.queryByText("Fictional visitor")).not.toBeInTheDocument();
  const call = fetchMock.mock.calls.find((c) => c[0] === "/api/chat/enquiry");
  expect(JSON.parse(call?.[1].body)).toEqual({
    ...fields,
    consent: true,
    website: "",
    confirmed: true,
    review_token: review.review_token,
  });
  expect(call?.[1].headers["X-CSRF-TOKEN"]).toBe("csrf-test");
  expect(fetchMock.mock.calls.some((c) => c[0] === "/api/chat")).toBe(false);
});
it("cancel before review creates no lead", async () => {
  open();
  await screen.findByRole("option", { name: "Bank CSP" });
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Cancel callback request" }));
  expect(cancel).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls.some((c) => c[0] === "/api/chat/enquiry")).toBe(
    false,
  );
});
it("editing revokes review and requires new consent confirmation", async () => {
  open();
  const u = await prepare();
  await u.click(screen.getByRole("button", { name: "Edit details" }));
  expect(screen.getByLabelText("Name")).toHaveValue("Fictional visitor");
  expect(
    fetchMock.mock.calls.some((c) => c[0] === "/api/chat/enquiry/cancel"),
  ).toBe(true);
  expect(
    screen.queryByRole("button", { name: "Confirm and send enquiry" }),
  ).not.toBeInTheDocument();
  await u.click(screen.getByRole("button", { name: "Review enquiry" }));
  expect(
    await screen.findByRole("button", { name: "Confirm and send enquiry" }),
  ).toBeDisabled();
});
it("unmount revokes reviewed state and leaves no stored chat payload", async () => {
  const view = open();
  await prepare();
  view.unmount();
  expect(
    fetchMock.mock.calls.some((c) => c[0] === "/api/chat/enquiry/cancel"),
  ).toBe(true);
  expect(localStorage.length).toBe(0);
});
it("renders reviewed markup as plain text", async () => {
  fetchMock.mockImplementation((url: string) =>
    url.endsWith("/review")
      ? response({
          ...review,
          summary: { ...fields, name: "<img src=x onerror=alert(1)>" },
        })
      : api(url),
  );
  open();
  await prepare();
  expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
  expect(document.querySelector('img[src="x"]')).toBeNull();
});
it("shows server validation without claiming success", async () => {
  fetchMock.mockImplementation((url: string) =>
    url.endsWith("/review")
      ? Promise.resolve({
          ok: false,
          status: 422,
          json: async () => ({
            errors: { mobile: ["Use a valid Indian mobile."] },
          }),
        } as Response)
      : api(url),
  );
  open();
  const u = await fill();
  await u.click(screen.getByRole("button", { name: "Review enquiry" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Use a valid Indian mobile.",
  );
  expect(screen.queryByText("Enquiry received")).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveFocus();
  expect(screen.getByLabelText("Indian mobile")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByLabelText("Indian mobile")).toHaveAccessibleDescription(
    /valid Indian mobile/,
  );
});
it("rate and expired review failures retain safe retry and edit controls", async () => {
  fetchMock.mockImplementation((url: string) =>
    url === "/api/chat/enquiry" ? response("Review expired.", 409) : api(url),
  );
  open();
  const u = await prepare();
  await u.click(screen.getByRole("checkbox", { name: /I confirm/ }));
  await u.click(
    screen.getByRole("button", { name: "Confirm and send enquiry" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Review expired.");
  expect(screen.getByRole("button", { name: "Edit details" })).toBeEnabled();
  expect(screen.queryByText("Enquiry received")).not.toBeInTheDocument();
});
it("synchronous guard prevents rapid duplicate confirmation", async () => {
  let resolve: ((r: Response) => void) | undefined;
  fetchMock.mockImplementation((url: string) =>
    url === "/api/chat/enquiry"
      ? new Promise<Response>((r) => {
          resolve = r;
        })
      : api(url),
  );
  open();
  const u = await prepare();
  await u.click(screen.getByRole("checkbox", { name: /I confirm/ }));
  const form = screen
    .getByRole("button", { name: "Confirm and send enquiry" })
    .closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.filter((c) => c[0] === "/api/chat/enquiry"),
    ).toHaveLength(1),
  );
  resolve?.({
    ok: true,
    status: 201,
    json: async () => ({ data: { reference: "GL-FICTIONAL-REFERENCE" } }),
  } as Response);
  expect(await screen.findByText("GL-FICTIONAL-REFERENCE")).toBeInTheDocument();
});
