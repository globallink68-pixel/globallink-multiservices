import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { getData, type Service } from "./api";
type Values = {
  name: string;
  mobile: string;
  email: string | null;
  state: string;
  city: string;
  service_id: number;
  message: string;
};
type Review = {
  review_token: string;
  summary: Values;
  service: { id: number; title: string };
  expires_in: number;
};
export type ServiceInterest = { slug: string; title: string } | null;
export default function LeadQualification({
  interest,
  onCancel,
  onBusyChange,
}: {
  interest: ServiceInterest;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [values, setValues] = useState({
    name: "",
    mobile: "",
    email: "",
    state: "",
    city: "",
    service_id: "",
    message: "",
    website: "",
    consent: false,
  });
  const [review, setReview] = useState<Review | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const errorId = useId();
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error, fields]);
  function accessibility(field: string) {
    return {
      "aria-invalid": Boolean(fields[field]),
      "aria-describedby": fields[field] ? errorId : undefined,
    };
  }
  const lock = useRef(false);
  const token = useRef("");
  const csrf = useRef("");
  const panel = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  useEffect(() => {
    const controller = new AbortController();
    getData<Service[]>("/services", controller.signal)
      .then((list) => {
        setServices(list);
        const known = list.find((service) => service.slug === interest?.slug);
        if (known)
          setValues((old) => ({ ...old, service_id: String(known.id) }));
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            "Services could not be loaded. Cancel and retry, or use the normal enquiry form.",
          );
      });
    return () => controller.abort();
  }, [interest]);
  useEffect(() => {
    panel.current?.focus();
    panel.current?.scrollIntoView?.({ block: "nearest" });
  }, [review, reference]);
  function cancelReview() {
    if (!token.current || !csrf.current) return;
    const previous = token.current;
    token.current = "";
    void fetch("/api/chat/enquiry/cancel", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrf.current,
      },
      body: JSON.stringify({ review_token: previous }),
    }).catch(() => {});
  }
  useEffect(
    () => () => {
      abort.current?.abort();
      cancelReview();
      onBusyChange(false);
    },
    [onBusyChange],
  );
  async function request(path: string, payload: unknown) {
    const controller = new AbortController();
    abort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const session = await fetch("/api/enquiries/session", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const bootstrap = await session.json();
      if (!session.ok || !bootstrap.data?.csrf_token)
        throw new Error("The secure form could not be prepared. Please retry.");
      csrf.current = bootstrap.data.csrf_token;
      const response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrf.current,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setFields(result.errors ?? {});
        const validation = Object.values(result.errors ?? {})
          .flat()
          .join(" ");
        throw new Error(
          response.status === 429
            ? "Too many attempts. Please wait before trying again."
            : response.status === 419
              ? "Your secure session expired. Please review the details again."
              : validation ||
                result.message ||
                "The enquiry could not be sent. Please retry.",
        );
      }
      return result.data;
    } finally {
      clearTimeout(timeout);
      abort.current = null;
    }
  }
  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !values.consent) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setFields({});
    try {
      const next = await request("/api/chat/enquiry/review", {
        ...values,
        service_id: Number(values.service_id),
        email: values.email || null,
      });
      token.current = next.review_token;
      setReview(next);
      setConfirmed(false);
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "AbortError"
          ? e.message
          : "The review could not be prepared. Please retry.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !review || !confirmed) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setFields({});
    try {
      const result = await request("/api/chat/enquiry", {
        ...review.summary,
        consent: true,
        website: "",
        confirmed: true,
        review_token: review.review_token,
      });
      setReference(result.reference);
      setReview(null);
      setConfirmed(false);
      setValues({
        name: "",
        mobile: "",
        email: "",
        state: "",
        city: "",
        service_id: "",
        message: "",
        website: "",
        consent: false,
      });
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "AbortError"
          ? e.message
          : "The response was interrupted. Retry this confirmation to retrieve the same reference, or contact the team.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="lead-qualification" ref={panel} tabIndex={-1}>
      {reference ? (
        <div role="status" className="qualification-success">
          <h3>Enquiry received</h3>
          <p>
            Your reference: <strong>{reference}</strong>
          </p>
          <p>
            Keep this reference for follow-up. Our team will contact you about
            your requirement.
          </p>
          <button type="button" onClick={onCancel}>
            Back to assistant
          </button>
        </div>
      ) : (
        <>
          <h3>{review ? "Confirm your enquiry" : "Request a team callback"}</h3>
          <p className="qualification-privacy">
            These details go directly to Global Link’s enquiry system, not
            Gemini. Do not enter Aadhaar/PAN numbers, bank details, passwords or
            OTPs.
          </p>
          {error && (
            <p role="alert" ref={errorRef} id={errorId} tabIndex={-1}>
              {error}
            </p>
          )}
          {review ? (
            <form
              onSubmit={submit}
              aria-describedby={error ? errorId : undefined}
            >
              <dl className="qualification-summary">
                <dt>Service</dt>
                <dd>{review.service.title}</dd>
                <dt>Name</dt>
                <dd>{review.summary.name}</dd>
                <dt>Mobile</dt>
                <dd>{review.summary.mobile}</dd>
                {review.summary.email && (
                  <>
                    <dt>Email</dt>
                    <dd>{review.summary.email}</dd>
                  </>
                )}
                <dt>Location</dt>
                <dd>
                  {review.summary.city}, {review.summary.state}
                </dd>
                <dt>Requirement</dt>
                <dd>{review.summary.message}</dd>
                <dt>Consent</dt>
                <dd>Contact permission given for this enquiry.</dd>
              </dl>
              <label className="qualification-consent">
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  disabled={busy}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  I confirm these details and want to send this enquiry.
                </span>
              </label>
              <p className="qualification-privacy">
                Review expires after 10 minutes. Editing requires a new review.
              </p>
              <div className="qualification-controls">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    cancelReview();
                    setReview(null);
                    setConfirmed(false);
                    setError("");
                  }}
                >
                  Edit details
                </button>
                <button type="submit" disabled={busy || !confirmed}>
                  {busy ? "Sending…" : "Confirm and send enquiry"}
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={prepare}
              aria-describedby={error ? errorId : undefined}
            >
              <label>
                Name
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  {...accessibility("name")}
                  value={values.name}
                  onChange={(e) =>
                    setValues({ ...values, name: e.target.value })
                  }
                />
              </label>
              <label>
                Indian mobile
                <input
                  required
                  type="tel"
                  {...accessibility("mobile")}
                  maxLength={18}
                  autoComplete="tel"
                  placeholder="10-digit mobile, optional +91"
                  value={values.mobile}
                  onChange={(e) =>
                    setValues({ ...values, mobile: e.target.value })
                  }
                />
              </label>
              <label>
                Email (optional)
                <input
                  type="email"
                  {...accessibility("email")}
                  maxLength={254}
                  autoComplete="email"
                  value={values.email}
                  onChange={(e) =>
                    setValues({ ...values, email: e.target.value })
                  }
                />
              </label>
              <div className="qualification-grid">
                <label>
                  State
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="address-level1"
                    {...accessibility("state")}
                    value={values.state}
                    onChange={(e) =>
                      setValues({ ...values, state: e.target.value })
                    }
                  />
                </label>
                <label>
                  City / district
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="address-level2"
                    {...accessibility("city")}
                    value={values.city}
                    onChange={(e) =>
                      setValues({ ...values, city: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Relevant service
                <select
                  {...accessibility("service_id")}
                  required
                  value={values.service_id}
                  onChange={(e) =>
                    setValues({ ...values, service_id: e.target.value })
                  }
                >
                  <option value="">Choose a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Short requirement
                <textarea
                  {...accessibility("message")}
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  value={values.message}
                  onChange={(e) =>
                    setValues({ ...values, message: e.target.value })
                  }
                />
              </label>
              <label className="enquiry-trap" aria-hidden="true">
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.website}
                  onChange={(e) =>
                    setValues({ ...values, website: e.target.value })
                  }
                />
              </label>
              <label className="qualification-consent">
                <input
                  type="checkbox"
                  required
                  checked={values.consent}
                  {...accessibility("consent")}
                  onChange={(e) =>
                    setValues({ ...values, consent: e.target.checked })
                  }
                />
                <span>
                  I consent to Global Link using these details to contact me
                  about this enquiry.
                </span>
              </label>
              <button type="submit" disabled={busy || !services.length}>
                {busy ? "Preparing review…" : "Review enquiry"}
              </button>
            </form>
          )}
          <button
            className="qualification-cancel"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel callback request
          </button>
        </>
      )}
    </div>
  );
}
