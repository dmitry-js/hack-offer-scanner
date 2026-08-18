export type HackOfferListJob = {
  id: string;
  posted_at: string;
  title: string;
  company: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  location: string | null;
  remote: string | null;
  grade: string | null;
  employment: string | null;
  specialization: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  relocation_to: string | null;
  skills: string[];
  lang: string | null;
  rating: number | null;
  description: string;
  created_at: string;
  slug: string;
};

export type HackOfferListResponse = {
  jobs: HackOfferListJob[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  category: string;
  entitled: boolean;
};

export type HackOfferDetailJob = HackOfferListJob & {
  raw_id: string | null;
  source_channel: string | null;
  source_url: string | null;
  salary_rub: number | null;
  contact: string | null;
  apply_url: string | null;
  dedup_key: string | null;
  status: string | null;
  source_text: string | null;
  source_html: string | null;
};

export type HackOfferDetailResponse = {
  job: HackOfferDetailJob;
  entitled: boolean;
};

export type ListVacancy = {
  id: string;
  title: string;
  company: string | null;
  postedAt: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  location: string | null;
  remote: string | null;
  grade: string | null;
  employment: string | null;
  specialization: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  relocationTo: string | null;
  skills: string[];
  language: string | null;
  sourceRating: number | null;
  description: string;
  createdAt: string | null;
  slug: string;
};

export type Vacancy = ListVacancy & {
  rawId: string | null;
  sourceChannel: string | null;
  sourceUrl: string | null;
  salaryRub: number | null;
  contact: string | null;
  applyUrl: string | null;
  dedupKey: string | null;
  status: string | null;
  descriptionSource: "source_text" | "description";
  relevanceScore: number;
  matchedSignals: string[];
};

export type RejectedVacancy = {
  id: string;
  title: string;
  reason: string;
};

export type CollectionResult = {
  rawCount: number;
  uniqueCount: number;
  prefilteredCount: number;
  detailPagesFetched: number;
  detailFailures: number;
  vacancies: Vacancy[];
  rejected: RejectedVacancy[];
};
