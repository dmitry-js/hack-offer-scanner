import { DETAIL_REQUEST_BUDGET } from "./config.js";
import { EntitlementError, AuthenticationError } from "./errors.js";
import { cheapPreFilter, rankListVacanciesForDetail } from "./filter.js";
import { normalizeListVacancy, normalizeVacancy } from "./normalize.js";
import type { HackOfferClient } from "./client.js";
import type {
  CollectionResult,
  HackOfferListJob,
  ListVacancy,
  RejectedVacancy,
  Vacancy,
} from "./types.js";

export type ProgressEvent =
  | { type: "page"; page: number; pages: number; count: number }
  | { type: "discovery"; raw: number; unique: number; prefiltered: number }
  | { type: "details"; completed: number; total: number }
  | { type: "rejected"; id: string; title: string; reason: string }
  | { type: "warning"; message: string };

export type ProgressHandler = (event: ProgressEvent) => void;

export async function fetchAllListVacancies(
  client: HackOfferClient,
  onProgress: ProgressHandler = () => undefined,
): Promise<HackOfferListJob[]> {
  const firstPage = await client.listVacancies(1);
  const pages = Number.isSafeInteger(firstPage.pages) && firstPage.pages > 0 ? firstPage.pages : 1;
  const jobs = [...firstPage.jobs];
  onProgress({ type: "page", page: 1, pages, count: firstPage.jobs.length });

  for (let page = 2; page <= pages; page += 1) {
    const response = await client.listVacancies(page);
    jobs.push(...response.jobs);
    onProgress({ type: "page", page, pages, count: response.jobs.length });
  }
  return jobs;
}

export async function collectVacancies(
  client: HackOfferClient,
  onProgress: ProgressHandler = () => undefined,
  detailBudget = DETAIL_REQUEST_BUDGET,
): Promise<CollectionResult> {
  const rawJobs = await fetchAllListVacancies(client, onProgress);
  const uniqueById = new Map<string, HackOfferListJob>();
  for (const job of rawJobs) {
    const id = String(job.id);
    if (!uniqueById.has(id)) uniqueById.set(id, job);
  }

  const listVacancies = [...uniqueById.values()].map(normalizeListVacancy);
  const eligible: ListVacancy[] = [];
  const rejected: RejectedVacancy[] = [];
  for (const vacancy of listVacancies) {
    const reason = cheapPreFilter(vacancy);
    if (reason) {
      const rejection = { id: vacancy.id, title: vacancy.title, reason };
      rejected.push(rejection);
      onProgress({ type: "rejected", ...rejection });
    } else {
      eligible.push(vacancy);
    }
  }

  onProgress({
    type: "discovery",
    raw: rawJobs.length,
    unique: listVacancies.length,
    prefiltered: rejected.length,
  });

  const ranked = rankListVacanciesForDetail(eligible);
  const limit = Math.min(ranked.length, Math.max(0, Math.floor(detailBudget)));
  const vacancies: Vacancy[] = [];
  let detailFailures = 0;

  for (let index = 0; index < limit; index += 1) {
    const candidate = ranked[index];
    if (!candidate) continue;
    try {
      const response = await client.getVacancy(candidate.id);
      vacancies.push(normalizeVacancy(response.job));
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof EntitlementError) throw error;
      detailFailures += 1;
      onProgress({
        type: "warning",
        message: `Could not fetch vacancy ${candidate.id}.`,
      });
    } finally {
      const completed = index + 1;
      if (completed % 10 === 0 || completed === limit) {
        onProgress({ type: "details", completed, total: limit });
      }
    }
  }

  return {
    rawCount: rawJobs.length,
    uniqueCount: listVacancies.length,
    prefilteredCount: rejected.length,
    detailPagesFetched: limit,
    detailFailures,
    vacancies,
    rejected,
  };
}
