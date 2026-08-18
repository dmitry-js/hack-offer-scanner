import type {
  HackOfferDetailJob,
  HackOfferListJob,
  Vacancy,
} from "../src/types.js";

export function listJob(id: string, overrides: Partial<HackOfferListJob> = {}): HackOfferListJob {
  return {
    id,
    posted_at: "2026-08-17T12:00:00+03:00",
    title: "Senior Frontend Developer",
    company: `Company ${id}`,
    salary_min: null,
    salary_max: null,
    currency: null,
    location: null,
    remote: "remote",
    grade: "senior",
    employment: "full-time",
    specialization: "frontend",
    industry: null,
    country: null,
    city: null,
    relocation_to: null,
    skills: ["React", "TypeScript"],
    lang: null,
    rating: null,
    description: "Short list description",
    created_at: "2026-08-17T12:00:00+03:00",
    slug: `senior-frontend-${id}`,
    ...overrides,
  };
}

export function detailJob(id: string, overrides: Partial<HackOfferDetailJob> = {}): HackOfferDetailJob {
  return {
    ...listJob(id),
    raw_id: null,
    source_channel: "job_react",
    source_url: `https://t.me/job_react/${id}`,
    salary_rub: null,
    contact: null,
    apply_url: null,
    dedup_key: null,
    status: "active",
    source_text: "React TypeScript frontend architecture and complex UI.",
    source_html: null,
    ...overrides,
  };
}

export function vacancy(id: string, overrides: Partial<Vacancy> = {}): Vacancy {
  return {
    id,
    title: "Senior Frontend Developer",
    company: `Company ${id}`,
    postedAt: "2026-08-17T12:00:00+03:00",
    salaryMin: null,
    salaryMax: null,
    currency: null,
    location: null,
    remote: "remote",
    grade: "senior",
    employment: "full-time",
    specialization: "frontend",
    industry: null,
    country: null,
    city: null,
    relocationTo: null,
    skills: ["React", "TypeScript"],
    language: null,
    sourceRating: null,
    description: "React TypeScript frontend architecture and complex UI. You will build and maintain customer-facing web products, collaborate with product managers and designers, clarify requirements, deliver reliable features, investigate defects, document implementation details, and support releases across the product lifecycle.",
    createdAt: "2026-08-17T12:00:00+03:00",
    slug: `senior-frontend-${id}`,
    rawId: null,
    sourceChannel: "job_react",
    sourceUrl: `https://t.me/job_react/${id}`,
    salaryRub: null,
    contact: null,
    applyUrl: null,
    dedupKey: null,
    status: "active",
    descriptionSource: "source_text",
    relevanceScore: 0,
    matchedSignals: [],
    ...overrides,
  };
}
