import {
  MAX_VACANCIES_PER_COMPANY,
  MIN_RELEVANCE_SCORE,
  NEAR_DUPLICATE_DESCRIPTION_THRESHOLD,
  NEAR_DUPLICATE_TITLE_THRESHOLD,
  TARGET_COUNT,
} from "./config.js";
import type {
  ListVacancy,
  RejectedVacancy,
  Vacancy,
} from "./types.js";

export type FilterResult = {
  accepted: Vacancy[];
  rejected: RejectedVacancy[];
};

const FRONTEND_TERMS = [
  "frontend",
  "front-end",
  "front end",
  "фронтенд",
  "интерфейс",
  "react",
  "next.js",
  "nextjs",
] as const;

const IRRELEVANT_TITLE_TERMS = [
  "junior",
  "intern",
  "internship",
  "trainee",
  "стажер",
  "стажёр",
  "начинающ",
  "react native",
  "flutter",
  "android",
  "ios developer",
  "mobile developer",
  "мобильный разработчик",
  "qa engineer",
  "тестировщик",
  "devops",
  "data engineer",
  "data scientist",
  "ux designer",
  "ui designer",
  "wordpress",
  "bitrix",
  "битрикс",
] as const;

function normalizeText(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(text: string, rawTerm: string): boolean {
  const term = normalizeText(rawTerm);
  if (/^[a-z0-9]+(?:[ .+#-][a-z0-9]+)*$/i.test(term)) {
    const pattern = escapeRegExp(term).replace(/\\ /g, "\\s+");
    return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`, "i").test(text);
  }
  return text.includes(term);
}

function containsAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => containsTerm(text, term));
}

function listVacancyText(vacancy: ListVacancy): string {
  return normalizeText([
    vacancy.title,
    vacancy.description,
    vacancy.skills.join(" "),
    vacancy.grade ?? "",
    vacancy.specialization ?? "",
    vacancy.remote ?? "",
  ].join("\n"));
}

function fullVacancyText(vacancy: Vacancy): string {
  return normalizeText([
    vacancy.title,
    vacancy.description,
    vacancy.skills.join(" "),
    vacancy.grade ?? "",
    vacancy.specialization ?? "",
    vacancy.remote ?? "",
    vacancy.employment ?? "",
  ].join("\n"));
}

function hasReact(text: string): boolean {
  return containsAny(text, ["react", "react.js", "reactjs", "next.js", "nextjs"]);
}

/** Rejects only inexpensive, unmistakable mismatches before detail requests. */
export function cheapPreFilter(vacancy: ListVacancy): string | null {
  const title = normalizeText(vacancy.title);
  const text = listVacancyText(vacancy);
  const frontendTitle = containsAny(title, FRONTEND_TERMS);
  const react = hasReact(text);

  if (containsAny(title, IRRELEVANT_TITLE_TERMS)) return "clearly irrelevant title";
  if (containsAny(title, ["backend", "back-end", "back end"]) && !frontendTitle) {
    return "backend-primary title";
  }
  if (containsTerm(title, "angular") && !react) return "Angular-only stack";
  if (containsAny(title, ["vue", "vue.js", "vuejs", "nuxt", "nuxt.js"]) && !react) {
    return "Vue/Nuxt-only stack";
  }
  return null;
}

type DetailPriority = {
  vacancy: ListVacancy;
  score: number;
  timestamp: number;
  index: number;
};

export function sourceRatingBonus(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value >= 90) return 5;
  if (value >= 80) return 4;
  if (value >= 70) return 3;
  if (value >= 60) return 2;
  if (value >= 50) return 1;
  return 0;
}

export function scoreListVacancyForDetail(vacancy: ListVacancy): number {
  const title = normalizeText(vacancy.title);
  const text = listVacancyText(vacancy);
  let score = 0;
  if (containsAny(title, FRONTEND_TERMS)) score += 14;
  if (hasReact(text)) score += 12;
  if (containsAny(text, ["next.js", "nextjs"])) score += 8;
  if (containsTerm(text, "typescript")) score += 6;
  if (containsAny(title, ["senior", "senior+", "старш"])) score += 20;
  if (containsAny(title, ["lead", "tech lead", "principal", "staff", "ведущ", "тимлид"])) score += 18;
  if (containsAny(normalizeText(vacancy.grade ?? ""), ["senior", "lead", "старш", "ведущ"])) score += 20;
  if (containsTerm(normalizeText(vacancy.grade ?? ""), "middle")) score += 2;
  if (containsAny(normalizeText(vacancy.remote ?? ""), ["remote", "удален", "дистанцион"])) score += 5;
  if (containsAny(normalizeText(vacancy.remote ?? ""), ["hybrid", "гибрид"])) score += 3;
  score += sourceRatingBonus(vacancy.sourceRating);
  if (containsAny(title, ["fullstack", "full-stack", "full stack"])) score -= 8;
  return score;
}

export function rankListVacanciesForDetail(vacancies: readonly ListVacancy[]): ListVacancy[] {
  return vacancies
    .map<DetailPriority>((vacancy, index) => {
      const timestamp = Date.parse(vacancy.postedAt ?? "");
      return {
        vacancy,
        score: scoreListVacancyForDetail(vacancy),
        timestamp: Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY,
        index,
      };
    })
    .sort((left, right) =>
      right.score - left.score
      || right.timestamp - left.timestamp
      || left.index - right.index)
    .map(({ vacancy }) => vacancy);
}

function hasStrongSeniorityEvidence(title: string, text: string, grade: string): boolean {
  if (containsAny(title, [
    "senior",
    "senior+",
    "lead",
    "tech lead",
    "principal",
    "staff",
    "старш",
    "ведущ",
    "тимлид",
  ])) return true;
  if (containsAny(grade, ["senior", "lead", "старш", "ведущ"])) return true;

  const strongPatterns = [
    /(?:own|ownership|отвеча\w*|ответствен\w*|владен\w*|определя\w*|проектир\w*)[^.\n]{0,60}(?:frontend |front-end |фронтенд\w* |)?(?:architecture|архитектур)/,
    /(?:architecture|архитектур)[^.\n]{0,60}(?:ownership|отвеча\w*|ответствен\w*|владен\w*|определя\w*)/,
    /technical leadership|техническ\w* лидерств|лидировать техническ|руковод\w* команд\w* разработ/,
  ];
  if (strongPatterns.some((pattern) => pattern.test(text))) return true;

  const supportingPatterns = [
    /mentor(?:ing|ship)?|наставнич|ментор/,
    /code review|ревью код|провер\w* код/,
    /technical decisions?|техническ\w* решени|принима\w*[^.\n]{0,30}решени/,
    /design system|дизайн-систем/,
    /web performance|core web vitals|производительност/,
    /сложн\w*[^.\n]{0,30}(?:интерфейс|систем)|complex ui|enterprise ui|highload|высоконагруж/,
  ];
  return supportingPatterns.filter((pattern) => pattern.test(text)).length >= 2;
}

function seniorityRejectionReason(vacancy: Vacancy, title: string, text: string): string | null {
  const grade = normalizeText(vacancy.grade ?? "");
  if (
    containsAny(title, ["junior", "intern", "trainee", "стажер", "стажёр", "начинающ"])
    || containsAny(grade, ["junior", "intern", "стажер", "стажёр"])
    || /без опыта|опыт\w* не требуется|no experience(?: required)?/.test(text)
  ) return "junior/low-seniority role";

  const strong = hasStrongSeniorityEvidence(title, text, grade);
  if ((containsTerm(title, "middle") || containsTerm(grade, "middle")) && !strong) {
    return "ordinary Middle role without senior-level responsibilities";
  }
  if (!strong) return "insufficient seniority evidence";
  return null;
}

function frontendPrimaryRejectionReason(vacancy: Vacancy, title: string, text: string): string | null {
  const specialization = normalizeText(vacancy.specialization ?? "");
  const skills = normalizeText(vacancy.skills.join(" "));
  const frontendTitle = containsAny(title, FRONTEND_TERMS);
  const frontendStructured = containsAny(specialization, ["frontend", "front-end", "фронтенд"]);
  const react = hasReact(text);

  if (containsAny(title, IRRELEVANT_TITLE_TERMS)) return "clearly irrelevant title";
  if (containsAny(title, ["backend", "back-end", "back end"]) && !frontendTitle) {
    return "backend-primary title";
  }

  const angularSpecific = containsTerm(title, "angular") || containsTerm(skills, "angular");
  if (angularSpecific && !react) return "Angular-only stack";
  const vueSpecific = containsAny(title, ["vue", "vue.js", "vuejs", "nuxt", "nuxt.js"])
    || containsAny(skills, ["vue", "vue.js", "vuejs", "nuxt", "nuxt.js"]);
  if (vueSpecific && !react) return "Vue/Nuxt-only stack";

  if (!frontendTitle && !frontendStructured && !(react && /frontend|front-end|фронтенд|интерфейс/.test(text))) {
    return "frontend is not clearly a primary responsibility";
  }

  const fullStackTitle = containsAny(title, ["fullstack", "full-stack", "full stack"]);
  const explicitlyFrontendFocused = /frontend[- ]?(?:first|focused)|focus(?:ed)? on (?:the )?frontend|преимущественно frontend|основн\w*[^.\n]{0,30}(?:frontend|фронтенд)/.test(text);
  const backendMajorResponsibility = /production backend development|backend development|develop(?:ing|ment of)? (?:the )?backend|server[- ]side development|разработ\w*[^.\n]{0,40}(?:backend|back-end|бэкенд|серверн\w* част)|(?:backend|бэкенд)[^.\n]{0,40}(?:основн\w* задач|обязательн\w*|responsibilit)/.test(text);
  const backendTechnologyGroups = [
    /(^|[^a-z0-9])node(?:\.js|js)?($|[^a-z0-9])/,
    /postgres(?:ql)?|mysql|database development|проектирован\w* баз\w* данных/,
    /microservices?|микросервис/,
    /(^|[^a-z0-9])(?:java|golang|python|php|\.net)($|[^a-z0-9])/,
    /aws|amazon web services|cloud infrastructure|kubernetes/,
  ];
  const backendTechnologyCount = backendTechnologyGroups.filter((pattern) => pattern.test(text)).length;
  if (!explicitlyFrontendFocused && fullStackTitle && (backendMajorResponsibility || backendTechnologyCount >= 2)) {
    return "frontend is secondary to full-stack/backend responsibilities";
  }
  return null;
}

function workFormatRejectionReason(vacancy: Vacancy): string | null {
  const remote = normalizeText(vacancy.remote ?? "");
  const description = normalizeText(vacancy.description);
  if (containsAny(remote, ["remote", "hybrid", "удален", "дистанцион", "гибрид"])) return null;
  const officeOnly = containsAny(remote, ["office", "on-site", "onsite", "офис"])
    || /office[- ]only|on[- ]site only|только (?:из|в) офис|удален\w* формат не предусмотрен|no remote/.test(description);
  return officeOnly ? "office-only work format" : null;
}

function scoreVacancy(vacancy: Vacancy): Vacancy {
  const title = normalizeText(vacancy.title);
  const text = fullVacancyText(vacancy);
  const grade = normalizeText(vacancy.grade ?? "");
  const signals: string[] = [];
  let score = 0;
  const add = (points: number, label: string): void => {
    score += points;
    signals.push(`${points > 0 ? "+" : ""}${points} ${label}`);
  };

  if (containsAny(title, FRONTEND_TERMS)) add(14, "frontend title");
  if (containsAny(normalizeText(vacancy.specialization ?? ""), ["frontend", "front-end", "фронтенд"])) add(8, "frontend specialization");
  if (hasReact(text)) add(12, "React/Next.js");
  if (containsAny(text, ["next.js", "nextjs"])) add(8, "Next.js");
  if (containsTerm(text, "typescript")) add(7, "TypeScript");
  if (containsTerm(text, "javascript")) add(2, "JavaScript");
  if (containsAny(title, ["senior", "senior+", "старш"]) || containsAny(grade, ["senior", "старш"])) add(16, "Senior");
  if (containsAny(title, ["lead", "tech lead", "principal", "staff", "ведущ", "тимлид"]) || containsAny(grade, ["lead", "ведущ"])) add(14, "Lead");
  if (/frontend architecture|front-end architecture|архитектур[^.\n]{0,30}(?:фронтенд|интерфейс)/.test(text)) add(6, "frontend architecture");
  if (/technical ownership|ownership|техническ\w* лидерств|техническ\w* решени/.test(text)) add(5, "technical ownership");
  if (/complex ui|сложн\w*[^.\n]{0,25}интерфейс|enterprise ui/.test(text)) add(4, "complex UI");
  if (/web performance|core web vitals|оптимизац\w* производительност/.test(text)) add(4, "performance");
  if (/design system|дизайн-систем/.test(text)) add(3, "design systems");
  if (/redux|zustand|mobx|tanstack query|react query|state management/.test(text)) add(3, "state management");
  if (/unit test|integration test|e2e|jest|vitest|playwright|тестирован/.test(text)) add(3, "testing");
  if (/mentor(?:ing|ship)?|наставнич|ментор/.test(text)) add(3, "mentoring");
  if (/code review|ревью код/.test(text)) add(2, "code review");
  if (containsAny(normalizeText(vacancy.remote ?? ""), ["remote", "удален", "дистанцион"])) add(5, "remote");
  else if (containsAny(normalizeText(vacancy.remote ?? ""), ["hybrid", "гибрид"])) add(3, "hybrid");
  const ratingBonus = sourceRatingBonus(vacancy.sourceRating);
  if (ratingBonus > 0) add(ratingBonus, "Hack Offer rating");
  if (containsAny(title, ["fullstack", "full-stack", "full stack"])) add(-10, "full-stack title");
  if (containsTerm(title, "middle") || containsTerm(grade, "middle")) add(-5, "Middle grade/title");
  if (containsTerm(text, "angular") && !hasReact(text)) add(-10, "Angular without React");
  if (containsAny(text, ["vue", "vue.js", "vuejs", "nuxt"]) && !hasReact(text)) add(-10, "Vue/Nuxt without React");

  return {
    ...vacancy,
    relevanceScore: Math.max(0, Math.min(100, score)),
    matchedSignals: signals,
  };
}

function workFormatQuality(vacancy: Vacancy): number {
  const remote = normalizeText(vacancy.remote ?? "");
  if (containsAny(remote, ["remote", "удален", "дистанцион"])) return 2;
  if (containsAny(remote, ["hybrid", "гибрид"])) return 1;
  return 0;
}

function compareRanked(left: Vacancy, right: Vacancy): number {
  if (right.relevanceScore !== left.relevanceScore) return right.relevanceScore - left.relevanceScore;
  const formatDifference = workFormatQuality(right) - workFormatQuality(left);
  if (formatDifference !== 0) return formatDifference;
  const dateDifference = (right.postedAt ?? "").localeCompare(left.postedAt ?? "");
  return dateDifference || left.id.localeCompare(right.id);
}

function normalizedTokens(value: string): Set<string> {
  const normalized = normalizeText(value)
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/front[- ]?end/g, "frontend")
    .replace(/full[- ]?stack/g, "fullstack")
    .replace(/next[. ]?js/g, "nextjs")
    .replace(/react[. ]?js/g, "reactjs")
    .replace(/[^a-zа-я0-9+#]+/g, " ");
  return new Set(normalized.split(/\s+/).filter((token) => token.length > 1));
}

export function tokenJaccardSimilarity(left: string, right: string): number {
  const leftTokens = normalizedTokens(left);
  const rightTokens = normalizedTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return leftTokens.size === rightTokens.size ? 1 : 0;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  return intersection / (leftTokens.size + rightTokens.size - intersection);
}

function normalizedCompany(value: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeText(value)
    .replace(/(^|\s)(?:ооо|зао|оао|пао|llc|ltd)(?=\s|$)/g, " ")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}

function roleLevel(title: string): "lead" | "senior" | "other" {
  const normalized = normalizeText(title);
  if (containsAny(normalized, ["lead", "tech lead", "principal", "staff", "ведущ", "тимлид"])) return "lead";
  if (containsAny(normalized, ["senior", "senior+", "старш"])) return "senior";
  return "other";
}

function materiallyDifferentLevels(left: Vacancy, right: Vacancy): boolean {
  const levels = new Set([roleLevel(left.title), roleLevel(right.title)]);
  return levels.has("lead") && levels.has("senior");
}

function isNearDuplicate(left: Vacancy, right: Vacancy): boolean {
  if (materiallyDifferentLevels(left, right)) return false;
  if (left.dedupKey && right.dedupKey && left.dedupKey === right.dedupKey) return true;
  const leftCompany = normalizedCompany(left.company);
  const rightCompany = normalizedCompany(right.company);
  if (!leftCompany || leftCompany !== rightCompany) return false;
  return tokenJaccardSimilarity(left.title, right.title) >= NEAR_DUPLICATE_TITLE_THRESHOLD
    && tokenJaccardSimilarity(left.description, right.description) >= NEAR_DUPLICATE_DESCRIPTION_THRESHOLD;
}

function removeNearDuplicates(ranked: readonly Vacancy[]): FilterResult {
  const accepted: Vacancy[] = [];
  const rejected: RejectedVacancy[] = [];
  for (const vacancy of ranked) {
    const duplicateOf = accepted.find((candidate) => isNearDuplicate(vacancy, candidate));
    if (duplicateOf) {
      rejected.push({
        id: vacancy.id,
        title: vacancy.title,
        reason: `near-duplicate of vacancy ${duplicateOf.id}`,
      });
    } else {
      accepted.push(vacancy);
    }
  }
  return { accepted, rejected };
}

export function filterAndRank(vacancies: readonly Vacancy[]): FilterResult {
  const accepted: Vacancy[] = [];
  const rejected: RejectedVacancy[] = [];

  for (const vacancy of vacancies) {
    const title = normalizeText(vacancy.title);
    const text = fullVacancyText(vacancy);
    const reason = seniorityRejectionReason(vacancy, title, text)
      ?? frontendPrimaryRejectionReason(vacancy, title, text)
      ?? workFormatRejectionReason(vacancy);
    if (reason) {
      rejected.push({ id: vacancy.id, title: vacancy.title, reason });
      continue;
    }

    const scored = scoreVacancy(vacancy);
    if (scored.relevanceScore < MIN_RELEVANCE_SCORE) {
      rejected.push({
        id: vacancy.id,
        title: vacancy.title,
        reason: `relevance score ${scored.relevanceScore} is below ${MIN_RELEVANCE_SCORE}`,
      });
    } else {
      accepted.push(scored);
    }
  }

  accepted.sort(compareRanked);
  const deduplicated = removeNearDuplicates(accepted);
  return { accepted: deduplicated.accepted, rejected: [...rejected, ...deduplicated.rejected] };
}

function companyKey(vacancy: Vacancy): string {
  return normalizedCompany(vacancy.company) ?? `unknown:${vacancy.id}`;
}

export function selectDiverseVacancies(
  rankedVacancies: readonly Vacancy[],
  targetCount = TARGET_COUNT,
): Vacancy[] {
  const selected: Vacancy[] = [];
  const selectedIds = new Set<string>();
  const companyCounts = new Map<string, number>();

  for (const vacancy of rankedVacancies) {
    if (selected.length >= targetCount) break;
    const key = companyKey(vacancy);
    const count = companyCounts.get(key) ?? 0;
    if (count >= MAX_VACANCIES_PER_COMPANY) continue;
    selected.push(vacancy);
    selectedIds.add(vacancy.id);
    companyCounts.set(key, count + 1);
  }

  for (const vacancy of rankedVacancies) {
    if (selected.length >= targetCount) break;
    if (selectedIds.has(vacancy.id)) continue;
    selected.push(vacancy);
    selectedIds.add(vacancy.id);
  }
  return selected;
}
