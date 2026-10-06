import { Link } from "react-router-dom";
import type { Service } from "./api";
export function Icon({
  name = "spark",
  size = 24,
}: {
  name?: string;
  size?: number;
}) {
  const shapes: Record<string, React.ReactNode> = {
    bank: (
      <>
        <path d="m3 9 9-6 9 6M3 9h18M4 21h16M6 10v8m6-8v8m6-8v8" />
      </>
    ),
    code: (
      <>
        <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 20" />
      </>
    ),
    growth: (
      <>
        <path d="M3 18 9 12l4 3 8-11m-6 0h6v6" />
      </>
    ),
    business: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="3" />
        <path d="M8 7V4h8v3M3 12h18m-9 0v3" />
      </>
    ),
    payments: (
      <>
        <rect x="2" y="5" width="20" height="15" rx="3" />
        <path d="M2 10h20M6 15h4m5 0h3" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4 10-10" />,
    phone: <path d="M6 3 3 6c-1 5 10 16 15 15l3-3-5-4-3 3-6-6 3-3-4-5Z" />,
    spark: (
      <>
        <path d="m12 2 2 7 7 3-7 3-2 7-3-7-7-3 7-3 3-7Z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name] ?? shapes.spark}
    </svg>
  );
}
export function mediaSource(value?: string | null) {
  return value && /^\/api\/media\/[a-f0-9-]{36}$/.test(value)
    ? value
    : undefined;
}
export function Brand({
  name,
  logo,
  tagline,
}: {
  name: string;
  logo?: string;
  tagline?: string;
}) {
  return (
    <span className="brand">
      {mediaSource(logo) ? (
        <img
          className="brand-logo"
          src={mediaSource(logo)}
          alt={name + " logo"}
        />
      ) : (
        <span
          className="brand-mark"
          aria-hidden="true"
          title="Temporary GL placeholder"
        >
          <svg viewBox="0 0 40 40">
            <path d="M28 10H17a11 11 0 1 0 0 22h11V21H18" />
            <path d="M23 8v13h12" />
          </svg>
        </span>
      )}
      <span>
        <strong>{name}</strong>
        <small>{tagline || "BUSINESS POSSIBILITIES, CONNECTED"}</small>
      </span>
    </span>
  );
}
export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="service-card">
      <span className="icon-tile">
        {mediaSource(service.icon_path) ? (
          <img
            className="service-icon-image"
            src={mediaSource(service.icon_path)}
            alt=""
          />
        ) : (
          <Icon name={service.icon} size={27} />
        )}
      </span>
      <span className="service-category">{service.category.name}</span>
      <h3>
        <Link to={"/services/" + service.slug}>{service.title}</Link>
      </h3>
      <p>{service.short_description}</p>
      <Link className="text-link" to={"/services/" + service.slug}>
        View details <Icon name="arrow" size={18} />
        <span className="sr-only"> for {service.title}</span>
      </Link>
    </article>
  );
}
export function Ecosystem() {
  return (
    <div
      className="ecosystem"
      aria-label="Banking, software, business and marketing connected through Global Link"
      role="img"
    >
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="orbit orbit-three" />
      <div className="orbit-core">
        <span>
          G<span>L</span>
        </span>
        <small>
          ONE CONNECTION.
          <br />
          MORE POSSIBILITIES.
        </small>
      </div>
      <div className="orbit-node node-bank">
        <Icon name="bank" />
        <strong>Banking & finance</strong>
        <small>Explore new avenues</small>
      </div>
      <div className="orbit-node node-code">
        <Icon name="code" />
        <strong>Software & IT</strong>
        <small>Build your digital future</small>
      </div>
      <div className="orbit-node node-growth">
        <Icon name="growth" />
        <strong>Digital marketing</strong>
        <small>Make your brand seen</small>
      </div>
      <div className="orbit-node node-business">
        <Icon name="business" />
        <strong>Business opportunities</strong>
        <small>Take your next step</small>
      </div>
      <span className="orbit-dot dot-one" />
      <span className="orbit-dot dot-two" />
    </div>
  );
}
