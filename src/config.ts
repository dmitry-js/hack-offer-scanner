export const HACK_OFFER_BASE_URL = "https://hack-offer.tech";
export const TARGET_COUNT = 30;
export const DETAIL_REQUEST_BUDGET = 40;
export const REQUEST_TIMEOUT_MS = 20_000;
export const MAX_VACANCIES_PER_COMPANY = 2;
export const MIN_RELEVANCE_SCORE = 35;
export const NEAR_DUPLICATE_TITLE_THRESHOLD = 0.72;
export const NEAR_DUPLICATE_DESCRIPTION_THRESHOLD = 0.82;

export const LIST_FILTERS = {
  spec: "frontend",
  remote: "hybrid,remote",
  grade: "senior,middle",
} as const;

export function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
