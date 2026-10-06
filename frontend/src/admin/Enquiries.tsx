import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { adminApi, AdminError } from "./api";

export const leadStatuses = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "QUALIFIED",
  "CONVERTED",
  "CLOSED",
];
const label = (value: string) => value.replaceAll("_", " ");
type Lead = {
  reference: string;
  name: string;
  mobile: string;
  email: string | null;
  state: string;
  city: string;
  status: string;
  created_at: string;
  service_id: number;
  service_title: string;
  service_slug: string;
  lead_source?: string;
};
type Detail = Lead & {
  message: string;
  source_path: string;
  consented_at: string;
  consent_version: string;
  history: {
    from_status: string | null;
    status: string;
    note: string | null;
    created_at: string;
    administrator: string | null;
  }[];
  notes: { body: string; created_at: string; administrator: string | null }[];
};
type Page = {
  data: Lead[];
  current_page: number;
  last_page: number;
  total: number;
};
function Feedback({ error }: { error: unknown }) {
  if (!error) return null;
  const value = error as AdminError;
  return (
    <div className="admin-error" role="alert">
      <strong>{value.message ?? "The request could not be completed."}</strong>
      {Object.entries(value.errors ?? {}).map(([key, messages]) => (
        <p key={key}>
          {label(key)}: {messages.join(" ")}
        </p>
      ))}
    </div>
  );
}
function useLeadData<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<unknown>(),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError(undefined);
    adminApi<T>(path)
      .then((value) => {
        if (live) setData(value);
      })
      .catch((value) => {
        if (live) setError(value);
      });
    return () => {
      live = false;
    };
  }, [path, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
}
export function EnquiryList() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: params.get("search") ?? "",
    service_id: params.get("service_id") ?? "",
    status: params.get("status") ?? "",
    lead_source: params.get("lead_source") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  });
  const { data, error, reload } = useLeadData<Page>(
    "/enquiries?" + params.toString(),
  );
  const services = useLeadData<{ id: number; title: string }[]>("/services");
  function apply(event: FormEvent) {
    event.preventDefault();
    setParams(
      Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    );
  }
  function page(value: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(value));
    setParams(next);
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">GLOBAL LINK CRM</span>
          <h1>Enquiries</h1>
        </div>
      </div>
      <p className="admin-intro">
        Service enquiries and follow-up. Contact details and internal notes are
        administrator-only.
      </p>
      <form className="admin-panel lead-filters" onSubmit={apply}>
        <label>
          Search leads
          <input
            value={filters.search}
            maxLength={120}
            placeholder="Name, reference, mobile, email or city"
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </label>
        <label>
          Lead service
          <select
            value={filters.service_id}
            onChange={(e) =>
              setFilters({ ...filters, service_id: e.target.value })
            }
          >
            <option value="">All services</option>
            {services.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Lead status
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            {leadStatuses.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          From date (UTC)
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </label>
        <label>
          Lead source
          <select
            value={filters.lead_source}
            onChange={(e) =>
              setFilters({ ...filters, lead_source: e.target.value })
            }
          >
            <option value="">All sources</option>
            <option value="WEBSITE_FORM">Website form</option>
            <option value="AI_ASSISTANT">AI assistant</option>
          </select>
        </label>
        <label>
          To date (UTC)
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </label>
        <button className="admin-primary">Apply filters</button>
        <button
          type="button"
          onClick={() => {
            setFilters({
              search: "",
              service_id: "",
              status: "",
              lead_source: "",
              from: "",
              to: "",
            });
            setParams({});
          }}
        >
          Clear filters
        </button>
      </form>
      <Feedback error={error ?? services.error} />
      {error && <button onClick={reload}>Retry lead list</button>}
      {data ? (
        <>
          <p>{data.total} enquiries · newest first · timestamps in UTC</p>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Service</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((lead) => (
                  <tr key={lead.reference}>
                    <td>
                      <Link
                        to={"/admin/enquiries/" + lead.reference}
                        aria-label={"View lead " + lead.reference}
                      >
                        <strong>{lead.name}</strong>
                        <small className="lead-reference">
                          {lead.reference}
                        </small>
                      </Link>
                      <small>
                        {lead.city}, {lead.state}
                      </small>
                    </td>
                    <td>{lead.service_title}</td>
                    <td>
                      {lead.mobile}
                      {lead.email && (
                        <small className="lead-reference">{lead.email}</small>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge">{label(lead.status)}</span>
                    </td>
                    <td>
                      {lead.lead_source === "AI_ASSISTANT"
                        ? "AI assistant"
                        : "Website form"}
                    </td>
                    <td>{lead.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.data.length && (
            <div className="admin-panel">No enquiries match these filters.</div>
          )}
          <div className="lead-pagination">
            <button
              disabled={data.current_page === 1}
              onClick={() => page(data.current_page - 1)}
            >
              Previous leads
            </button>
            <span>
              Page {data.current_page} of {data.last_page}
            </span>
            <button
              disabled={data.current_page >= data.last_page}
              onClick={() => page(data.current_page + 1)}
            >
              Next leads
            </button>
          </div>
        </>
      ) : (
        !error && <p role="status">Loading enquiries…</p>
      )}
    </>
  );
}
export function EnquiryDetail() {
  const { reference = "" } = useParams();
  const { data, error, reload } = useLeadData<Detail>(
    "/enquiries/" + reference,
  );
  const [status, setStatus] = useState(""),
    [statusNote, setStatusNote] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState<unknown>(),
    [success, setSuccess] = useState("");
  async function save(event: FormEvent, kind: "status" | "notes") {
    event.preventDefault();
    if (!data || busy) return;
    setBusy(true);
    setSaveError(undefined);
    setSuccess("");
    try {
      await adminApi(
        "/enquiries/" + reference + "/" + kind,
        kind === "status" ? "PATCH" : "POST",
        kind === "status"
          ? { status, expected_status: data.status, note: statusNote || null }
          : { body: note },
      );
      setSuccess(
        kind === "status" ? "Lead status updated." : "Internal note added.",
      );
      setStatus("");
      setStatusNote("");
      setNote("");
      reload();
    } catch (error) {
      setSaveError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">GLOBAL LINK CRM</span>
          <h1>Enquiry detail</h1>
        </div>
        <Link to="/admin/enquiries">Back to enquiries</Link>
      </div>
      <Feedback error={error ?? saveError} />
      {(error ||
        (saveError instanceof AdminError && saveError.status === 409)) && (
        <button onClick={reload}>Reload lead</button>
      )}
      {success && (
        <p className="admin-success" role="status">
          {success}
        </p>
      )}
      {data ? (
        <>
          <div className="admin-panel lead-summary">
            <span className="admin-badge">{label(data.status)}</span>
            <h2>{data.name}</h2>
            <p className="lead-reference">{data.reference}</p>
            <dl>
              <dt>Service</dt>
              <dd>
                {data.service_title} · {data.service_slug}
              </dd>
              <dt>Contact</dt>
              <dd>
                <a href={"tel:+91" + data.mobile}>{data.mobile}</a>
                {data.email && (
                  <>
                    {" "}
                    · <a href={"mailto:" + data.email}>{data.email}</a>
                  </>
                )}
              </dd>
              <dt>Location</dt>
              <dd>
                {data.city}, {data.state}
              </dd>
              <dt>Source</dt>
              <dd>
                {data.lead_source === "AI_ASSISTANT"
                  ? "AI assistant"
                  : "Website form"}{" "}
                · {data.source_path}
              </dd>
              <dt>Submitted (UTC)</dt>
              <dd>{data.created_at}</dd>
              <dt>Consent</dt>
              <dd>
                {data.consent_version} · {data.consented_at} UTC
              </dd>
            </dl>
            <h3>Visitor message</h3>
            <p className="lead-plain">{data.message}</p>
          </div>
          <div className="admin-two">
            <section className="admin-panel">
              <h2>Update status</h2>
              <form onSubmit={(e) => save(e, "status")} className="lead-form">
                <label>
                  New lead status
                  <select
                    required
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Choose status</option>
                    {leadStatuses
                      .filter((s) => s !== data.status)
                      .map((s) => (
                        <option key={s} value={s}>
                          {label(s)}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Status note (optional)
                  <textarea
                    maxLength={3000}
                    rows={3}
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                </label>
                <button className="admin-primary" disabled={busy || !status}>
                  {busy ? "Saving…" : "Update lead status"}
                </button>
              </form>
              <p>
                Every change keeps its previous status, administrator and
                timestamp. Closed leads can be reopened.
              </p>
            </section>
            <section className="admin-panel">
              <h2>Add internal note</h2>
              <form onSubmit={(e) => save(e, "notes")} className="lead-form">
                <label>
                  Internal note
                  <textarea
                    required
                    minLength={2}
                    maxLength={3000}
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button
                  className="admin-primary"
                  disabled={busy || note.trim().length < 2}
                >
                  {busy ? "Saving…" : "Add note"}
                </button>
              </form>
              <p>
                Notes are append-only and never public. Include only information
                needed for follow-up.
              </p>
            </section>
          </div>
          <div className="admin-two">
            <section className="admin-panel">
              <h2>Status history</h2>
              <ol className="lead-history">
                {data.history.map((item, index) => (
                  <li key={index}>
                    <strong>
                      {item.from_status ? label(item.from_status) + " → " : ""}
                      {label(item.status)}
                    </strong>
                    <small>
                      {item.administrator ?? "Visitor submission"} ·{" "}
                      {item.created_at} UTC
                    </small>
                    {item.note && <p className="lead-plain">{item.note}</p>}
                  </li>
                ))}
              </ol>
            </section>
            <section className="admin-panel">
              <h2>Internal notes</h2>
              {data.notes.length ? (
                <ol className="lead-history">
                  {data.notes.map((item, index) => (
                    <li key={index}>
                      <p className="lead-plain">{item.body}</p>
                      <small>
                        {item.administrator ?? "Former administrator"} ·{" "}
                        {item.created_at} UTC
                      </small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No internal notes yet.</p>
              )}
            </section>
          </div>
        </>
      ) : (
        !error && <p role="status">Loading enquiry detail…</p>
      )}
    </>
  );
}
