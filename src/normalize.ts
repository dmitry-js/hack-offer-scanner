import type {
  HackOfferDetailJob,
  HackOfferListJob,
  ListVacancy,
  Vacancy,
} from "./types.js";

function nullableText(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function skills(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((skill) => {
    if (typeof skill !== "string" || !skill.trim()) return false;
    const key = skill.toLocaleLowerCase("ru-RU");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeListVacancy(job: HackOfferListJob): ListVacancy {
  return {
    id: String(job.id),
    title: job.title,
    company: nullableText(job.company),
    postedAt: nullableText(job.posted_at),
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
    currency: nullableText(job.currency),
    location: nullableText(job.location),
    remote: nullableText(job.remote),
    grade: nullableText(job.grade),
    employment: nullableText(job.employment),
    specialization: nullableText(job.specialization),
    industry: nullableText(job.industry),
    country: nullableText(job.country),
    city: nullableText(job.city),
    relocationTo: nullableText(job.relocation_to),
    skills: skills(job.skills),
    language: nullableText(job.lang),
    sourceRating: job.rating ?? null,
    description: job.description ?? "",
    createdAt: nullableText(job.created_at),
    slug: job.slug ?? "",
  };
}

export function normalizeVacancy(job: HackOfferDetailJob): Vacancy {
  const listVacancy = normalizeListVacancy(job);
  const hasSourceText = typeof job.source_text === "string" && job.source_text.trim().length > 0;
  return {
    ...listVacancy,
    rawId: nullableText(job.raw_id),
    sourceChannel: nullableText(job.source_channel),
    sourceUrl: nullableText(job.source_url),
    salaryRub: job.salary_rub ?? null,
    contact: nullableText(job.contact),
    applyUrl: nullableText(job.apply_url),
    dedupKey: nullableText(job.dedup_key),
    status: nullableText(job.status),
    description: hasSourceText ? (job.source_text as string) : (job.description ?? ""),
    descriptionSource: hasSourceText ? "source_text" : "description",
    relevanceScore: 0,
    matchedSignals: [],
  };
}
