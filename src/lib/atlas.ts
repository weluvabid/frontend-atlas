import { MAX_QUESTION_COUNT } from '../data/question-manifest.ts';

export const DOMAIN_IDS = [
  'javascript-typescript',
  'browser-web-platform',
  'css-rendering',
  'frameworks-ui-architecture',
  'ui-engineering',
  'performance-reliability',
  'frontend-system-design',
  'accessibility-security-testing',
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];
export type Difficulty = 'foundation' | 'intermediate' | 'advanced';

export interface QuestionSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly domain: DomainId;
  readonly summary: string;
  readonly difficulty: Difficulty;
  readonly minutes: number;
  readonly tags: readonly string[];
  readonly prerequisites: readonly string[];
  readonly related: readonly string[];
  readonly featured: boolean;
}

export interface SearchDocument extends QuestionSummary {
  readonly searchableText: string;
}

/** Prefix an internal site path with Astro's configured deployment base. */
export function withBase(path: string, baseUrl = import.meta.env?.BASE_URL ?? '/'): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/iu.test(path)) {
    return path;
  }

  const base = baseUrl.replace(/\/+$/u, '');
  const pathname = `/${path.replace(/^\/+/, '')}`;
  return `${base}${pathname}` || '/';
}

/** Build the canonical question URL from its immutable content ID. */
export function questionHref(id: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new TypeError(`Invalid question id for URL: ${id}`);
  }

  return withBase(`/questions/${id}/`);
}

const difficultyOrder: Record<Difficulty, number> = {
  foundation: 0,
  intermediate: 1,
  advanced: 2,
};

/** Return a deterministic reading order for questions within one domain. */
export function orderDomainQuestions(questions: readonly QuestionSummary[]): QuestionSummary[] {
  return [...questions].sort(
    (left, right) =>
      difficultyOrder[left.difficulty] - difficultyOrder[right.difficulty] ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
}

export function validateQuestionGraph(questions: readonly QuestionSummary[]): void {
  if (questions.length > MAX_QUESTION_COUNT) throw new RangeError(`Frontend Atlas cannot contain more than ${MAX_QUESTION_COUNT} questions`);
  const byId = new Map<string, QuestionSummary>();

  for (const question of questions) {
    if (byId.has(question.id)) {
      throw new Error(`Duplicate question id: ${question.id}`);
    }

    byId.set(question.id, question);
  }

  for (const question of questions) {
    for (const relation of [...question.prerequisites, ...question.related]) {
      if (!byId.has(relation)) {
        throw new Error(`Question "${question.id}" references unknown question "${relation}"`);
      }

      if (relation === question.id) {
        throw new Error(`Question "${question.id}" cannot reference itself`);
      }
    }

    if (new Set(question.prerequisites).size !== question.prerequisites.length) {
      throw new Error(`Question "${question.id}" contains duplicate prerequisites`);
    }

    if (new Set(question.related).size !== question.related.length) {
      throw new Error(`Question "${question.id}" contains duplicate related questions`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string): void {
    if (visiting.has(id)) {
      throw new Error(`Prerequisite cycle detected at question "${id}"`);
    }

    if (visited.has(id)) {
      return;
    }

    visiting.add(id);
    const question = byId.get(id);

    if (!question) {
      throw new Error(`Prerequisite graph references unknown question "${id}"`);
    }

    for (const prerequisite of question.prerequisites) {
      visit(prerequisite);
    }

    visiting.delete(id);
    visited.add(id);
  }

  for (const question of questions) {
    visit(question.id);
  }
}

export function rankSearchResults(
  documents: readonly SearchDocument[],
  rawQuery: string,
  limit = 12,
): SearchDocument[] {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return [];
  }

  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError(`Search limit must be a positive safe integer; received ${limit}`);
  }

  const terms = query.split(/\s+/u).filter(Boolean);

  return documents
    .map((document) => {
      const title = document.title.toLowerCase();
      const summary = document.summary.toLowerCase();
      const tags = document.tags.join(' ').toLowerCase();
      const body = document.searchableText.toLowerCase();
      let score = 0;

      for (const term of terms) {
        if (title.includes(term)) {
          score += 8;
        }

        if (summary.includes(term)) {
          score += 4;
        }

        if (tags.includes(term)) {
          score += 3;
        }

        if (body.includes(term)) {
          score += 1;
        }
      }

      return { document, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.document.title < right.document.title
        ? -1
        : left.document.title > right.document.title
          ? 1
          : 0;
    })
    .slice(0, limit)
    .map(({ document }) => document);
}
