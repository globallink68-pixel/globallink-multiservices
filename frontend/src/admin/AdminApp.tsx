import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { adminApi, AdminError } from "./api";
import "./admin.css";
type Row = Record<string, any>;
type User = { id: number; name: string };
const Auth = createContext<{
  user: User | null;
  setUser: (u: User | null) => void;
}>({ user: null, setUser: () => {} });
const Confirmation = createContext<(message: string) => Promise<boolean>>(
  async () => false,
);
const links = [
  ["dashboard", "Overview"],
  ["services", "Services"],
  ["categories", "Categories"],
  ["providers", "Providers"],
  ["faqs", "FAQs"],
  ["settings", "Settings"],
  ["audit-logs", "Audit log"],
];
function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error as AdminError;
  return (
    <div className="admin-error" role="alert">
      <strong>{e.message ?? "Something went wrong."}</strong>
      {Object.entries(e.errors ?? {}).map(([key, values]) => (
        <p key={key}>
          {key.replaceAll("_", " ")}: {values.join(" ")}
        </p>
      ))}
    </div>
  );
}
export default function AdminApp() {
  const [pending, setPending] = useState<{
    message: string;
    resolve: (answer: boolean) => void;
    focus: Element | null;
  } | null>(null);
  const confirmChange = (message: string) =>
    new Promise<boolean>((resolve) =>
      setPending({ message, resolve, focus: document.activeElement }),
    );
  const answer = (value: boolean) => {
    const question = pending;
    setPending(null);
    question?.resolve(value);
    queueMicrotask(() => {
      if (question?.focus instanceof HTMLElement) question.focus.focus();
    });
  };
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    let alive = true;
    adminApi<{ user: User | null }>("/session")
      .then((d) => {
        if (alive) setUser(d.user);
      })
      .catch((e) => {
        if (alive) setError(e);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    const expire = () => setUser(null);
    window.addEventListener("admin-session-expired", expire);
    return () => {
      alive = false;
      window.removeEventListener("admin-session-expired", expire);
    };
  }, []);
  if (loading)
    return (
      <div className="admin-loading" role="status">
        Checking administrator session…
      </div>
    );
  if (error)
    return (
      <div className="admin-loading">
        <ErrorBox error={error} />
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  return (
    <Auth.Provider value={{ user, setUser }}>
      <Confirmation.Provider value={confirmChange}>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/*" element={<Protected />} />
        </Routes>
        {pending && (
          <div className="admin-confirm-backdrop">
            <section
              className="admin-confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onKeyDown={(e) => {
                if (e.key === "Escape") answer(false);
                if (e.key === "Tab") {
                  const buttons = e.currentTarget.querySelectorAll("button");
                  if (e.shiftKey && document.activeElement === buttons[0]) {
                    e.preventDefault();
                    buttons[1]?.focus();
                  } else if (
                    !e.shiftKey &&
                    document.activeElement === buttons[1]
                  ) {
                    e.preventDefault();
                    buttons[0]?.focus();
                  }
                }
              }}
            >
              <h2 id="confirm-title">Confirm change</h2>
              <p>{pending.message}</p>
              <div>
                <button autoFocus type="button" onClick={() => answer(false)}>
                  Cancel
                </button>
                <button
                  className="admin-primary"
                  type="button"
                  onClick={() => answer(true)}
                >
                  Confirm change
                </button>
              </div>
            </section>
          </div>
        )}
      </Confirmation.Provider>
    </Auth.Provider>
  );
}
function Login() {
  const { user, setUser } = useContext(Auth);
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/admin/dashboard" replace />;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      await adminApi("/session");
      const d = await adminApi<{ user: User }>("/login", "POST", {
        email,
        password,
      });
      setPassword("");
      setUser(d.user);
      const from = location.state?.from;
      nav(
        typeof from === "string" &&
          from.startsWith("/admin/") &&
          from !== "/admin/login"
          ? from
          : "/admin/dashboard",
        { replace: true },
      );
    } catch (e) {
      setError(e);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-login">
      <Link className="admin-wordmark" to="/">
        GLOBAL LINK <span>CONTENT WORKSPACE</span>
      </Link>
      <form onSubmit={submit}>
        <span className="admin-eyebrow">ADMINISTRATOR ACCESS</span>
        <h1>Welcome back.</h1>
        <p>Sign in to manage the Global Link website.</p>
        <ErrorBox error={error} />
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="admin-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <Link to="/">Return to public website ↗</Link>
      </form>
      <small>
        Authorized administrators only. No public account registration.
      </small>
    </div>
  );
}
function Protected() {
  const { user, setUser } = useContext(Auth);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>();
  useEffect(() => setOpen(false), [location.pathname]);
  if (!user)
    return (
      <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
    );
  return (
    <div className="admin-workspace">
      <a className="admin-skip" href="#admin-main">
        Skip to workspace
      </a>
      <aside className={open ? "admin-sidebar open" : "admin-sidebar"}>
        <Link className="admin-wordmark" to="/admin/dashboard">
          GLOBAL LINK <span>CONTENT WORKSPACE</span>
        </Link>
        <nav aria-label="Admin navigation">
          {links.map(([path, label]) => (
            <NavLink key={path} to={"/admin/" + path}>
              {label}
            </NavLink>
          ))}
        </nav>
        <Link className="admin-public-link" to="/" target="_blank">
          View public website ↗
        </Link>
      </aside>
      <div className="admin-body">
        <header className="admin-top">
          <button
            className="admin-menu"
            aria-expanded={open}
            aria-label={
              open ? "Close admin navigation" : "Open admin navigation"
            }
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>
          <span>Website management</span>
          <div>
            <span>{user.name}</span>
            <button
              onClick={async () => {
                try {
                  await adminApi("/logout", "POST");
                  setUser(null);
                } catch (e) {
                  setError(e);
                }
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main id="admin-main">
          <ErrorBox error={error} />
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="services" element={<ServiceList />} />
            <Route path="services/new" element={<ServiceEditor />} />
            <Route path="services/:id/edit" element={<ServiceEditor />} />
            <Route
              path="categories"
              element={<RecordManager kind="categories" />}
            />
            <Route
              path="providers"
              element={<RecordManager kind="providers" />}
            />
            <Route path="faqs" element={<RecordManager kind="faqs" />} />
            <Route path="settings" element={<Settings />} />
            <Route path="audit-logs" element={<Audit />} />
            <Route path="*" element={<h1>Workspace page not found</h1>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="admin-heading">
      <div>
        <span className="admin-eyebrow">GLOBAL LINK CMS</span>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setData(null);
    setError(undefined);
    adminApi<T>(path)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e);
      });
    return () => {
      alive = false;
    };
  }, [path, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
}
function Dashboard() {
  const { data, error } = useLoad<Row>("/dashboard");
  return (
    <>
      <Heading title="Content overview" />
      <p className="admin-intro">
        Your catalogue, publication state and latest changes in one place.
      </p>
      <ErrorBox error={error} />
      {data ? (
        <>
          <div className="admin-metrics">
            {[
              ["total_services", "Total services"],
              ["published_services", "Published"],
              ["draft_services", "Drafts"],
              ["categories", "Categories"],
              ["active_providers", "Active providers"],
              ["faqs", "FAQs"],
            ].map(([key, label]) => (
              <article key={key}>
                <span>{label}</span>
                <strong>{data[key]}</strong>
              </article>
            ))}
          </div>
          <div className="admin-two">
            <section className="admin-panel">
              <h2>Recent content changes</h2>
              {data.recent_changes.length ? (
                data.recent_changes.map((r: Row, i: number) => (
                  <div className="admin-activity" key={i}>
                    <strong>{r.summary}</strong>
                    <small>{r.created_at}</small>
                  </div>
                ))
              ) : (
                <p>No administrator changes yet.</p>
              )}
            </section>
            <section className="admin-panel">
              <h2>Image review</h2>
              <p>These services have no hero image. Adding one is optional.</p>
              {data.attention.map((s: Row) => (
                <Link
                  className="admin-activity"
                  key={s.id}
                  to={"/admin/services/" + s.id + "/edit"}
                >
                  {s.title} ↗
                </Link>
              ))}
            </section>
          </div>
        </>
      ) : (
        <p role="status">Loading overview…</p>
      )}
    </>
  );
}
function ServiceList() {
  const confirmChange = useContext(Confirmation);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category_id", category);
  if (state) params.set("publication", state);
  const { data, error, reload } = useLoad<Row[]>("/services?" + params);
  const { data: categories } = useLoad<Row[]>("/categories");
  const [actionError, setActionError] = useState<unknown>();
  return (
    <>
      <Heading title="Services">
        <Link className="admin-primary" to="/admin/services/new">
          Add service
        </Link>
      </Heading>
      <div className="admin-filters">
        <label>
          Search services
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Publication
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">All states</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
      </div>
      <ErrorBox error={error ?? actionError} />
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>State</th>
              <th>Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.title}</strong>
                  <small>{s.slug}</small>
                </td>
                <td>
                  <span
                    className={
                      s.is_published ? "admin-badge published" : "admin-badge"
                    }
                  >
                    {s.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td>{s.sort_order}</td>
                <td>
                  <Link to={"/admin/services/" + s.id + "/edit"}>Edit</Link>
                  <button
                    onClick={async () => {
                      if (
                        !(await confirmChange(
                          (s.is_published ? "Unpublish" : "Publish") +
                            " this service?",
                        ))
                      )
                        return;
                      try {
                        await adminApi(
                          "/services/" + s.id + "/publication",
                          "PATCH",
                          { is_published: !s.is_published },
                        );
                        reload();
                      } catch (e) {
                        setActionError(e);
                      }
                    }}
                  >
                    {s.is_published ? "Unpublish" : "Publish"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && !error && <p role="status">Loading services…</p>}
        {data?.length === 0 && <p>No services match these filters.</p>}
      </div>
    </>
  );
}
type FieldSpec = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string | number; label: string }[];
  locked?: boolean;
};
const iconOptions = [
  "bank",
  "code",
  "growth",
  "business",
  "payments",
  "shield",
  "spark",
].map((value) => ({ value, label: value }));
function Field({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: any;
  onChange: (v: any) => void;
}) {
  const id = "field-" + spec.key;
  return (
    <label className={spec.type === "checkbox" ? "admin-check" : "admin-field"}>
      {spec.label}
      {spec.type === "checkbox" ? (
        <input
          id={id}
          aria-label={spec.label}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      ) : spec.type === "textarea" || spec.type === "lines" ? (
        <textarea
          id={id}
          aria-label={spec.label}
          required={spec.required}
          rows={spec.type === "lines" ? 3 : 4}
          value={Array.isArray(value) ? value.join("\n") : (value ?? "")}
          onChange={(e) =>
            onChange(
              spec.type === "lines"
                ? e.target.value.split("\n")
                : e.target.value,
            )
          }
        />
      ) : spec.type === "select" ? (
        <select
          id={id}
          aria-label={spec.label}
          required={spec.required}
          value={value ?? ""}
          onChange={(e) =>
            onChange(
              e.target.value === ""
                ? null
                : typeof spec.options?.find(
                      (o) => String(o.value) === e.target.value,
                    )?.value === "number"
                  ? Number(e.target.value)
                  : e.target.value,
            )
          }
        >
          {spec.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          aria-label={spec.label}
          type={spec.type ?? "text"}
          required={spec.required}
          readOnly={spec.locked}
          min={spec.type === "number" ? 0 : undefined}
          value={value ?? ""}
          onChange={(e) =>
            onChange(
              spec.type === "number"
                ? e.target.value === ""
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
        />
      )}
      {spec.locked && (
        <small>Locked after creation to preserve existing public URLs.</small>
      )}
    </label>
  );
}
function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <div className="admin-image-field">
      <label>
        {label}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append("image", file);
            setBusy(true);
            setError(undefined);
            try {
              const d = await adminApi<{ url: string }>("/media", "POST", form);
              onChange(d.url);
            } catch (e) {
              setError(e);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      <small>
        JPEG, PNG or WebP. Maximum 2 MB / 4 million pixels. Metadata is removed.
      </small>
      {busy && <p role="status">Uploading image…</p>}
      {value && (
        <div>
          <img
            src={value.replace("/api/media/", "/api/admin/media/")}
            alt={label + " preview"}
          />
          <button type="button" onClick={() => onChange("")}>
            Remove image from content
          </button>
        </div>
      )}
      <ErrorBox error={error} />
    </div>
  );
}
function RepeatGroup({
  title,
  rows,
  fields,
  onChange,
  defaults = {},
}: {
  title: string;
  rows: Row[];
  fields: FieldSpec[];
  onChange: (rows: Row[]) => void;
  defaults?: Row;
}) {
  const confirmChange = useContext(Confirmation);
  return (
    <section className="admin-repeat">
      <div className="admin-section-heading">
        <h2>{title}</h2>
        <button
          type="button"
          onClick={() => onChange([...rows, { ...defaults }])}
        >
          Add row
        </button>
      </div>
      {rows.length === 0 && (
        <p>No rows. This section will be hidden on the public page.</p>
      )}
      {rows.map((row, i) => (
        <fieldset key={i}>
          <legend>
            {title} — row {i + 1}
          </legend>
          <div className="admin-row-actions">
            <button
              type="button"
              disabled={i === 0}
              aria-label={"Move row " + (i + 1) + " up"}
              onClick={() => {
                const copy = [...rows];
                [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                onChange(copy);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={i === rows.length - 1}
              aria-label={"Move row " + (i + 1) + " down"}
              onClick={() => {
                const copy = [...rows];
                [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
                onChange(copy);
              }}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={async () => {
                if (
                  await confirmChange(
                    "Remove this content row? Changes apply when you save.",
                  )
                )
                  onChange(rows.filter((_, j) => j !== i));
              }}
            >
              Remove row
            </button>
          </div>
          <div className="admin-form-grid">
            {fields.map((f) => (
              <Field
                key={f.key}
                spec={f}
                value={row[f.key]}
                onChange={(v) =>
                  onChange(
                    rows.map((r, j) => (j === i ? { ...r, [f.key]: v } : r)),
                  )
                }
              />
            ))}
          </div>
        </fieldset>
      ))}
    </section>
  );
}
function ServiceEditor() {
  const confirmChange = useContext(Confirmation);
  const location = useLocation();
  const match = location.pathname.match(/\/services\/(\d+)\/edit/);
  const id = match?.[1];
  const { data: loaded, error: loadError } = useLoad<Row>(
    id ? "/services/" + id : "/categories",
  );
  const { data: categories } = useLoad<Row[]>("/categories");
  const { data: providers } = useLoad<Row[]>("/providers");
  const [data, setData] = useState<Row | null>(null);
  const [tab, setTab] = useState("General");
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (loaded)
      setData(
        id
          ? loaded
          : {
              title: "",
              slug: "",
              category_id: Array.isArray(loaded) ? (loaded[0]?.id ?? "") : "",
              short_description: "",
              description: "",
              icon: "spark",
              icon_path: null,
              hero_image: null,
              cta_text: "Discuss this service",
              is_published: false,
              featured: false,
              sort_order: 0,
              seo_title: "",
              seo_description: "",
              sections: [],
              items: [],
              fees: [],
              providers: [],
              faqs: [],
            },
      );
  }, [loaded, id]);
  function change(key: string, value: any) {
    setData((d) => (d ? { ...d, [key]: value } : d));
    setSaved(false);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    if (
      !!data.is_published !== !!(id && loaded?.is_published) &&
      !(await confirmChange(
        data.is_published
          ? "Publish this service and its saved content publicly?"
          : "Unpublish this service?",
      ))
    )
      return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await adminApi<Row>(
        id ? "/services/" + id : "/services",
        id ? "PUT" : "POST",
        {
          ...data,
          providers: data.providers.map((provider: Row) => ({
            ...provider,
            eligibility_overrides: provider.eligibility_overrides
              .map((line: string) => line.trim())
              .filter(Boolean),
            document_overrides: provider.document_overrides
              .map((line: string) => line.trim())
              .filter(Boolean),
          })),
        },
      );
      setData(result);
      setSaved(true);
      if (!id) nav("/admin/services/" + result.id + "/edit", { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const tabs = [
    "General",
    "Sections",
    "Benefits",
    "Eligibility",
    "Documents",
    "Features",
    "Process",
    "Fees",
    "Providers",
    "FAQ",
    "Notes",
    "SEO",
  ];
  const kinds: Record<string, string> = {
    Benefits: "benefit",
    Eligibility: "eligibility",
    Documents: "document",
    Features: "feature",
    Process: "process",
    Notes: "note",
  };
  return (
    <>
      <Heading title={id ? "Edit service" : "New service"}>
        <Link to="/admin/services">Back to services</Link>
      </Heading>
      <ErrorBox error={loadError} />
      {!data ? (
        <p role="status">Loading editor…</p>
      ) : (
        <form className="admin-editor" onSubmit={save}>
          <div className="admin-editor-bar">
            <span
              className={
                data.is_published ? "admin-badge published" : "admin-badge"
              }
            >
              {data.is_published ? "Published" : "Draft"}
            </span>
            <span>{data.title || "Untitled service"}</span>
            <button className="admin-primary" disabled={busy}>
              {busy ? "Saving…" : "Save service"}
            </button>
          </div>
          <ErrorBox error={error} />
          {saved && (
            <p className="admin-success" role="status">
              Service saved. Public content reflects its publication state.
            </p>
          )}
          <nav className="admin-tabs" aria-label="Service editor sections">
            {tabs.map((t) => (
              <button
                type="button"
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>
          <div className="admin-panel">
            {tab === "General" && (
              <>
                <div className="admin-form-grid">
                  {[
                    { key: "title", label: "Service title", required: true },
                    {
                      key: "slug",
                      label: "URL slug",
                      required: true,
                      locked: !!id,
                    },
                    {
                      key: "category_id",
                      label: "Category",
                      type: "select",
                      required: true,
                      options: categories?.map((c) => ({
                        value: c.id,
                        label: c.name,
                      })),
                    },
                    {
                      key: "short_description",
                      label: "Short description",
                      type: "textarea",
                      required: true,
                    },
                    {
                      key: "description",
                      label: "Overview / detailed description",
                      type: "textarea",
                      required: true,
                    },
                    {
                      key: "icon",
                      label: "Fallback icon",
                      type: "select",
                      options: iconOptions,
                    },
                    {
                      key: "cta_text",
                      label: "Contact button text",
                      required: true,
                    },
                    {
                      key: "sort_order",
                      label: "Display order",
                      type: "number",
                    },
                    {
                      key: "is_published",
                      label: "Publish publicly",
                      type: "checkbox",
                    },
                    {
                      key: "featured",
                      label: "Feature on homepage",
                      type: "checkbox",
                    },
                  ].map((f) => (
                    <Field
                      key={f.key}
                      spec={f}
                      value={data[f.key]}
                      onChange={(v) => change(f.key, v)}
                    />
                  ))}
                </div>
                <ImageField
                  label="Service icon image"
                  value={data.icon_path ?? ""}
                  onChange={(v) => change("icon_path", v)}
                />
                <ImageField
                  label="Hero image"
                  value={data.hero_image ?? ""}
                  onChange={(v) => change("hero_image", v)}
                />
                <p>
                  Plain text only. No guaranteed or unverified marketing claims.
                  Public contacts remain in Settings.
                </p>
              </>
            )}
            {tab === "Sections" && (
              <RepeatGroup
                title="Additional sections / processing information"
                rows={data.sections}
                fields={[
                  { key: "title", label: "Section title", required: true },
                  {
                    key: "body",
                    label: "Section text",
                    type: "textarea",
                    required: true,
                  },
                ]}
                onChange={(r) => change("sections", r)}
              />
            )}
            {kinds[tab] && (
              <RepeatGroup
                title={
                  tab === "Eligibility" ? "Eligibility / requirements" : tab
                }
                rows={data.items.filter((r: Row) => r.kind === kinds[tab])}
                defaults={{
                  kind: kinds[tab],
                  label: "",
                  body: "",
                  is_required: true,
                }}
                fields={[
                  {
                    key: "label",
                    label:
                      tab === "Documents"
                        ? "Document name"
                        : "Title / requirement",
                    required: true,
                  },
                  {
                    key: "body",
                    label: "Description / instruction",
                    type: "textarea",
                  },
                  ...(tab === "Documents"
                    ? [
                        {
                          key: "is_required",
                          label: "Required document",
                          type: "checkbox",
                        },
                      ]
                    : []),
                ]}
                onChange={(r) =>
                  change("items", [
                    ...data.items.filter((x: Row) => x.kind !== kinds[tab]),
                    ...r,
                  ])
                }
              />
            )}
            {tab === "Notes" && (
              <RepeatGroup
                title="Terms & disclaimer"
                rows={data.items.filter((r: Row) => r.kind === "term")}
                defaults={{
                  kind: "term",
                  label: "",
                  body: "",
                  is_required: true,
                }}
                fields={[
                  { key: "label", label: "Disclaimer heading", required: true },
                  { key: "body", label: "Disclaimer text", type: "textarea" },
                ]}
                onChange={(r) =>
                  change("items", [
                    ...data.items.filter((x: Row) => x.kind !== "term"),
                    ...r,
                  ])
                }
              />
            )}
            {tab === "Fees" && (
              <>
                <p>
                  Amounts are integer paise: ₹100.00 = 10000. Only active,
                  explicitly verified fees appear publicly.
                </p>
                <RepeatGroup
                  title="Fees"
                  rows={data.fees}
                  defaults={{
                    label: "",
                    amount_paise: null,
                    currency: "INR",
                    notes: "",
                    is_active: true,
                    is_verified: false,
                  }}
                  fields={[
                    { key: "label", label: "Fee label", required: true },
                    {
                      key: "amount_paise",
                      label: "Amount in paise (blank for contact pricing)",
                      type: "number",
                    },
                    {
                      key: "notes",
                      label: "Fee details / notes",
                      type: "textarea",
                    },
                    { key: "is_active", label: "Active fee", type: "checkbox" },
                    {
                      key: "is_verified",
                      label: "Confirmed / verified for publication",
                      type: "checkbox",
                    },
                  ]}
                  onChange={(r) => change("fees", r)}
                />
              </>
            )}
            {tab === "Providers" && (
              <>
                <p>
                  Provider names do not imply official authorization, guaranteed
                  approval or processing. Confirm all configured details.
                </p>
                <RepeatGroup
                  title="Service providers"
                  rows={data.providers}
                  defaults={{
                    provider_id: providers?.[0]?.id,
                    eligibility_overrides: [],
                    document_overrides: [],
                    fee_information: "",
                    processing_notes: "",
                    notes: "",
                    disclaimer: "",
                  }}
                  fields={[
                    {
                      key: "provider_id",
                      label: "Provider",
                      type: "select",
                      options: providers?.map((p) => ({
                        value: p.id,
                        label: p.name,
                      })),
                    },
                    {
                      key: "eligibility_overrides",
                      label: "Eligibility (one requirement per line)",
                      type: "lines",
                    },
                    {
                      key: "document_overrides",
                      label: "Documents (one per line)",
                      type: "lines",
                    },
                    {
                      key: "fee_information",
                      label: "Confirmed provider fee information",
                      type: "textarea",
                    },
                    {
                      key: "processing_notes",
                      label: "Processing information",
                      type: "textarea",
                    },
                    { key: "notes", label: "Provider notes", type: "textarea" },
                    {
                      key: "disclaimer",
                      label: "Provider disclaimer",
                      type: "textarea",
                    },
                  ]}
                  onChange={(r) => change("providers", r)}
                />
              </>
            )}
            {tab === "FAQ" && (
              <RepeatGroup
                title="Service FAQs"
                rows={data.faqs}
                defaults={{ question: "", answer: "", is_active: true }}
                fields={[
                  { key: "question", label: "Question", required: true },
                  {
                    key: "answer",
                    label: "Answer",
                    type: "textarea",
                    required: true,
                  },
                  { key: "is_active", label: "Active FAQ", type: "checkbox" },
                ]}
                onChange={(r) => change("faqs", r)}
              />
            )}
            {tab === "SEO" && (
              <>
                <Field
                  spec={{ key: "seo_title", label: "SEO title" }}
                  value={data.seo_title}
                  onChange={(v) => change("seo_title", v)}
                />
                <Field
                  spec={{
                    key: "seo_description",
                    label: "Meta description",
                    type: "textarea",
                  }}
                  value={data.seo_description}
                  onChange={(v) => change("seo_description", v)}
                />
                <p>Share images / full SEO metadata remain Phase 6.</p>
              </>
            )}
          </div>
        </form>
      )}
    </>
  );
}
function RecordManager({ kind }: { kind: string }) {
  const { data, error, reload } = useLoad<Row[]>("/" + kind);
  const { data: services } = useLoad<Row[]>("/services");
  const [edit, setEdit] = useState<Row | null>(null);
  const [saveError, setSaveError] = useState<unknown>();
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setEdit(null);
    setSaveError(undefined);
    setSuccess(false);
  }, [kind]);
  const label =
    kind === "faqs" ? "FAQs" : kind[0].toUpperCase() + kind.slice(1);
  const fields: FieldSpec[] =
    kind === "categories"
      ? [
          { key: "name", label: "Category name", required: true },
          {
            key: "slug",
            label: "Category slug",
            required: true,
            locked: !!edit?.id,
          },
          {
            key: "summary",
            label: "Short description",
            type: "textarea",
            required: true,
          },
          { key: "icon", label: "Icon", type: "select", options: iconOptions },
          { key: "sort_order", label: "Display order", type: "number" },
          { key: "is_active", label: "Active category", type: "checkbox" },
          { key: "seo_title", label: "SEO title" },
          {
            key: "seo_description",
            label: "SEO description",
            type: "textarea",
          },
        ]
      : kind === "providers"
        ? [
            { key: "name", label: "Provider name", required: true },
            { key: "code", label: "Short code", required: true },
            { key: "description", label: "Description", type: "textarea" },
            { key: "is_active", label: "Active provider", type: "checkbox" },
            { key: "sort_order", label: "Display order", type: "number" },
          ]
        : [
            { key: "question", label: "Question", required: true },
            {
              key: "answer",
              label: "Answer",
              type: "textarea",
              required: true,
            },
            {
              key: "service_id",
              label: "FAQ scope",
              type: "select",
              options: [
                { value: "", label: "Global FAQ" },
                ...(services?.map((s) => ({ value: s.id, label: s.title })) ??
                  []),
              ],
            },
            { key: "is_active", label: "Active FAQ", type: "checkbox" },
            { key: "sort_order", label: "Display order", type: "number" },
          ];
  return (
    <>
      <Heading title={label}>
        <button
          className="admin-primary"
          onClick={() => {
            setEdit({
              name: "",
              slug: "",
              summary: "",
              icon: "spark",
              is_active: true,
              sort_order: 0,
              code: "",
              description: "",
              logo_path: null,
              question: "",
              answer: "",
              service_id: null,
            });
            setSaveError(undefined);
            setSuccess(false);
          }}
        >
          Add {kind === "faqs" ? "FAQ" : kind.slice(0, -1)}
        </button>
      </Heading>
      <ErrorBox error={error} />
      {success && (
        <p className="admin-success" role="status">
          {label} saved.
        </p>
      )}
      <div className="admin-two">
        <section className="admin-panel">
          <h2>Current records</h2>
          {!data && !error && <p role="status">Loading records…</p>}
          {data?.length === 0 && <p>No records yet.</p>}
          {data?.map((r) => (
            <article className="admin-record" key={r.id}>
              <div>
                <strong>{r.name ?? r.question}</strong>
                <small>
                  Order {r.sort_order} · {r.is_active ? "Active" : "Inactive"}
                  {kind === "faqs"
                    ? r.service_id
                      ? " · Service FAQ"
                      : " · Global FAQ"
                    : ""}
                </small>
              </div>
              <button
                onClick={() => {
                  setEdit({ ...r });
                  setSuccess(false);
                  setSaveError(undefined);
                }}
                aria-label={"Edit " + (r.name ?? r.question)}
              >
                Edit
              </button>
            </article>
          ))}
        </section>
        <section className="admin-panel">
          {edit ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaveError(undefined);
                setBusy(true);
                const values = Object.fromEntries(
                  fields.map((f) => [f.key, edit[f.key] ?? null]),
                );
                if (kind === "providers")
                  values.logo_path = edit.logo_path || null;
                try {
                  await adminApi(
                    "/" + kind + (edit.id ? "/" + edit.id : ""),
                    edit.id ? "PUT" : "POST",
                    values,
                  );
                  setEdit(null);
                  setSuccess(true);
                  reload();
                } catch (e) {
                  setSaveError(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>
                {edit.id ? "Edit" : "New"}{" "}
                {kind === "faqs" ? "FAQ" : kind.slice(0, -1)}
              </h2>
              <ErrorBox error={saveError} />
              {fields.map((f) => (
                <Field
                  key={f.key}
                  spec={f}
                  value={edit[f.key]}
                  onChange={(v) => setEdit({ ...edit, [f.key]: v })}
                />
              ))}
              {kind === "providers" && (
                <>
                  <ImageField
                    label="Provider logo"
                    value={edit.logo_path ?? ""}
                    onChange={(v) => setEdit({ ...edit, logo_path: v })}
                  />
                  <p>
                    Provider labels do not establish official authorization or
                    partnership.
                  </p>
                </>
              )}
              <div className="admin-actions">
                <button className="admin-primary" disabled={busy}>
                  {busy ? "Saving…" : "Save record"}
                </button>
                <button type="button" onClick={() => setEdit(null)}>
                  Cancel
                </button>
              </div>
              <p>
                Deactivate records to remove them from public view. No
                destructive category/provider deletion.
              </p>
            </form>
          ) : (
            <div className="admin-empty">
              <h2>Choose a record</h2>
              <p>Select Edit or add a new record to manage its content.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
const settingsFields: FieldSpec[] = [
  { key: "company_name", label: "Company name", required: true },
  { key: "tagline", label: "Short tagline" },
  { key: "about_summary", label: "About summary", type: "textarea" },
  { key: "phone", label: "Public phone", required: true },
  { key: "email", label: "Public email", type: "email", required: true },
  { key: "whatsapp", label: "WhatsApp number (country code, digits only)" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "facebook", label: "Facebook URL", type: "url" },
  { key: "instagram", label: "Instagram URL", type: "url" },
  { key: "linkedin", label: "LinkedIn URL", type: "url" },
  { key: "youtube", label: "YouTube URL", type: "url" },
  {
    key: "footer",
    label: "Footer description",
    type: "textarea",
    required: true,
  },
  { key: "copyright", label: "Copyright text" },
  { key: "seo_title", label: "Default SEO title", required: true },
  {
    key: "seo_description",
    label: "Default meta description",
    type: "textarea",
    required: true,
  },
];
function Settings() {
  const { data: loaded, error } = useLoad<Row>("/settings");
  const [data, setData] = useState<Row | null>(null);
  const [saveError, setSaveError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (loaded) setData(loaded);
  }, [loaded]);
  return (
    <>
      <Heading title="Site settings" />
      <p className="admin-intro">
        Manage verified company information and public branding in one place.
      </p>
      <ErrorBox error={error} />
      {!data ? (
        <p role="status">Loading settings…</p>
      ) : (
        <form
          className="admin-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaveError(undefined);
            setSaved(false);
            setBusy(true);
            try {
              const values = Object.fromEntries(
                [
                  ...settingsFields.map((f) => f.key),
                  "logo",
                  "favicon",
                  "footer_logo",
                ].map((k) => [k, data[k] ?? ""]),
              );
              setData(await adminApi<Row>("/settings", "PUT", values));
              setSaved(true);
            } catch (e) {
              setSaveError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          <ErrorBox error={saveError} />
          {saved && (
            <p className="admin-success" role="status">
              Settings saved. Reload the public website to see the changes.
            </p>
          )}
          <div className="admin-form-grid">
            {settingsFields.map((f) => (
              <Field
                key={f.key}
                spec={f}
                value={data[f.key]}
                onChange={(v) => {
                  setData({ ...data, [f.key]: v });
                  setSaved(false);
                }}
              />
            ))}
          </div>
          <h2>Brand images</h2>
          <p>
            The current GL mark is a temporary placeholder until the approved
            logo is uploaded. No replacement logo was invented.
          </p>
          {[
            ["logo", "Company logo"],
            ["favicon", "Favicon"],
            ["footer_logo", "Footer logo (optional)"],
          ].map(([key, label]) => (
            <ImageField
              key={key}
              label={label}
              value={data[key] ?? ""}
              onChange={(v) => {
                setData({ ...data, [key]: v });
                setSaved(false);
              }}
            />
          ))}
          <button className="admin-primary" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </form>
      )}
    </>
  );
}
function Audit() {
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page) });
  if (entity) params.set("entity_type", entity);
  if (action) params.set("action", action);
  const { data, error } = useLoad<Row>("/audit-logs?" + params);
  return (
    <>
      <Heading title="Audit log" />
      <p className="admin-intro">
        Read-only administrator activity. Content values, credentials and
        session tokens are never recorded.
      </p>
      <div className="admin-filters">
        <label>
          Entity
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All entities</option>
            {[
              "service",
              "category",
              "provider",
              "faq",
              "settings",
              "administrator",
              "media",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Action
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {[
              "created",
              "updated",
              "saved",
              "published",
              "unpublished",
              "login",
              "logout",
              "uploaded",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <ErrorBox error={error} />
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Administrator</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((r: Row) => (
              <tr key={r.id}>
                <td>{r.created_at}</td>
                <td>{r.administrator ?? "Former administrator"}</td>
                <td>{r.action}</td>
                <td>
                  {r.entity_type} {r.entity_id}
                </td>
                <td>{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.data.length === 0 && <p>No matching activity.</p>}
        {!data && !error && <p role="status">Loading audit log…</p>}
      </div>
      {data && (
        <div className="admin-actions">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous page
          </button>
          <span>
            Page {page} of {data.last_page}
          </span>
          <button
            disabled={page >= data.last_page}
            onClick={() => setPage(page + 1)}
          >
            Next page
          </button>
        </div>
      )}
    </>
  );
}
