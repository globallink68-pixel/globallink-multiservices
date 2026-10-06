import { useEffect, useState, Suspense, lazy } from "react";
import { Link, Route, Routes, useLocation, useParams } from "react-router-dom";
import { getData, type Site, type Service } from "./api";
import { Brand, Ecosystem, Icon, ServiceCard, mediaSource } from "./components";
const AdminApp = lazy(() => import("./admin/AdminApp"));

function Seo({ title, description }: { title: string; description: string }) {
  const location = useLocation();
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.append(meta);
    }
    meta.setAttribute("content", description);
  }, [title, description, location.pathname]);
  return null;
}
function Faqs({ items }: { items: Site["faqs"] }) {
  return (
    <div className="faq-list">
      {items.map((f, i) => (
        <details key={f.question}>
          <summary>
            <span className="faq-number">{String(i + 1).padStart(2, "0")}</span>
            {f.question}
            <span className="faq-plus" aria-hidden="true">
              +
            </span>
          </summary>
          <p>{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
function Contact({ site }: { site: Site }) {
  const s = site.settings;
  const phone = s.phone?.replace(/\D/g, "");
  return (
    <section id="contact" className="contact-section section">
      <div>
        <span className="eyebrow light">LET’S MAKE THE NEXT MOVE</span>
        <h2>
          A question today.
          <br />A possibility tomorrow.
        </h2>
        <p>
          Tell us what you have in mind. Let’s find the right service for your
          business.
        </p>
      </div>
      <div className="contact-panel">
        <span className="icon-tile">
          <Icon name="phone" />
        </span>
        <h3>Talk to Global Link</h3>
        <p>
          For current availability, documents, fees and next steps, contact our
          team.
        </p>
        {s.phone && (
          <a className="contact-number" href={"tel:+" + phone}>
            {s.phone}
          </a>
        )}
        {s.email && (
          <a className="contact-email" href={"mailto:" + s.email}>
            {s.email}
          </a>
        )}
        <div className="contact-actions">
          {s.whatsapp && (
            <a
              className="button white"
              href={"https://wa.me/" + s.whatsapp.replace(/\D/g, "")}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat on WhatsApp <Icon name="arrow" size={18} />
            </a>
          )}
        </div>
        {s.address && <p>{s.address}</p>}
        <div className="social-links">
          {["facebook", "instagram", "linkedin", "youtube"]
            .filter((k) => (s[k] || "").startsWith("https://"))
            .map((k) => (
              <a key={k} href={s[k]} target="_blank" rel="noopener noreferrer">
                {k[0].toUpperCase() + k.slice(1)}
              </a>
            ))}
        </div>
      </div>
    </section>
  );
}
function Home({ site }: { site: Site }) {
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    getData<Service[]>("/services", abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setServices(data);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, []);
  const featured = (services ?? []).filter((s) => s.featured).slice(0, 6);
  return (
    <>
      <Seo
        title={site.settings.seo_title}
        description={site.settings.seo_description}
      />
      <section className="hero wrap">
        <div className="hero-copy">
          <span className="eyebrow">
            <i />
            EVERY BIG STEP STARTS WITH A CONNECTION
          </span>
          <h1>
            Grow your business.
            <br />
            <span>Go beyond.</span>
          </h1>
          <p>
            From banking business services to software and digital marketing —
            discover possibilities that move your business forward.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/services">
              Explore services <Icon name="arrow" size={19} />
            </Link>
            <a className="button ghost" href="#contact">
              Let’s talk <Icon name="phone" size={18} />
            </a>
          </div>
          <div className="hero-note">
            <span className="tiny-check">
              <Icon name="check" size={15} />
            </span>
            Explore your options. Make an informed next move.
          </div>
        </div>
        <Ecosystem />
      </section>
      <div className="category-ribbon">
        <div className="wrap">
          {site.categories.map((c) => (
            <Link key={c.slug} to={"/services?category=" + c.slug}>
              <Icon name={c.icon} size={20} />
              {c.name}
              <span>↗</span>
            </Link>
          ))}
        </div>
      </div>
      <section id="about" className="section wrap about-section">
        <div>
          <span className="eyebrow">
            A WORLD OF POSSIBILITIES. ONE GLOBAL LINK.
          </span>
          <h2>
            Your ambition.
            <br />
            Our <em>starting point.</em>
          </h2>
        </div>
        <div>
          <p className="large-copy">
            {site.settings.about_summary ||
              "Whether you’re starting a service outlet, building an online presence or exploring a new business opportunity, the next step should feel clear."}
          </p>
          <p>
            Global Link brings business, digital services, technology and
            creative solutions into one place. Explore the catalogue, understand
            your options and connect with the team for confirmed details.
          </p>
          <Link className="text-link" to="/services">
            Find your next opportunity <Icon name="arrow" size={18} />
          </Link>
        </div>
      </section>
      <section id="services" className="section services-section">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow">BUILT AROUND YOUR NEXT STEP</span>
              <h2>
                Different needs.
                <br />
                <em>Connected solutions.</em>
              </h2>
            </div>
            <Link className="button outline" to="/services">
              View all services <Icon name="arrow" size={18} />
            </Link>
          </div>
          {error ? (
            <p role="alert">
              {error}{" "}
              <button onClick={() => window.location.reload()}>Retry</button>
            </p>
          ) : services === null ? (
            <p role="status">Loading services…</p>
          ) : featured.length === 0 ? (
            <p>
              No featured services are currently published. Browse the catalogue
              or contact our team.
            </p>
          ) : (
            <div className="service-grid">
              {featured.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          )}
          <div className="catalogue-note">
            <span>{services?.length ? services.length + " services" : ""}</span>
            <p>
              Banking & finance · Digital Seva · Business opportunities ·
              Software · Marketing
            </p>
            <small>
              Service availability, eligibility and terms must be confirmed
              before applying.
            </small>
          </div>
        </div>
      </section>
      <section id="why-us" className="section wrap why-section">
        <div className="why-intro">
          <span className="eyebrow">A CLEARER WAY FORWARD</span>
          <h2>
            Big on possibilities.
            <br />
            <em>Clear on the details.</em>
          </h2>
          <p>
            Choose a service with the information you need — and a real
            conversation when it matters.
          </p>
        </div>
        <div className="why-grid">
          {[
            [
              "01",
              "One place to explore",
              "Browse related business and technology services without jumping between disconnected catalogues.",
            ],
            [
              "02",
              "Built around your goals",
              "Start with what you want to achieve, then explore the services that fit your next step.",
            ],
            [
              "03",
              "Information before commitment",
              "Ask for current eligibility, documents, pricing and processing details before you apply.",
            ],
            [
              "04",
              "A direct conversation",
              "Connect with Global Link by phone, email or WhatsApp to discuss the specifics.",
            ],
          ].map(([n, t, p]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section focus-section">
        <div className="wrap focus-grid">
          {[
            [
              "business-opportunities",
              "Business opportunities",
              "Explore your next avenue.",
              "Retailer, distributor and other business opportunities. Find a starting point that fits your plans.",
              "business",
            ],
            [
              "software-it",
              "Software & IT solutions",
              "Make your idea digital.",
              "Websites, apps, business software and online stores — built around what you need to do.",
              "code",
            ],
            [
              "digital-marketing",
              "Marketing & creative",
              "Put your brand in focus.",
              "Explore social media, search, design and video services for your next campaign.",
              "growth",
            ],
          ]
            .filter(([slug]) => site.categories.some((c) => c.slug === slug))
            .map(([slug, label, title, copy, icon]) => (
              <article key={slug}>
                <Icon name={icon} size={32} />
                <span className="eyebrow">
                  {site.categories.find((c) => c.slug === slug)?.name || label}
                </span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <Link className="text-link" to={"/services?category=" + slug}>
                  Explore category <Icon name="arrow" size={18} />
                  <span className="sr-only"> {label}</span>
                </Link>
              </article>
            ))}
        </div>
      </section>
      <section className="section wrap process-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FROM EXPLORING TO YOUR NEXT STEP</span>
            <h2>
              Keep it <em>simple.</em>
            </h2>
          </div>
          <p>
            A conversation-first approach.
            <br />
            No promises without confirmed details.
          </p>
        </div>
        <div className="process-grid">
          {[
            [
              "01",
              "Explore",
              "Browse the services and find what aligns with your business.",
            ],
            [
              "02",
              "Connect",
              "Tell us your requirements and ask for current service details.",
            ],
            [
              "03",
              "Plan your next step",
              "Review eligibility, documents and terms before you proceed.",
            ],
          ].map(([n, t, p]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="faq" className="section wrap faq-section">
        <div>
          <span className="eyebrow">GOOD QUESTIONS. CLEAR ANSWERS.</span>
          <h2>
            A little clarity
            <br />
            <em>goes a long way.</em>
          </h2>
          <p>
            Need something more specific?
            <br />
            <a href="#contact" className="text-link">
              Ask the team <Icon name="arrow" size={18} />
            </a>
          </p>
        </div>
        <Faqs items={site.faqs} />
      </section>
      <Contact site={site} />
    </>
  );
}
function Catalogue({ site }: { site: Site }) {
  const location = useLocation();
  const category = new URLSearchParams(location.search).get("category") ?? "";
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    setServices(null);
    setError("");
    getData<Service[]>(
      "/services" +
        (category ? "?category=" + encodeURIComponent(category) : ""),
      abort.signal,
    )
      .then((data) => {
        if (!abort.signal.aborted) setServices(data);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [category]);
  const filtered = services?.filter((s) =>
    (s.title + " " + s.short_description)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="wrap section catalogue-page">
      <Seo
        title={
          site.categories.find((c) => c.slug === category)?.seo_title ||
          "Explore services | " + site.settings.company_name
        }
        description={
          site.categories.find((c) => c.slug === category)?.seo_description ||
          "Explore banking business services, Digital Seva, business opportunities, software and digital marketing."
        }
      />
      <Link className="breadcrumb" to="/">
        Home / Services
      </Link>
      <span className="eyebrow">FIND YOUR NEXT POSSIBILITY</span>
      <h1>
        One catalogue.
        <br />
        <em>Many ways forward.</em>
      </h1>
      <p className="intro">
        Explore the service that fits your plans. Contact the team for confirmed
        requirements, availability and fees.
      </p>
      <div className="catalogue-controls">
        <label>
          <span className="sr-only">Search services</span>
          <input
            type="search"
            aria-label="Search services"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a service…"
          />
        </label>
        <nav aria-label="Service categories">
          <Link className={!category ? "active" : ""} to="/services">
            All services
          </Link>
          {site.categories.map((c) => (
            <Link
              key={c.id}
              className={category === c.slug ? "active" : ""}
              to={"/services?category=" + c.slug}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : !filtered ? (
        <p role="status">Loading services…</p>
      ) : filtered.length ? (
        <>
          <p className="result-count">
            {filtered.length} {filtered.length === 1 ? "service" : "services"}{" "}
            to explore
          </p>
          <div className="service-grid">
            {filtered.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h2>No matching services</h2>
          <p>Try another search or category.</p>
          <Link to="/services">Browse all services</Link>
        </div>
      )}
    </div>
  );
}
function Detail({ site }: { site: Site }) {
  const { slug } = useParams();
  const [service, setService] = useState<Service | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    setService(null);
    setError("");
    getData<Service>(
      "/services/" + encodeURIComponent(slug ?? ""),
      abort.signal,
    )
      .then((data) => {
        if (!abort.signal.aborted) setService(data);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [slug]);
  if (error)
    return (
      <section className="wrap section empty-state">
        <h1>Service unavailable</h1>
        <p role="alert">{error}</p>
        <Link className="button primary" to="/services">
          Explore the catalogue
        </Link>
      </section>
    );
  if (!service)
    return (
      <section className="wrap section" role="status">
        Loading service details…
      </section>
    );
  const s = service;
  const headings: Record<string, string> = {
    benefit: "Benefits",
    eligibility: "Eligibility",
    document: "Document checklist",
    feature: "Service features",
    process: "How to proceed",
    note: "Important notes",
    term: "Terms & disclaimer",
  };
  return (
    <>
      <Seo
        title={s.seo_title || s.title + " | " + site.settings.company_name}
        description={s.seo_description || s.short_description}
      />
      <section className="detail-hero wrap section">
        <Link
          className="breadcrumb"
          to={"/services?category=" + s.category.slug}
        >
          Services / {s.category.name}
        </Link>
        <div className="detail-heading">
          <div>
            <span className="eyebrow">{s.category.name}</span>
            <h1>{s.title}</h1>
            <p className="intro">{s.short_description}</p>
            <a className="button primary" href="#contact">
              {s.cta_text || "Discuss this service"}{" "}
              <Icon name="arrow" size={18} />
            </a>
          </div>
          <div className="detail-icon">
            {mediaSource(s.hero_image || s.icon_path) ? (
              <img
                className="detail-hero-image"
                src={mediaSource(s.hero_image || s.icon_path)}
                alt={s.title}
              />
            ) : (
              <Icon name={s.icon} size={92} />
            )}
          </div>
        </div>
      </section>
      <div className="wrap detail-layout">
        <div>
          <section className="detail-section">
            <h2>Overview</h2>
            <p>{s.description}</p>
          </section>
          {s.sections?.map((section, i) => (
            <section className="detail-section" key={i}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          {Object.entries(headings).map(([kind, title]) => {
            const items = s.items?.filter((i) => i.kind === kind) ?? [];
            return items.length ? (
              <section className="detail-section" key={kind}>
                <h2>{title}</h2>
                {kind === "process" ? (
                  <ol>
                    {items.map((i) => (
                      <li key={i.label}>
                        <strong>{i.label}</strong>
                        {i.body && <p>{i.body}</p>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul className="detail-list">
                    {items.map((i) => (
                      <li key={i.label}>
                        <Icon name="check" size={18} />
                        <div>
                          {i.label}{" "}
                          {kind === "document" && i.is_required === false && (
                            <small className="optional-document">
                              Optional
                            </small>
                          )}
                          {i.body && <p>{i.body}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null;
          })}
          {!!s.providers?.length && (
            <section className="detail-section">
              <h2>Configured bank & provider labels</h2>
              <p className="notice">
                These are service catalogue labels, not a claim of official bank
                authorization or partnership. Confirm current availability and
                the authorized arrangement before applying.
              </p>
              <div className="provider-grid">
                {s.providers.map((p) => (
                  <article key={p.name}>
                    {mediaSource(p.logo_path) && (
                      <img
                        className="provider-logo"
                        src={mediaSource(p.logo_path)}
                        alt={p.name + " logo"}
                      />
                    )}
                    <h3>{p.name}</h3>
                    {p.description && <p>{p.description}</p>}
                    {p.eligibility.length > 0 && (
                      <>
                        <h4>Eligibility</h4>
                        <ul>
                          {p.eligibility.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {p.documents.length > 0 && (
                      <>
                        <h4>Documents</h4>
                        <ul>
                          {p.documents.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {p.fee_information && <p>{p.fee_information}</p>}
                    {p.processing_notes && <p>{p.processing_notes}</p>}
                    {p.notes && <p>{p.notes}</p>}
                    {p.disclaimer && (
                      <p className="fine-print">{p.disclaimer}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
          {!!s.fees?.length && (
            <section className="detail-section">
              <h2>Configured fee information</h2>
              {s.fees.map((f) => (
                <p key={f.label}>
                  <strong>{f.label}</strong> —{" "}
                  {f.amount_paise === null
                    ? "Contact for confirmed pricing"
                    : new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: f.currency,
                      }).format(f.amount_paise / 100)}
                  {f.notes && " · " + f.notes}
                </p>
              ))}
            </section>
          )}
          {!!s.faqs?.length && (
            <section className="detail-section">
              <h2>Frequently asked questions</h2>
              <Faqs items={s.faqs} />
            </section>
          )}
        </div>
        <aside className="detail-aside">
          <span className="eyebrow">YOUR NEXT STEP</span>
          <h3>
            Let’s discuss
            <br />
            your requirements.
          </h3>
          <p>
            Get current information on availability, eligibility, required
            documents, fees and processing before you proceed.
          </p>
          <a
            className="button primary"
            href={"tel:+" + site.settings.phone.replace(/\D/g, "")}
          >
            Call Global Link <Icon name="phone" size={18} />
          </a>
          <a className="text-link" href={"mailto:" + site.settings.email}>
            Send an email <Icon name="arrow" size={18} />
          </a>
          <p className="fine-print">
            No guaranteed approval, income or processing time is offered by this
            catalogue. Do not share Aadhaar, PAN or financial documents through
            this website.
          </p>
        </aside>
      </div>
      <Contact site={site} />
    </>
  );
}
export default function App() {
  const route = useLocation();
  return route.pathname.startsWith("/admin") ? (
    <Suspense fallback={<p role="status">Loading workspace…</p>}>
      <AdminApp />
    </Suspense>
  ) : (
    <PublicApp />
  );
}
function PublicApp() {
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => {
    const abort = new AbortController();
    getData<Site>("/site", abort.signal)
      .then(setSite)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    setMenu(false);
    if (location.hash) {
      requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      );
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const src = mediaSource(site?.settings.favicon);
    if (src) {
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.append(link);
      }
      link.href = src;
    } else {
      link?.remove();
    }
  }, [site?.settings.favicon]);
  if (!site)
    return (
      <main className="site-loading">
        <h1>Global Link Multiservice</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button
              className="button primary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </>
        ) : (
          <p role="status">Loading your next possibilities…</p>
        )}
      </main>
    );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="topbar">
        <div className="wrap">
          <span>Banking · Business · Technology · Marketing</span>
          <a href={"tel:+" + site.settings.phone.replace(/\D/g, "")}>
            Let’s connect: {site.settings.phone} <Icon name="arrow" size={14} />
          </a>
        </div>
      </div>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link to="/" aria-label={site.settings.company_name + " home"}>
            <Brand
              name={site.settings.company_name}
              logo={site.settings.logo}
              tagline={site.settings.tagline}
            />
          </Link>
          <button
            className="menu-button"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            aria-controls="main-navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? "✕" : "☰"}
          </button>
          <nav
            id="main-navigation"
            className={menu ? "navigation open" : "navigation"}
            aria-label="Main navigation"
          >
            <Link to="/">Home</Link>
            <Link to="/services">Services</Link>
            <Link to="/#about">About</Link>
            <Link to="/#why-us">Why us</Link>
            <Link to="/#faq">FAQ</Link>
            <Link to="/#contact">Contact</Link>
            <Link className="button primary small" to="/#contact">
              Get consultation <Icon name="arrow" size={16} />
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={<Home site={site} />} />
          <Route path="/services" element={<Catalogue site={site} />} />
          <Route path="/services/:slug" element={<Detail site={site} />} />
          <Route
            path="*"
            element={
              <section className="wrap section empty-state">
                <h1>Page not found</h1>
                <Link to="/">Return home</Link>
              </section>
            }
          />
        </Routes>
      </main>
      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <Link to="/">
              <Brand
                name={site.settings.company_name}
                logo={site.settings.footer_logo || site.settings.logo}
                tagline={site.settings.tagline}
              />
            </Link>
            <p>
              Business possibilities, connected.
              <br />
              Find your next step with Global Link.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            {site.categories.map((c) => (
              <Link key={c.slug} to={"/services?category=" + c.slug}>
                {c.name}
              </Link>
            ))}
          </div>
          <div>
            <h3>Let’s connect</h3>
            <a href={"tel:+" + site.settings.phone.replace(/\D/g, "")}>
              {site.settings.phone}
            </a>
            <a href={"mailto:" + site.settings.email}>{site.settings.email}</a>
            <Link to="/#contact">Contact the team ↗</Link>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>
            {site.settings.copyright ||
              `© ${new Date().getFullYear()} ${site.settings.company_name}`}
          </span>
          <p>{site.settings.footer}</p>
          <a href="#main">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}
