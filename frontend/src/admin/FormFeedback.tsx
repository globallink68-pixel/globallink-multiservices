import { useEffect, useId, useRef } from "react";

export default function FormFeedback({
  message,
  errors = {},
}: {
  message: string;
  errors?: Record<string, string[]>;
}) {
  const id = useId();
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = summary.current;
    element?.focus();
    const scope = element?.parentElement;
    if (!scope) return;
    const affected: {
      element: Element;
      description: string | null;
      invalid: string | null;
    }[] = [];
    for (const node of scope.querySelectorAll(
      "form, input, select, textarea",
    )) {
      const key = node.getAttribute("name");
      if (node.tagName !== "FORM" && (!key || !errors[key])) continue;
      affected.push({
        element: node,
        description: node.getAttribute("aria-describedby"),
        invalid: node.getAttribute("aria-invalid"),
      });
      node.setAttribute(
        "aria-describedby",
        [node.getAttribute("aria-describedby"), id].filter(Boolean).join(" "),
      );
      if (key && errors[key]) node.setAttribute("aria-invalid", "true");
    }
    return () => {
      for (const node of affected) {
        for (const [attribute, value] of [
          ["aria-describedby", node.description],
          ["aria-invalid", node.invalid],
        ] as const) {
          if (value === null) node.element.removeAttribute(attribute);
          else node.element.setAttribute(attribute, value);
        }
      }
    };
  }, [id, errors]);
  return (
    <div
      className="admin-error"
      role="alert"
      tabIndex={-1}
      ref={summary}
      id={id}
    >
      <strong>{message}</strong>
      {Object.entries(errors).map(([key, values]) => (
        <p key={key}>
          {key.replaceAll("_", " ")}: {values.join(" ")}
        </p>
      ))}
    </div>
  );
}
