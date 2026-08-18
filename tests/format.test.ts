import assert from "node:assert/strict";
import test from "node:test";
import { formatVacanciesJson, formatVacanciesMarkdown } from "../src/format.js";
import { vacancy } from "./fixtures.js";

test("formats exact titles, zero-padded numbering, source metadata, and missing fields", () => {
  const result = formatVacanciesMarkdown([
    vacancy("1", {
      title: "Старший разработчик интерфейсов",
      company: null,
      salaryMin: null,
      salaryMax: null,
      employment: null,
      remote: "hybrid",
      relevanceScore: 70,
      sourceRating: 80,
    }),
    vacancy("2", { title: "Senior Frontend Engineer" }),
  ]);

  assert.match(result, /^# 01\. Старший разработчик интерфейсов/m);
  assert.match(result, /^# 02\. Senior Frontend Engineer/m);
  assert.match(result, /Source: \[Telegram\] job_react/);
  assert.match(result, /Компания: not specified/);
  assert.match(result, /Релевантность: 70\/100/);
  assert.match(result, /Рейтинг Hack Offer: 80\/100/);
  assert.match(result, /Рейтинг Hack Offer: not specified/);
  assert.match(result, /Salary: not specified/);
  assert.match(result, /Оформление: not specified/);
  assert.match(result, /Формат работы: hybrid/);
});

test("preserves the complete source description and only supplied skills", () => {
  const tail = `TAIL-${"x".repeat(12_000)}`;
  const description = `Original post\n\n- responsibility\n${tail}`;
  const result = formatVacanciesMarkdown([vacancy("long", {
    description,
    skills: ["React", "TypeScript", "BFF"],
  })]);
  assert.ok(result.includes(description));
  assert.ok(result.includes("- React\n- TypeScript\n- BFF"));
  assert.ok(result.includes(tail));
});

test("uses the normalized ruble salary when an original range is unavailable", () => {
  const result = formatVacanciesMarkdown([vacancy("salary", {
    salaryMin: null,
    salaryMax: null,
    currency: null,
    salaryRub: 350_000,
  })]);
  assert.match(result, /Salary: 350 000 ₽/);
});

test("the authentication token never appears in generated Markdown or JSON", () => {
  const token = "eyJ-secret-token-never-export";
  const selected = [vacancy("safe", {
    matchedSignals: ["+12 React/Next.js"],
    relevanceScore: 55,
  })];
  const markdown = formatVacanciesMarkdown(selected);
  const json = formatVacanciesJson(selected);
  assert.doesNotMatch(markdown, new RegExp(token));
  assert.doesNotMatch(json, new RegExp(token));
  assert.match(json, /"relevanceScore": 55/);
  assert.match(json, /"matchedSignals"/);
});
