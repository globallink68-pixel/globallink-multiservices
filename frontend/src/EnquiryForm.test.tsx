import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, it, expect, vi } from "vitest";
import EnquiryForm from "./EnquiryForm";
import type { Service } from "./api";
const service = { id: 1, title: "Bank CSP", slug: "bank-csp" } as Service;
const reference = "GL-01K70000000000000000000000";
const fetchMock = vi.fn();
function reply(data: unknown, status = 200, errors?: Record<string, string[]>) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () =>
      status < 400
        ? { data }
        : { message: "Please check your details.", errors },
  } as Response);
}
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation((url: string) =>
    url === "/api/enquiries/session"
      ? reply({ csrf_token: "public-csrf" })
      : url === "/api/services"
        ? reply([service])
        : reply({ reference }, 201),
  );
});
function open(fixed = true) {
  render(
    <MemoryRouter initialEntries={[fixed ? "/services/bank-csp" : "/"]}>
      <EnquiryForm service={fixed ? service : undefined} />
    </MemoryRouter>,
  );
}
async function fill() {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("Name"), "Fictional visitor");
  await u.type(screen.getByLabelText("Mobile"), "9000000000");
  await u.type(screen.getByLabelText("State"), "West Bengal");
  await u.type(screen.getByLabelText("City / district"), "Kolkata");
  await u.type(
    screen.getByLabelText("Message"),
    "Please confirm current requirements.",
  );
  await u.click(screen.getByLabelText(/I consent/));
  return u;
}
it("service-aware enquiry sends consent CSRF and source then clears PII on success", async () => {
  open();
  expect(screen.getByLabelText("Service")).toHaveValue("Bank CSP");
  expect(screen.getByLabelText("Service")).toHaveAttribute("readonly");
  const u = await fill();
  await u.click(screen.getByRole("button", { name: "Submit enquiry" }));
  expect(await screen.findByRole("status")).toHaveTextContent(reference);
  expect(screen.getByRole("status")).toHaveFocus();
  const call = fetchMock.mock.calls.find((c) => c[0] === "/api/enquiries");
  expect(JSON.parse(call?.[1].body)).toMatchObject({
    service_id: 1,
    source_path: "/services/bank-csp",
    email: null,
    consent: true,
    website: "",
  });
  expect(call?.[1].headers["X-CSRF-TOKEN"]).toBe("public-csrf");
  expect(screen.queryByLabelText("Mobile")).not.toBeInTheDocument();
});
it("homepage CTA lets visitors select a service", async () => {
  open(false);
  await userEvent.click(
    screen.getByRole("button", { name: "Send an enquiry" }),
  );
  await screen.findByRole("option", { name: "Bank CSP" });
  await userEvent.selectOptions(screen.getByLabelText("Service"), "1");
  const u = await fill();
  await u.click(screen.getByRole("button", { name: "Submit enquiry" }));
  await screen.findByRole("status");
  const call = fetchMock.mock.calls.find((c) => c[0] === "/api/enquiries");
  expect(JSON.parse(call?.[1].body).source_path).toBe("/");
});
it("missing consent blocks native form submission", async () => {
  open();
  const u = await fill();
  await u.click(screen.getByLabelText(/I consent/));
  await u.click(screen.getByRole("button", { name: "Submit enquiry" }));
  expect(fetchMock).not.toHaveBeenCalled();
});
it("server validation preserves entered fields", async () => {
  fetchMock.mockImplementation((url: string) =>
    url === "/api/enquiries/session"
      ? reply({ csrf_token: "public-csrf" })
      : reply(null, 422, { mobile: ["Enter a valid mobile."] }),
  );
  open();
  const u = await fill();
  await u.click(screen.getByRole("button", { name: "Submit enquiry" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Enter a valid mobile.",
  );
  expect(screen.getByLabelText("Name")).toHaveValue("Fictional visitor");
  expect(screen.getByRole("alert")).toHaveFocus();
  expect(screen.getByLabelText("Mobile")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByLabelText("Mobile")).toHaveAccessibleDescription(
    /valid mobile/,
  );
});
it("rate limiting gives useful feedback without success", async () => {
  fetchMock.mockImplementation((url: string) =>
    url === "/api/enquiries/session"
      ? reply({ csrf_token: "public-csrf" })
      : reply(null, 429),
  );
  open();
  const u = await fill();
  await u.click(screen.getByRole("button", { name: "Submit enquiry" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Too many attempts",
  );
  expect(screen.queryByText("Enquiry received")).not.toBeInTheDocument();
});
it("duplicate rejection does not silently retry", async () => {
  fetchMock.mockImplementation((url: string) =>
    url === "/api/enquiries/session"
      ? reply({ csrf_token: "public-csrf" })
      : reply(null, 409),
  );
  open();
  const u = await fill();
  await u.click(screen.getByRole("button", { name: "Submit enquiry" }));
  await screen.findByRole("alert");
  expect(
    fetchMock.mock.calls.filter((c) => c[0] === "/api/enquiries"),
  ).toHaveLength(1);
});
it("failed CSRF bootstrap never submits contact details", async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 503,
    json: async () => ({}),
  });
  open();
  const u = await fill();
  await u.click(screen.getByRole("button", { name: "Submit enquiry" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("secure form");
  expect(
    fetchMock.mock.calls.every((c) => c[0] === "/api/enquiries/session"),
  ).toBe(true);
});
