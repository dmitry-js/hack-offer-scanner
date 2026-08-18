import assert from "node:assert/strict";
import test from "node:test";
import {
  filterAndRank,
  scoreListVacancyForDetail,
  selectDiverseVacancies,
  sourceRatingBonus,
} from "../src/filter.js";
import { vacancy } from "./fixtures.js";

test("keeps a relevant Senior React vacancy and exposes debug score signals", () => {
  const result = filterAndRank([vacancy("good")]);
  assert.deepEqual(result.accepted.map((item) => item.id), ["good"]);
  assert.ok((result.accepted[0]?.relevanceScore ?? 0) >= 35);
  assert.ok(result.accepted[0]?.matchedSignals.some((signal) => signal.includes("React")));
});

test("maps Hack Offer ratings to increasing bonuses in both scoring stages", () => {
  const cases = [
    [40, 0],
    [50, 1],
    [70, 3],
    [80, 4],
    [90, 5],
  ] as const;
  assert.equal(sourceRatingBonus(null), 0);
  assert.equal(sourceRatingBonus(Number.NaN), 0);
  assert.equal(sourceRatingBonus(Number.POSITIVE_INFINITY), 0);
  assert.equal(sourceRatingBonus("90"), 0);

  const listBaseline = scoreListVacancyForDetail(vacancy("list-baseline", { sourceRating: null }));
  const finalBaseline = filterAndRank([vacancy("final-baseline", { sourceRating: null })])
    .accepted[0]?.relevanceScore;
  assert.notEqual(finalBaseline, undefined);

  for (const [rating, expectedBonus] of cases) {
    assert.equal(sourceRatingBonus(rating), expectedBonus);
    assert.equal(
      scoreListVacancyForDetail(vacancy(`list-${rating}`, { sourceRating: rating })) - listBaseline,
      expectedBonus,
    );
    const finalScore = filterAndRank([vacancy(`final-${rating}`, { sourceRating: rating })])
      .accepted[0]?.relevanceScore;
    assert.equal((finalScore as number) - (finalBaseline as number), expectedBonus);
  }
});

test("rejects an ordinary weak Middle vacancy", () => {
  const result = filterAndRank([vacancy("middle", {
    title: "Middle Frontend Developer",
    grade: "middle",
    description: "Implement React components from prepared designs and specifications.",
  })]);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected[0]?.reason, "ordinary Middle role without senior-level responsibilities");
});

test("retains a strong Middle+/Senior-adjacent vacancy", () => {
  const result = filterAndRank([vacancy("strong-middle", {
    title: "Middle+ Frontend Developer",
    grade: "middle",
    description: "Own frontend architecture and technical decisions. Mentor engineers and conduct code review. React and TypeScript.",
  })]);
  assert.deepEqual(result.accepted.map((item) => item.id), ["strong-middle"]);
});

test("rejects Angular-only and Vue/Nuxt-only vacancies", () => {
  const result = filterAndRank([
    vacancy("angular", {
      title: "Senior Angular Frontend Developer",
      skills: ["Angular", "TypeScript"],
      description: "Build Angular applications and own frontend architecture.",
    }),
    vacancy("vue", {
      title: "Senior Vue/Nuxt Frontend Developer",
      skills: ["Vue", "Nuxt", "TypeScript"],
      description: "Build Vue and Nuxt applications and own frontend architecture.",
    }),
  ]);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected.find((item) => item.id === "angular")?.reason, "Angular-only stack");
  assert.equal(result.rejected.find((item) => item.id === "vue")?.reason, "Vue/Nuxt-only stack");
});

test("retains frontend Node.js/BFF literacy but rejects a backend-heavy full-stack role", () => {
  const result = filterAndRank([
    vacancy("frontend-lead", {
      title: "Frontend Tech Lead",
      description: "Own frontend architecture, mentor the React team, and review code. Understand the Node.js BFF and collaborate with backend engineers.",
      skills: ["React", "TypeScript", "Node.js", "BFF"],
    }),
    vacancy("fullstack", {
      title: "Senior Full-Stack Engineer",
      description: "Production backend development is a mandatory responsibility using Node.js, PostgreSQL, AWS, and microservices. Also build React frontend features.",
      skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"],
    }),
  ]);
  assert.deepEqual(result.accepted.map((item) => item.id), ["frontend-lead"]);
  assert.equal(
    result.rejected.find((item) => item.id === "fullstack")?.reason,
    "frontend is secondary to full-stack/backend responsibilities",
  );
});

const duplicateDescription = [
  "Own frontend architecture for an enterprise analytics platform.",
  "Build complex React and TypeScript interfaces, make technical decisions, mentor engineers, and conduct code review.",
  "Improve web performance and maintain the design system.",
].join(" ");

test("removes same-company near-duplicates and dedup_key matches", () => {
  const result = filterAndRank([
    vacancy("older", {
      company: "Example LLC",
      postedAt: "2026-08-16T12:00:00+03:00",
      description: duplicateDescription,
    }),
    vacancy("newer", {
      company: "Example",
      postedAt: "2026-08-18T12:00:00+03:00",
      description: `${duplicateDescription} https://example.test/jobs`,
    }),
    vacancy("key-copy", {
      company: "Another",
      dedupKey: "same-key",
      description: duplicateDescription,
    }),
    vacancy("key-copy-newer", {
      company: "Another renamed",
      dedupKey: "same-key",
      postedAt: "2026-08-18T13:00:00+03:00",
      description: duplicateDescription,
    }),
  ]);

  assert.deepEqual(new Set(result.accepted.map((item) => item.id)), new Set(["newer", "key-copy-newer"]));
  assert.equal(result.rejected.length, 2);
});

test("does not collapse genuinely different Senior and Lead roles", () => {
  const result = filterAndRank([
    vacancy("senior", {
      title: "Senior Frontend Developer",
      company: "Same Company",
      dedupKey: "shared",
      description: duplicateDescription,
    }),
    vacancy("lead", {
      title: "Frontend Tech Lead",
      company: "Same Company",
      dedupKey: "shared",
      description: duplicateDescription,
    }),
  ]);
  assert.deepEqual(new Set(result.accepted.map((item) => item.id)), new Set(["senior", "lead"]));
});

test("prefers company diversity and allows fewer than the target count", () => {
  const ranked = [
    vacancy("a1", { company: "A", relevanceScore: 60 }),
    vacancy("a2", { company: "A", relevanceScore: 59 }),
    vacancy("a3", { company: "A", relevanceScore: 58 }),
    vacancy("b1", { company: "B", relevanceScore: 50 }),
    vacancy("c1", { company: "C", relevanceScore: 40 }),
  ];
  assert.deepEqual(selectDiverseVacancies(ranked, 4).map((item) => item.id), ["a1", "a2", "b1", "c1"]);

  const filtering = filterAndRank([
    vacancy("only-good"),
    vacancy("weak", {
      title: "Middle Frontend Developer",
      grade: "middle",
      description: "Implement components from specifications.",
    }),
  ]);
  assert.deepEqual(selectDiverseVacancies(filtering.accepted, 30).map((item) => item.id), ["only-good"]);
});
