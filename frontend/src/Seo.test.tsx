import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it } from "vitest";
import Seo from "./Seo";

beforeEach(() => {
  document.head.innerHTML = "";
});
function show(path: string, noindex = false, image?: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Seo
        title='CMS title "<script>"'
        description="CMS description"
        baseUrl="https://www.example.test"
        image={image}
        noindex={noindex}
      />
    </MemoryRouter>,
  );
}
it("creates canonical and social metadata from CMS text without executing markup", () => {
  show("/services/bank-csp?utm_source=test#contact");
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://www.example.test/services/bank-csp",
  );
  expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute(
    "content",
    'CMS title "<script>"',
  );
  expect(document.querySelector("script")).toBeNull();
  expect(
    document.querySelector('meta[name="twitter:description"]'),
  ).toHaveAttribute("content", "CMS description");
});
it("retains only the category in canonical catalogue queries", () => {
  show("/services?category=software-it&utm_source=test");
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://www.example.test/services?category=software-it",
  );
});
it("private and missing pages remove stale canonical and social URLs", () => {
  const view = show(
    "/services/bank-csp",
    false,
    "/api/media/11111111-1111-1111-1111-111111111111",
  );
  view.unmount();
  show("/admin/login", true);
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  expect(document.querySelector('meta[property="og:url"]')).toBeNull();
  expect(document.querySelector('meta[property="og:image"]')).toBeNull();
});
it("accepts only CMS media URLs and restores public indexing after private navigation", () => {
  const view = show("/admin/login", true);
  view.unmount();
  show("/", false, "https://attacker.test/tracker");
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index, follow",
  );
  expect(document.querySelector('meta[property="og:image"]')).toBeNull();
  expect(document.querySelector('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary",
  );
});
