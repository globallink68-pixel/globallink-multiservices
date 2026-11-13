import { expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Artwork, serviceContent } from "./components";

const uploads = "/api/media/12345678-1234-1234-1234-123456789012";

it("provides distinct local artwork for each documented service", () => {
  const { container } = render(
    Object.keys(serviceContent).map((slug) => (
      <Artwork key={slug} slug={slug} alt={slug} />
    )),
  );
  const images = [...container.querySelectorAll("img")];
  expect(images).toHaveLength(32);
  expect(new Set(images.map((image) => image.src)).size).toBe(32);
  expect(
    images.every(
      (image) =>
        image.getAttribute("loading") === "lazy" && image.alt.length > 10,
    ),
  ).toBe(true);
});

it("prefers CMS artwork and recovers from missing assets", () => {
  render(
    <Artwork
      slug="website-development"
      alt="Custom artwork"
      custom={uploads}
      priority
    />,
  );
  const custom = screen.getByRole("img", { name: "Custom artwork" });
  expect(custom).toHaveAttribute("src", uploads);
  fireEvent.error(custom);
  const fallback = screen.getByRole("img", {
    name: serviceContent["website-development"].alt,
  });
  expect(fallback).toHaveAttribute(
    "src",
    expect.stringContaining("website-development.webp"),
  );
  expect(fallback).toHaveAttribute("loading", "eager");
  fireEvent.error(fallback);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
