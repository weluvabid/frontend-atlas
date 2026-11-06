import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const contentRoot = join(process.cwd(), 'src/content/questions');
const requiredSections = [
  '## Short answer',
  '## Reason from first principles',
  '## A concrete example',
  '## Boundary cases to reason through',
  '## Common misconception',
  '## Why this matters in production',
  '## Interviewer follow-ups',
  '## Further reading',
];

async function findMdxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return findMdxFiles(path);
      }

      return entry.isFile() && entry.name.endsWith('.mdx') ? [path] : [];
    }),
  );

  return nested.flat();
}

async function readQuestion(path) {
  const source = await readFile(path, 'utf8');
  const sections = source.split('---', 3);

  assert.equal(sections.length, 3, `${path} must have YAML frontmatter`);
  const metadata = {};

  for (const line of sections[1].trim().split('\n')) {
    const separator = line.indexOf(': ');

    assert.notEqual(separator, -1, `Invalid frontmatter line in ${path}: ${line}`);
    const key = line.slice(0, separator);
    const value = line.slice(separator + 2);

    metadata[key] = JSON.parse(value);
  }

  return { metadata, body: sections[2], path };
}

const questionFiles = await findMdxFiles(contentRoot);
const questions = await Promise.all(questionFiles.map(readQuestion));
const byId = new Map(questions.map(({ metadata }) => [metadata.id, metadata]));

test('the initial collection contains 40 questions across eight balanced domains', () => {
  assert.equal(questions.length, 40);
  const counts = new Map();

  for (const { metadata } of questions) {
    counts.set(metadata.domain, (counts.get(metadata.domain) ?? 0) + 1);
  }

  assert.equal(counts.size, 8);
  assert.ok([...counts.values()].every((count) => count === 5));
});

test('every question has valid metadata and the complete editorial structure', () => {
  const ids = questions.map(({ metadata }) => metadata.id);

  assert.equal(new Set(ids).size, questions.length);

  for (const { metadata, body, path } of questions) {
    assert.match(metadata.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u, `${path}: invalid id`);
    assert.ok(
      metadata.title.length >= 12 && metadata.title.length <= 120,
      `${path}: invalid title`,
    );
    assert.ok(
      metadata.summary.length >= 40 && metadata.summary.length <= 240,
      `${path}: invalid summary`,
    );
    assert.ok(
      ['foundation', 'intermediate', 'advanced'].includes(metadata.difficulty),
      `${path}: invalid difficulty`,
    );
    assert.ok(
      Number.isSafeInteger(metadata.minutes) && metadata.minutes >= 3 && metadata.minutes <= 45,
      `${path}: invalid reading time`,
    );
    assert.ok(
      Array.isArray(metadata.tags) && metadata.tags.length >= 1 && metadata.tags.length <= 8,
      `${path}: invalid tags`,
    );
    assert.equal(
      relative(contentRoot, path).split(/[\\/]/u)[0],
      metadata.domain,
      `${path}: domain/path mismatch`,
    );

    for (const section of requiredSections) {
      assert.ok(body.includes(section), `${path}: missing ${section}`);
    }

    assert.match(
      body,
      /\[[^\]]+\]\(https:\/\//u,
      `${path}: missing authoritative further reading link`,
    );
  }
});

test('all question relationships resolve and prerequisites form a DAG', () => {
  for (const { metadata } of questions) {
    for (const relation of [...metadata.prerequisites, ...metadata.related]) {
      assert.ok(byId.has(relation), `${metadata.id} references missing question ${relation}`);
      assert.notEqual(relation, metadata.id, `${metadata.id} references itself`);
    }
  }

  const visiting = new Set();
  const visited = new Set();

  function visit(id) {
    assert.ok(!visiting.has(id), `Prerequisite cycle detected at ${id}`);

    if (visited.has(id)) {
      return;
    }

    visiting.add(id);

    for (const prerequisite of byId.get(id).prerequisites) {
      visit(prerequisite);
    }

    visiting.delete(id);
    visited.add(id);
  }

  for (const id of byId.keys()) {
    visit(id);
  }
});
