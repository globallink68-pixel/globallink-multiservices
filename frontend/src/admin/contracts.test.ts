import { expect, it } from "vitest";
import { matchesSubmission, validResponse } from "./contracts";

const provider = {
  id: 1,
  name: "Synthetic bank",
  code: "QA",
  description: null,
  logo_path: null,
  is_active: true,
  sort_order: 0,
};
const service = {
  id: 1,
  title: "Synthetic service",
  slug: "qa-service",
  sections: [],
  items: [],
  fees: [],
  faqs: [],
  providers: [
    {
      provider_id: 1,
      eligibility_overrides: [],
      document_overrides: [],
      description: null,
    },
  ],
};
it("accepts endpoint-specific provider, association, and deletion responses", () => {
  expect(validResponse("/providers", "GET", [provider])).toBe(true);
  expect(validResponse("/providers", "POST", provider)).toBe(true);
  expect(validResponse("/providers/1", "PUT", provider)).toBe(true);
  expect(
    validResponse("/providers/1", "DELETE", { message: "Provider deleted." }),
  ).toBe(true);
  expect(validResponse("/services/1", "PUT", service)).toBe(true);
});
it.each([
  {},
  null,
  [],
  { message: "Saved" },
  { ...provider, id: 2 },
  { ...provider, code: "lower" },
  { ...provider, is_active: "true" },
  { ...provider, errors: {} },
])("rejects malformed or wrong-ID provider acknowledgments (%j)", (value) => {
  expect(validResponse("/providers/1", "PUT", value)).toBe(false);
});
it("rejects incomplete association and incorrect deletion/media acknowledgments", () => {
  expect(
    validResponse("/services/1", "PUT", {
      ...service,
      providers: [{ provider_id: 1 }],
    }),
  ).toBe(false);
  expect(validResponse("/services/2", "GET", service)).toBe(false);
  expect(validResponse("/providers/1", "DELETE", provider)).toBe(false);
  expect(validResponse("/providers", "GET", [provider, {}])).toBe(false);
  expect(
    validResponse("/media", "POST", { url: "https://external.test/image.png" }),
  ).toBe(false);
});
it("reconciles normalization while distinguishing changed provider/service fields", () => {
  expect(
    matchesSubmission(provider, {
      name: " Synthetic bank ",
      code: "qa",
      description: "",
      is_active: 1,
    }),
  ).toBe(true);
  expect(matchesSubmission(provider, { name: "Another bank" })).toBe(false);
  expect(
    matchesSubmission(service, {
      providers: [
        {
          provider_id: 1,
          eligibility_overrides: ["new"],
          document_overrides: [],
        },
      ],
    }),
  ).toBe(false);
  expect(
    matchesSubmission(service, {
      providers: [
        { provider_id: 1, eligibility_overrides: [], document_overrides: [] },
      ],
    }),
  ).toBe(true);
});
