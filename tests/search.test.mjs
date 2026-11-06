import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSearchIndex } from '../src/lib/search/index.ts';
import { isSearchDocument, parseSearchIndex } from '../src/lib/search/validation.ts';

function document(id, overrides = {}) {
  return {
    id,
    slug: id,
    title: `Question about ${id}`,
    domain: 'javascript-typescript',
    summary: 'A sufficiently descriptive summary for this search document.',
    difficulty: 'foundation',
    minutes: 8,
    tags: ['runtime'],
    prerequisites: [],
    related: [],
    featured: false,
    searchableText: 'runtime execution',
    ...overrides,
  };
}

test('search document guard validates the complete indexed shape', () => {
  assert.equal(isSearchDocument(document('event-loop')), true);
  assert.equal(isSearchDocument({ ...document('event-loop'), minutes: 1.5 }), false);
  assert.equal(isSearchDocument({ ...document('event-loop'), domain: 'unknown' }), false);
});

test('search index parser validates payload shape and question relationships', () => {
  assert.deepEqual(parseSearchIndex({ version: 1, documents: [document('event-loop')] }), [
    document('event-loop'),
  ]);
  assert.throws(() => parseSearchIndex({ version: 2, documents: [] }), /unsupported or invalid/u);
  assert.throws(
    () =>
      parseSearchIndex({
        version: 1,
        documents: [document('event-loop', { related: ['missing'] })],
      }),
    /unknown question/u,
  );
});

test('search loader passes its abort signal and reports HTTP failures', async () => {
  const controller = new AbortController();
  let requestedUrl = '';
  let requestedSignal;
  const fetcher = async (url, options) => {
    requestedUrl = url;
    requestedSignal = options.signal;

    return new Response(JSON.stringify({ version: 1, documents: [document('event-loop')] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const documents = await loadSearchIndex(controller.signal, fetcher);

  assert.equal(requestedUrl, '/search-index.json');
  assert.equal(requestedSignal, controller.signal);
  assert.equal(documents[0].id, 'event-loop');
  await assert.rejects(
    loadSearchIndex(controller.signal, async () => new Response('', { status: 503 })),
    /HTTP 503/u,
  );
});
