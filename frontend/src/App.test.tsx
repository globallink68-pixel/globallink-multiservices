import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import type { Service, Site } from "./api";
const category = {
  id: 1,
  name: "Software & IT solutions",
  slug: "software-it",
  summary: "Software services",
  icon: "code",
};
const site: Site = {
  settings: {
    company_name: "GLOBAL LINK MULTISERVICE",
    phone: "+91 62931 37235",
    email: "support@globallinkmultiservice.in",
    whatsapp: "916293137235",
    footer: "No official bank partnership is claimed.",
    seo_title: "Global Link",
    seo_description: "Explore services",
  },
  categories: [category],
  faqs: [
    {
      question: "How do I get confirmed fees?",
      answer: "Contact the team for current details.",
    },
  ],
};
const service: Service = {
  id: 1,
  slug: "website-development",
  title: "Website Development",
  short_description: "A business website tailored to your needs.",
  description: "Discuss your website requirements.",
  icon: "code",
  hero_image: null,
  featured: true,
  category,
  seo_title: "Website Development | Global Link",
  seo_description: "Build your digital presence",
  sections: [],
  items: [],
  providers: [],
  fees: [],
  faqs: [],
};
function reply(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as Response);
}
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: string) =>
    url === "/api/site"
      ? reply(site)
      : url.startsWith("/api/services/")
        ? reply(service)
        : reply([service]),
  );
});
function open(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
it("homepage presents the brand and API-backed featured services", async () => {
  open();
  await screen.findByRole("heading", { name: /Grow your business/ });
  expect(
    await screen.findByRole("heading", { name: "Website Development" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/services", expect.anything());
  expect(screen.queryByText("Guaranteed approval")).not.toBeInTheDocument();
});
it("catalogue searches the returned service data without hardcoded records", async () => {
  open("/services");
  await screen.findByRole("heading", { name: "Website Development" });
  await userEvent.type(
    screen.getByRole("searchbox", { name: "Search services" }),
    "no-match",
  );
  expect(
    screen.getByRole("heading", { name: "No matching services" }),
  ).toBeInTheDocument();
});
it("category navigation requests the corresponding API filter", async () => {
  open("/services?category=software-it");
  await screen.findByRole("heading", { name: "Website Development" });
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/services?category=software-it",
    expect.anything(),
  );
});
it("reusable detail hides empty sections and sets service SEO metadata", async () => {
  open("/services/website-development");
  await screen.findByRole("heading", { name: "Website Development" });
  expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Document checklist" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Configured fee information" }),
  ).not.toBeInTheDocument();
  await waitFor(() =>
    expect(document.title).toBe("Website Development | Global Link"),
  );
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
    "content",
    "Build your digital presence",
  );
});
it("detail renders configurable documents and provider disclaimers without invented fees", async () => {
  fetchMock.mockImplementation((url: string) =>
    url === "/api/site"
      ? reply(site)
      : reply({
          ...service,
          title: "Retailer ID",
          items: [{ kind: "document", label: "Trade licence", body: null }],
          providers: [
            {
              name: "SBI",
              description: "Initial editable service label.",
              eligibility: [],
              documents: [],
              fee_information: null,
              processing_notes: null,
            },
          ],
        }),
  );
  open("/services/retailer-id");
  await screen.findByRole("heading", { name: "Retailer ID" });
  expect(screen.getByText("Trade licence")).toBeInTheDocument();
  expect(
    screen.getByText(/not a claim of official bank authorization/),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Configured fee information" }),
  ).not.toBeInTheDocument();
});
it("CMS-style content is displayed as text instead of executing HTML", async () => {
  fetchMock.mockImplementation((url: string) =>
    url === "/api/site"
      ? reply(site)
      : reply({ ...service, description: "<script>alert(1)</script>" }),
  );
  open("/services/website-development");
  await screen.findByText("<script>alert(1)</script>");
  expect(document.querySelector("script")).toBeNull();
});
it("unavailable service has an accessible error and catalogue recovery link", async () => {
  fetchMock.mockImplementation((url: string) =>
    url === "/api/site"
      ? reply(site)
      : Promise.resolve({ ok: false, status: 404 }),
  );
  open("/services/missing");
  await screen.findByRole("heading", { name: "Service unavailable" });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "This service is not available.",
  );
  expect(
    screen.getByRole("link", { name: "Explore the catalogue" }),
  ).toHaveAttribute("href", "/services");
});
it("site API failure is visible and offers retry", async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 503 });
  open();
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});
it("contact links use editable settings and open mobile navigation accessibly", async () => {
  fetchMock.mockImplementation((url: string) =>
    url === "/api/site"
      ? reply({
          ...site,
          settings: {
            ...site.settings,
            phone: "+91 99999 00000",
            email: "contact@example.invalid",
          },
        })
      : reply([service]),
  );
  open();
  await screen.findByRole("heading", { name: /Grow your business/ });
  expect(
    screen.getAllByRole("link", { name: "+91 99999 00000" })[0],
  ).toHaveAttribute("href", "tel:+919999900000");
  expect(screen.getAllByText("contact@example.invalid").length).toBeGreaterThan(
    0,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Open navigation" }),
  );
  expect(
    screen.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
});
it("a new detail route clears old content and ignores a late previous response", async () => {
  let finish!: (value: Response) => void;
  fetchMock.mockImplementation((url: string) =>
    url === "/api/site"
      ? reply(site)
      : url === "/api/services"
        ? reply([
            service,
            {
              ...service,
              id: 2,
              slug: "mobile-app-development",
              title: "Mobile App Development",
            },
          ])
        : url.endsWith("/website-development")
          ? new Promise((resolve) => {
              finish = resolve;
            })
          : reply({
              ...service,
              id: 2,
              slug: "mobile-app-development",
              title: "Mobile App Development",
            }),
  );
  open("/services");
  await screen.findByRole("heading", { name: "Website Development" });
  await userEvent.click(
    screen.getByRole("link", { name: "Website Development" }),
  );
  await screen.findByRole("status");
  await userEvent.click(screen.getByRole("link", { name: "Services" }));
  await screen.findByRole("heading", { name: "Mobile App Development" });
  await userEvent.click(
    screen.getByRole("link", { name: "Mobile App Development" }),
  );
  await screen.findByRole("heading", { name: "Mobile App Development" });
  finish(await reply(service));
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", { name: "Website Development" }),
    ).not.toBeInTheDocument(),
  );
});

it("shows an honest empty state when no services are published", async () => {
  fetchMock.mockImplementation((url: string) =>
    reply(url === "/api/site" ? site : []),
  );
  open();
  expect(
    await screen.findByText(/No featured services are currently published/),
  ).toBeInTheDocument();
  expect(screen.queryByText("Loading services…")).not.toBeInTheDocument();
});

it("CMS branding and about text reach public pages", async () => {
  const image = "/api/media/11111111-1111-1111-1111-111111111111";
  fetchMock.mockImplementation((url: string) =>
    url === "/api/site"
      ? reply({
          ...site,
          settings: {
            ...site.settings,
            logo: image,
            tagline: "Edited company tagline",
            about_summary: "Edited about summary",
          },
        })
      : reply([service]),
  );
  open();
  expect(await screen.findByText("Edited about summary")).toBeInTheDocument();
  expect(
    screen.getAllByAltText("GLOBAL LINK MULTISERVICE logo")[0],
  ).toHaveAttribute("src", image);
});
