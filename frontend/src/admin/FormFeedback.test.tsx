import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import FormFeedback from "./FormFeedback";

it("focuses the error summary and associates errors with its form and matching control", () => {
  render(
    <section>
      <FormFeedback
        message="Check the details"
        errors={{ email: ["Enter a valid email"] }}
      />
      <form aria-label="Sign in">
        <label>
          Email
          <input name="email" />
        </label>
        <label>
          Password
          <input name="password" />
        </label>
      </form>
    </section>,
  );
  const summary = screen.getByRole("alert");
  expect(summary).toHaveFocus();
  expect(screen.getByRole("form", { name: "Sign in" })).toHaveAttribute(
    "aria-describedby",
    summary.id,
  );
  expect(screen.getByLabelText("Email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
    /valid email/,
  );
  expect(screen.getByLabelText("Password")).not.toHaveAttribute("aria-invalid");
});
it("cleans up associations when feedback is removed", () => {
  const content = (error: boolean) => (
    <section>
      {error && (
        <FormFeedback
          message="Check the details"
          errors={{ email: ["Invalid"] }}
        />
      )}
      <form>
        <input aria-label="Email" name="email" />
      </form>
    </section>
  );
  const view = render(content(true));
  view.rerender(content(false));
  expect(screen.getByLabelText("Email")).not.toHaveAttribute(
    "aria-describedby",
  );
  expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
});
