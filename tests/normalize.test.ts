import assert from "node:assert/strict";
import test from "node:test";
import { normalizeListVacancy, normalizeVacancy } from "../src/normalize.js";
import { detailJob, listJob } from "./fixtures.js";

test("normalizes structured list fields without inventing skills", () => {
  const normalized = normalizeListVacancy(listJob("42", {
    company: "Example",
    salary_min: 300_000,
    salary_max: 450_000,
    currency: "RUB",
    country: "RU",
    city: "Москва",
    skills: ["React", "TypeScript", "React"],
  }));

  assert.equal(normalized.id, "42");
  assert.equal(normalized.company, "Example");
  assert.equal(normalized.salaryMin, 300_000);
  assert.equal(normalized.salaryMax, 450_000);
  assert.equal(normalized.currency, "RUB");
  assert.equal(normalized.country, "RU");
  assert.equal(normalized.city, "Москва");
  assert.deepEqual(normalized.skills, ["React", "TypeScript"]);
});

test("uses full source_text first and falls back to description", () => {
  const fullSource = "Original Telegram post\n\n- React\n- TypeScript";
  const fromSource = normalizeVacancy(detailJob("source", {
    source_text: fullSource,
    description: "Short description",
  }));
  const fromDescription = normalizeVacancy(detailJob("fallback", {
    source_text: null,
    description: "Complete fallback description",
  }));

  assert.equal(fromSource.description, fullSource);
  assert.equal(fromSource.descriptionSource, "source_text");
  assert.equal(fromDescription.description, "Complete fallback description");
  assert.equal(fromDescription.descriptionSource, "description");
});
