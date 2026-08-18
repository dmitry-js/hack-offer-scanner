import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Vacancy } from "./types.js";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 })
    .format(value)
    .replace(/\u00a0/g, " ");
}

export function formatSalary(
  vacancy: Pick<Vacancy, "salaryMin" | "salaryMax" | "currency" | "salaryRub">,
): string {
  if (vacancy.salaryMin === null && vacancy.salaryMax === null) {
    return vacancy.salaryRub === null ? "not specified" : `${formatNumber(vacancy.salaryRub)} ₽`;
  }
  const currency = vacancy.currency === "RUB" || vacancy.currency === "RUR"
    ? "₽"
    : (vacancy.currency ?? "");
  const suffix = currency ? ` ${currency}` : "";
  if (vacancy.salaryMin !== null && vacancy.salaryMax !== null) {
    return `${formatNumber(vacancy.salaryMin)} – ${formatNumber(vacancy.salaryMax)}${suffix}`;
  }
  if (vacancy.salaryMin !== null) return `от ${formatNumber(vacancy.salaryMin)}${suffix}`;
  return `до ${formatNumber(vacancy.salaryMax as number)}${suffix}`;
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(value: string | null): string {
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "not specified";
}

function sourceLabel(vacancy: Vacancy): string {
  if (vacancy.sourceChannel) return `[Telegram] ${oneLine(vacancy.sourceChannel)}`;
  return "[Hack Offer] hack-offer.tech";
}

export function formatVacanciesMarkdown(vacancies: readonly Vacancy[]): string {
  const sections = vacancies.map((vacancy, index) => {
    const number = String(index + 1).padStart(2, "0");
    const skills = vacancy.skills.map((skill) => `- ${skill}`).join("\n");
    const url = vacancy.sourceUrl ?? vacancy.applyUrl ?? "not specified";
    const description = vacancy.description || "not specified";
    return `# ${number}. ${oneLine(vacancy.title)}

Source: ${sourceLabel(vacancy)}
Компания: ${vacancy.company ?? "not specified"}
Релевантность: ${vacancy.relevanceScore}/100
Рейтинг Hack Offer: ${vacancy.sourceRating === null ? "not specified" : `${vacancy.sourceRating}/100`}
URL: ${url}
Date: ${formatDate(vacancy.postedAt ?? vacancy.createdAt)}
Salary: ${formatSalary(vacancy)}
Оформление: ${vacancy.employment ?? "not specified"}
Формат работы: ${vacancy.remote ?? "not specified"}

## Description

${description}

## Ключевые навыки

${skills}`;
  });
  return sections.length > 0 ? `${sections.join("\n\n---\n\n")}\n` : "";
}

export function formatVacanciesJson(vacancies: readonly Vacancy[]): string {
  return `${JSON.stringify(vacancies, null, 2)}\n`;
}

export async function writeOutputs(
  vacancies: readonly Vacancy[],
  cwd = process.cwd(),
): Promise<{ markdownPath: string; jsonPath: string }> {
  const outputDirectory = resolve(cwd, "output");
  const markdownPath = resolve(outputDirectory, "vacancies.md");
  const jsonPath = resolve(outputDirectory, "vacancies.json");
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(markdownPath, formatVacanciesMarkdown(vacancies), "utf8"),
    writeFile(jsonPath, formatVacanciesJson(vacancies), "utf8"),
  ]);
  return { markdownPath, jsonPath };
}
