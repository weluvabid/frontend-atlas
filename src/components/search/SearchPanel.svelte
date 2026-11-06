<script lang="ts">
  import { onMount } from 'svelte';
  import { DOMAIN_IDS, rankSearchResults, validateQuestionGraph, type SearchDocument } from '@lib/atlas';

  let documents: SearchDocument[] = $state([]);
  let query = $state('');
  let loading = $state(true);
  let loadError = $state('');

  const results = $derived(rankSearchResults(documents, query, 10));
  const normalizedQuery = $derived(query.trim());

  function isSearchDocument(value: unknown): value is SearchDocument {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const item = value as Record<string, unknown>;
    const stringArray = (candidate: unknown) => Array.isArray(candidate) && candidate.every((part) => typeof part === 'string');

    return (
      typeof item.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(item.id) &&
      typeof item.slug === 'string' &&
      typeof item.title === 'string' &&
      typeof item.summary === 'string' &&
      typeof item.domain === 'string' && DOMAIN_IDS.includes(item.domain as (typeof DOMAIN_IDS)[number]) &&
      ['foundation', 'intermediate', 'advanced'].includes(String(item.difficulty)) &&
      typeof item.minutes === 'number' && Number.isSafeInteger(item.minutes) &&
      stringArray(item.tags) && stringArray(item.prerequisites) && stringArray(item.related) &&
      typeof item.featured === 'boolean' &&
      typeof item.searchableText === 'string'
    );
  }

  onMount(() => {
    const controller = new AbortController();

    async function loadIndex() {
      try {
        const response = await fetch('/search-index.json', { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Search index request failed with HTTP ${response.status}`);
        }

        const payload: unknown = await response.json();

        if (
          typeof payload !== 'object' ||
          payload === null ||
          !('version' in payload) ||
          payload.version !== 1 ||
          !('documents' in payload) ||
          !Array.isArray(payload.documents)
        ) {
          throw new TypeError('Search index has an unsupported or invalid format');
        }

        const parsedDocuments = payload.documents;

        if (!parsedDocuments.every(isSearchDocument)) {
          throw new TypeError('Search index contains an invalid question document');
        }

        validateQuestionGraph(parsedDocuments);
        documents = parsedDocuments;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        loadError = error instanceof Error ? error.message : 'An unexpected search error occurred';
      } finally {
        if (!controller.signal.aborted) {
          loading = false;
        }
      }
    }

    void loadIndex();

    return () => controller.abort();
  });
</script>

<section class="search-panel rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="search-title">
  <div class="mb-4">
    <p class="eyebrow">Find your way</p>
    <h2 id="search-title" class="mt-2 text-xl font-semibold tracking-tight">Search the handbook</h2>
  </div>
  <label class="sr-only" for="atlas-search">Search questions and concepts</label>
  <input
    id="atlas-search"
    bind:value={query}
    class="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground"
    type="search"
    maxlength="120"
    placeholder="Try “event loop”, “CORS”, or “layout”…"
    autocomplete="off"
  />
  <div class="mt-4" aria-live="polite" aria-atomic="true">
    {#if loading}
      <p class="text-sm text-muted-foreground">Loading the search index…</p>
    {:else if loadError}
      <p class="text-sm text-destructive">Search is unavailable: {loadError}</p>
    {:else if !normalizedQuery}
      <p class="text-sm text-muted-foreground">Search across all 40 questions. Results are ranked by title, summary, tags, and explanation.</p>
    {:else if results.length === 0}
      <p class="text-sm text-muted-foreground">No matches for “{normalizedQuery}”. Try a broader term.</p>
    {:else}
      <p class="mb-3 text-xs text-muted-foreground">{results.length} matching {results.length === 1 ? 'question' : 'questions'}</p>
      <ul class="space-y-2">
        {#each results as result (result.id)}
          <li>
            <a class="block rounded-xl border border-border px-4 py-3 no-underline transition-colors hover:border-ring hover:bg-muted/40" href={`/questions/${result.slug}/`}>
              <span class="block text-sm font-medium text-foreground">{result.title}</span>
              <span class="mt-1 block text-xs leading-5 text-muted-foreground">{result.summary}</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
