import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { beforeEach, it, expect, vi } from "vitest";
import ChatWidget from "./ChatWidget";
import EnquiryForm from "./EnquiryForm";
import type { Service } from "./api";
const fetchMock = vi.fn();
it("Escape closes the assistant and restores keyboard focus to its launcher", async () => {
  open();
  await userEvent.click(
    screen.getByRole("button", { name: "Open customer assistant" }),
  );
  expect(
    screen.getByRole("region", { name: "Global Link customer assistant" }),
  ).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(
    screen.queryByRole("region", { name: "Global Link customer assistant" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Open customer assistant" }),
  ).toHaveFocus();
});
const grounded = {
  answer: "Published records only.",
  mode: "grounded",
  facts: [
    {
      label: "Retailer document",
      text: "Aadhaar card both-side clear copy",
      source: "/services/retailer-id",
    },
  ],
  handoff: { label: "Send an enquiry", url: "/services/retailer-id#enquiry" },
};
function response(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () => ({ data }),
  } as Response);
}
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation((url: string) =>
    url === "/api/chat/session"
      ? response({ csrf_token: "qa-chat-csrf" })
      : response(grounded),
  );
});
function open(path = "/services/retailer-id") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ChatWidget />
    </MemoryRouter>,
  );
}
async function ask(question = "What documents are needed?") {
  const u = userEvent.setup();
  if (screen.queryByRole("button", { name: "Open customer assistant" }))
    await u.click(
      screen.getByRole("button", { name: "Open customer assistant" }),
    );
  await u.type(screen.getByLabelText("Your question"), question);
  await u.click(screen.getByRole("button", { name: "Ask assistant" }));
  return u;
}
it("opens accessibly and sends bounded question CSRF and page service without secrets", async () => {
  open();
  const u = await ask();
  expect(
    await screen.findByText("Published records only."),
  ).toBeInTheDocument();
  const call = fetchMock.mock.calls.find((c) => c[0] === "/api/chat");
  expect(call?.[1].headers["X-CSRF-TOKEN"]).toBe("qa-chat-csrf");
  expect(JSON.parse(call?.[1].body)).toEqual({
    question: "What documents are needed?",
    history: [],
    service_slug: "retailer-id",
  });
  expect(screen.getByRole("link", { name: "Send an enquiry" })).toHaveAttribute(
    "href",
    "/services/retailer-id#enquiry",
  );
  expect(screen.getByLabelText("Your question")).toHaveValue("");
  await u.keyboard("{Escape}");
  expect(screen.queryByLabelText("Your question")).not.toBeInTheDocument();
});
it("provider disabled fallback leaves page usable and shows controlled enquiry link", async () => {
  fetchMock.mockImplementation((url: string) =>
    url.endsWith("/session")
      ? response({ csrf_token: "qa" })
      : response({
          answer: "The assistant is unavailable right now.",
          facts: [],
          handoff: { url: "/services/retailer-id#enquiry" },
          mode: "unavailable",
        }),
  );
  open();
  await ask();
  expect(
    await screen.findByText("The assistant is unavailable right now."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Send an enquiry" }),
  ).toBeInTheDocument();
});
it("network failure has safe fallback and no exception or provider detail", async () => {
  fetchMock.mockRejectedValue(new Error("private provider diagnostic"));
  open("/");
  await ask();
  expect(
    await screen.findByText(/assistant is unavailable right now/),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("private provider diagnostic"),
  ).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("rate limiting retains question and offers contact without pretending success", async () => {
  fetchMock.mockImplementation((url: string) =>
    url.endsWith("/session")
      ? response({ csrf_token: "qa" })
      : response({}, 429),
  );
  open();
  await ask();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Too many questions",
  );
  expect(screen.getByLabelText("Your question")).toHaveValue(
    "What documents are needed?",
  );
  expect(screen.queryByText("Published records only.")).not.toBeInTheDocument();
});
it("server validation and oversized native input are handled", async () => {
  fetchMock.mockImplementation((url: string) =>
    url.endsWith("/session")
      ? response({ csrf_token: "qa" })
      : response({}, 422),
  );
  open();
  await ask();
  expect(await screen.findByRole("alert")).toHaveTextContent("3–500");
  expect(screen.getByLabelText("Your question")).toHaveAttribute(
    "maxlength",
    "500",
  );
});
it("renders malicious question and CMS output as text and rejects external CTA URLs", async () => {
  fetchMock.mockImplementation((url: string) =>
    url.endsWith("/session")
      ? response({ csrf_token: "qa" })
      : response({
          ...grounded,
          answer: '<img src=x onerror="alert(1)">',
          facts: [
            {
              label: "<script>bad</script>",
              text: "<script>alert(1)</script>",
              source: "javascript:alert(1)",
            },
          ],
          handoff: { url: "https://evil.example/" },
        }),
  );
  open();
  await ask("<script>question</script>");
  expect(
    await screen.findByText('<img src=x onerror="alert(1)">'),
  ).toBeInTheDocument();
  expect(document.querySelector("script, .chat-panel img")).toBeNull();
  expect(screen.getByRole("link", { name: "Send an enquiry" })).toHaveAttribute(
    "href",
    "/#contact",
  );
  expect(screen.getByRole("link", { name: "View source" })).toHaveAttribute(
    "href",
    "/#contact",
  );
});
it("keeps history small sends user turns only and clear removes conversation", async () => {
  open();
  const u = await ask("Retailer ID documents");
  await screen.findByText("Published records only.");
  for (let i = 0; i < 4; i++) {
    await u.type(
      screen.getByLabelText("Your question"),
      "Follow-up question " + i,
    );
    await u.click(screen.getByRole("button", { name: "Ask assistant" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Your question")).toHaveValue(""),
    );
  }
  const calls = fetchMock.mock.calls.filter((c) => c[0] === "/api/chat");
  const last = JSON.parse(calls.at(-1)?.[1].body);
  expect(last.history).toHaveLength(3);
  expect(last.history.every((h: { role: string }) => h.role === "user")).toBe(
    true,
  );
  expect(JSON.stringify(last)).not.toContain("Published records only.");
  await u.click(screen.getByRole("button", { name: "Clear chat" }));
  expect(screen.queryByText("Retailer ID documents")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Your question")).toHaveFocus();
});
it("enquiry handoff opens existing service form preselected without creating a lead", async () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <ChatWidget />
      <Routes>
        <Route
          path="/services/retailer-id"
          element={
            <EnquiryForm
              service={
                { id: 1, title: "Retailer ID", slug: "retailer-id" } as Service
              }
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  const u = await ask("Retailer ID callback");
  await screen.findByText("Published records only.");
  await u.click(screen.getByRole("link", { name: "Send an enquiry" }));
  expect(screen.getByLabelText("Service")).toHaveValue("Retailer ID");
  expect(screen.getByLabelText("Service")).toHaveAttribute("readonly");
  expect(fetchMock.mock.calls.some((c) => c[0] === "/api/enquiries")).toBe(
    false,
  );
});
it("general handoff hash opens homepage enquiry form without submission", async () => {
  fetchMock.mockImplementation((url: string) =>
    url === "/api/chat/session"
      ? response({ csrf_token: "qa" })
      : url === "/api/services"
        ? response([])
        : response({ ...grounded, handoff: { url: "/#enquiry" } }),
  );
  render(
    <MemoryRouter initialEntries={["/"]}>
      <ChatWidget />
      <EnquiryForm />
    </MemoryRouter>,
  );
  const u = await ask("Callback please");
  await screen.findByText("Published records only.");
  await u.click(screen.getByRole("link", { name: "Send an enquiry" }));
  expect(
    screen.getByRole("button", { name: "Submit enquiry" }),
  ).toBeInTheDocument();
  expect(fetchMock.mock.calls.some((c) => c[0] === "/api/enquiries")).toBe(
    false,
  );
});
it("busy state prevents repeated requests until provider response", async () => {
  let complete: (value: unknown) => void = () => {};
  fetchMock.mockImplementation((url: string) =>
    url.endsWith("/session")
      ? response({ csrf_token: "qa" })
      : new Promise((resolve) => {
          complete = resolve;
        }),
  );
  open();
  const u = await ask();
  expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
  await u.click(screen.getByRole("button", { name: "Please wait…" }));
  expect(fetchMock.mock.calls.filter((c) => c[0] === "/api/chat")).toHaveLength(
    1,
  );
  complete(await response(grounded));
  expect(
    await screen.findByText("Published records only."),
  ).toBeInTheDocument();
});
it("client timeout aborts a stalled request and retains service enquiry handoff", async () => {
  vi.useFakeTimers();
  try {
    fetchMock.mockImplementation((url: string, options: RequestInit) =>
      url.endsWith("/session")
        ? response({ csrf_token: "qa" })
        : new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
    );
    open();
    fireEvent.click(
      screen.getByRole("button", { name: "Open customer assistant" }),
    );
    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "Retailer ID documents" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ask assistant" }));
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25000);
    });
    expect(
      screen.getByText(/assistant is unavailable right now/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Send an enquiry" }),
    ).toHaveAttribute("href", "/services/retailer-id#enquiry");
    expect(
      screen.getByRole("button", { name: "Ask assistant" }),
    ).toBeDisabled();
  } finally {
    vi.useRealTimers();
  }
});

it("offers controlled qualification with CMS service and sends no lead on chat intent alone", async () => {
  fetchMock.mockImplementation((url: string) =>
    url.endsWith("/session")
      ? response({ csrf_token: "qa" })
      : url === "/api/services"
        ? response([{ id: 1, slug: "retailer-id", title: "Retailer ID" }])
        : response({
            ...grounded,
            qualification: {
              offered: true,
              service: { slug: "retailer-id", title: "Retailer ID" },
            },
          }),
  );
  open();
  const u = await ask("I want to apply for Retailer ID");
  await u.click(
    await screen.findByRole("button", { name: "Yes, request team contact" }),
  );
  expect(
    await screen.findByRole("option", { name: "Retailer ID" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Relevant service")).toHaveValue("1");
  expect(
    fetchMock.mock.calls.some((c) => String(c[0]).includes("/chat/enquiry")),
  ).toBe(false);
  await u.click(
    screen.getByRole("button", { name: "Cancel callback request" }),
  );
  expect(screen.getByLabelText("Your question")).toBeInTheDocument();
});
