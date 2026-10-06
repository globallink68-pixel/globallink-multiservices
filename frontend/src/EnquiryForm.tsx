import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { getData, type Service } from "./api";

export default function EnquiryForm({ service }: { service?: Service }) {
  const location = useLocation();
  const [open, setOpen] = useState(Boolean(service) || location.hash === "#enquiry");
  const [services, setServices] = useState<Service[]>([]);
  const [values, setValues] = useState({
    name: "",
    mobile: "",
    email: "",
    state: "",
    city: "",
    service_id: service ? String(service.id) : "",
    message: "",
    consent: false,
    website: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [reference, setReference] = useState("");
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (location.hash === "#enquiry") setOpen(true);
  }, [location.hash]);
  useEffect(() => {
    if (reference) {
      successRef.current?.scrollIntoView?.({ block: "center" });
      successRef.current?.focus({ preventScroll: true });
    }
  }, [reference]);
  useEffect(() => {
    if (!open || service) return;
    const abort = new AbortController();
    getData<Service[]>("/services", abort.signal)
      .then(setServices)
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            "Available services could not be loaded. Close and reopen the form to retry.",
          );
      });
    return () => abort.abort();
  }, [open, service]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setFields({});
    try {
      const bootstrap = await fetch("/api/enquiries/session", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const session = await bootstrap.json();
      if (!bootstrap.ok || !session.data?.csrf_token)
        throw new Error(
          "The secure form could not be prepared. Please retry shortly.",
        );
      const response = await fetch("/api/enquiries", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": session.data.csrf_token,
        },
        body: JSON.stringify({
          ...values,
          service_id: Number(service?.id ?? values.service_id),
          email: values.email || null,
          source_path: location.pathname,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setFields(result.errors ?? {});
        throw new Error(
          response.status === 429
            ? "Too many attempts. Please wait before trying again."
            : response.status === 419
              ? "Your secure session expired. Submit again to refresh it."
              : (result.message ??
                "We could not send your enquiry. Please retry."),
        );
      }
      setReference(result.data.reference);
      setValues({
        name: "",
        mobile: "",
        email: "",
        state: "",
        city: "",
        service_id: "",
        message: "",
        consent: false,
        website: "",
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We could not send your enquiry. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div id="enquiry" className="enquiry-panel">
      {!service && (
        <button
          type="button"
          className="button white"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "Close enquiry form" : "Send an enquiry"}
        </button>
      )}
      {open &&
        (reference ? (
          <div
            role="status"
            className="enquiry-success"
            ref={successRef}
            tabIndex={-1}
          >
            <h3>Enquiry received</h3>
            <p>Thank you. Our team will contact you about your requirements.</p>
            <p>
              Your reference: <strong>{reference}</strong>
            </p>
            <p>
              Keep this reference for follow-up. No payment or approval is
              implied.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="enquiry-form">
            <h3>
              {service
                ? "Enquire about " + service.title
                : "Tell us what you need"}
            </h3>
            <p>
              Share your contact details for this enquiry. Please do not include
              identity documents, bank details or payment information.
            </p>
            {error && (
              <div role="alert" className="enquiry-error">
                <strong>{error}</strong>
                {Object.entries(fields).map(([key, messages]) => (
                  <p key={key}>
                    {key.replaceAll("_", " ")}: {messages.join(" ")}
                  </p>
                ))}
              </div>
            )}
            <div className="enquiry-grid">
              <label>
                Name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={values.name}
                  onChange={(e) =>
                    setValues({ ...values, name: e.target.value })
                  }
                />
              </label>
              <label>
                Mobile
                <input
                  name="mobile"
                  type="tel"
                  required
                  maxLength={18}
                  autoComplete="tel"
                  placeholder="10-digit Indian mobile"
                  value={values.mobile}
                  onChange={(e) =>
                    setValues({ ...values, mobile: e.target.value })
                  }
                />
              </label>
              <label>
                Email (optional)
                <input
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={values.email}
                  onChange={(e) =>
                    setValues({ ...values, email: e.target.value })
                  }
                />
              </label>
              <label>
                State
                <input
                  name="state"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="address-level1"
                  value={values.state}
                  onChange={(e) =>
                    setValues({ ...values, state: e.target.value })
                  }
                />
              </label>
              <label>
                City / district
                <input
                  name="city"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="address-level2"
                  value={values.city}
                  onChange={(e) =>
                    setValues({ ...values, city: e.target.value })
                  }
                />
              </label>
              <label>
                Service
                {service ? (
                  <input value={service.title} readOnly />
                ) : (
                  <select
                    name="service_id"
                    required
                    value={values.service_id}
                    onChange={(e) =>
                      setValues({ ...values, service_id: e.target.value })
                    }
                  >
                    <option value="">Choose a service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>
            <label>
              Message
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={3000}
                rows={4}
                value={values.message}
                onChange={(e) =>
                  setValues({ ...values, message: e.target.value })
                }
              />
            </label>
            <label className="enquiry-trap" aria-hidden="true">
              Website
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={values.website}
                onChange={(e) =>
                  setValues({ ...values, website: e.target.value })
                }
              />
            </label>
            <label className="enquiry-consent">
              <input
                type="checkbox"
                required
                checked={values.consent}
                onChange={(e) =>
                  setValues({ ...values, consent: e.target.checked })
                }
              />
              <span>
                I consent to Global Link using these details to contact me about
                this enquiry.
              </span>
            </label>
            <p className="enquiry-privacy">
              Only authorized administrators can access your enquiry. Contact
              the team to request correction or removal; no marketing
              subscription is created.
            </p>
            <button className="button white" disabled={busy}>
              {busy ? "Sending enquiry…" : "Submit enquiry"}
            </button>
          </form>
        ))}
    </div>
  );
}
