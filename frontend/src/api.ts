export type Category = {
  id: number;
  name: string;
  slug: string;
  summary: string;
  icon: string;
  seo_title?: string | null;
  seo_description?: string | null;
};
export type Item = {
  kind: string;
  label: string;
  body: string | null;
  is_required?: boolean | number;
};
export type Service = {
  id: number;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  icon: string;
  hero_image: string | null;
  icon_path?: string | null;
  cta_text?: string;
  featured: boolean;
  category: Category;
  sections?: { title: string; body: string }[];
  items?: Item[];
  fees?: {
    label: string;
    amount_paise: number | null;
    currency: string;
    notes: string | null;
  }[];
  providers?: {
    name: string;
    logo_path?: string | null;
    notes?: string | null;
    disclaimer?: string | null;
    description: string | null;
    eligibility: string[];
    documents: string[];
    fee_information: string | null;
    processing_notes: string | null;
  }[];
  faqs?: Faq[];
  seo_title: string | null;
  seo_description: string | null;
};
export type Faq = { question: string; answer: string };
export type Site = {
  public_url?: string;
  settings: Record<string, string>;
  categories: Category[];
  faqs: Faq[];
};
export async function getData<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api" + path, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "This service is not available."
        : "We could not load the service information. Please try again.",
    );
  const json = await response.json();
  return json.data as T;
}
