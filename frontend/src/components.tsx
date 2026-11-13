import { Link } from "react-router-dom";
import type { Service } from "./api";
import { useState } from "react";
import content from "./service-content.json";
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
          width={48}
          height={48}
          decoding="async"
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
export function ServiceCard({
  service,
  heading: Heading = "h3",
}: {
  service: Service;
  heading?: "h2" | "h3";
}) {
  return (
    <article className="service-card">
      <Artwork
        slug={service.slug}
        custom={service.hero_image}
        iconPath={service.icon_path}
        alt={service.title}
        icon={service.icon}
      />
      <div className="service-card-body">
        <span className="service-category">{service.category.name}</span>
        <Heading>
          <Link to={"/services/" + service.slug}>{service.title}</Link>
        </Heading>
        <p>{service.short_description}</p>
        <Link className="text-link" to={"/services/" + service.slug}>
          Learn more <Icon name="arrow" size={18} />
          <span className="sr-only"> for {service.title}</span>
        </Link>
      </div>
    </article>
  );
}

export const serviceContent: Record<
  string,
  { alt: string; audience: string; topics: string }
> = content;
const artwork = import.meta.glob<string>("./artwork/*.webp", {
  eager: true,
  import: "default",
  query: "?url&no-inline",
});

export function Artwork({
  slug,
  alt,
  custom,
  icon,
  iconPath,
  priority = false,
}: {
  slug: string;
  alt: string;
  custom?: string | null;
  icon?: string;
  iconPath?: string | null;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = [
    mediaSource(custom),
    artwork[`./artwork/${slug}.webp`],
    mediaSource(iconPath),
  ].find((url) => url && !failed.includes(url));
  return (
    <div className="artwork">
      {source ? (
        <img
          src={source}
          className={source === iconPath ? "artwork-icon" : undefined}
          alt={
            source === custom || source === iconPath
              ? alt
              : serviceContent[slug]?.alt || alt
          }
          width={720}
          height={450}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          onError={() => setFailed((sources) => [...sources, source])}
        />
      ) : (
        <Icon name={icon} size={64} />
      )}
    </div>
  );
}
