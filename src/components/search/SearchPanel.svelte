<script lang="ts">
  import { onMount } from 'svelte';
  import { Command, Alert, Spinner, Kbd } from '@weluvabid/iris/components';
  import {
    DOMAIN_IDS,
    rankSearchResults,
    validateQuestionGraph,
    type SearchDocument,
  } from '@lib/atlas';
  import { domains } from '@data/domains';

  interface Props {
    mode?: 'dialog' | 'page';
    open?: boolean;
  }

  let { mode = 'page', open = $bindable(false) }: Props = $props();
  let documents: SearchDocument[] = $state([]);
  let query = $state('');
  let loading = $state(true);
  let loadError = $state('');

  const results = $derived(rankSearchResults(documents, query, 10));
  const normalizedQuery = $derived(query.trim());

  function isSearchDocument(value: unknown): value is SearchDocument {
    if (typeof value !== 'object' || value === null) return false;

    const item = value as Record<string, unknown>;
    const stringArray = (candidate: unknown) =>
      Array.isArray(candidate) && candidate.every((part) => typeof part === 'string');

    return (
      typeof item.id === 'string' &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(item.id) &&
      typeof item.slug === 'string' &&
      item.slug.length > 0 &&
      typeof item.title === 'string' &&
      typeof item.summary === 'string' &&
      typeof item.domain === 'string' &&
      DOMAIN_IDS.includes(item.domain as (typeof DOMAIN_IDS)[number]) &&
      ['foundation', 'intermediate', 'advanced'].includes(String(item.difficulty)) &&
      typeof item.minutes === 'number' &&
      Number.isSafeInteger(item.minutes) &&
      stringArray(item.tags) &&
      stringArray(item.prerequisites) &&
      stringArray(item.related) &&
      typeof item.featured === 'boolean' &&
      typeof item.searchableText === 'string'
    );
  }

  onMount(() => {
    const controller = new AbortController();

    async function loadIndex(): Promise<void> {
      try {
        const response = await fetch('/search-index.json', { signal: controller.signal });
        if (!response.ok)
          throw new Error(`Search index request failed with HTTP ${response.status}`);

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

        if (!payload.documents.every(isSearchDocument)) {
          throw new TypeError('Search index contains an invalid question document');
        }

        validateQuestionGraph(payload.documents);
        documents = payload.documents;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        loadError = error instanceof Error ? error.message : 'An unexpected search error occurred';
      } finally {
        if (!controller.signal.aborted) loading = false;
      }
    }

    void loadIndex();
    return () => controller.abort();
  });
</script>

{#snippet commandContents()}
  <Command.Input
    bind:value={query}
    placeholder="Search questions and concepts…"
    aria-label="Search questions and concepts"
  />
  <Command.List>
    {#if loading}
      <div class="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
        <Spinner.Spinner /> Loading the handbook index…
      </div>
    {:else if loadError}
      <div class="p-3">
        <Alert.Root variant="destructive"
          ><Alert.Title>Search unavailable</Alert.Title><Alert.Description
            >{loadError}</Alert.Description
          ></Alert.Root
        >
      </div>
    {:else if !normalizedQuery}
      <Command.Empty>Start typing to search all 40 questions.</Command.Empty>
    {:else if results.length === 0}
      <Command.Empty>No results for “{normalizedQuery}”. Try a broader term.</Command.Empty>
    {:else}
      {#each domains as domain (domain.id)}
        {@const domainResults = results.filter((result) => result.domain === domain.id)}
        {#if domainResults.length > 0}
          <Command.Group heading={domain.name}>
            {#each domainResults as result (result.id)}
              <Command.LinkItem
                href={`/questions/${result.slug}/`}
                value={`${result.title} ${result.summary} ${result.tags.join(' ')}`}
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium">{result.title}</span>
                  <span class="mt-0.5 block truncate text-xs text-muted-foreground"
                    >{result.summary}</span
                  >
                </span>
                <span class="shrink-0 text-xs text-muted-foreground">{result.minutes} min</span>
              </Command.LinkItem>
            {/each}
          </Command.Group>
        {/if}
      {/each}
    {/if}
  </Command.List>
  {#if !loading && !loadError}
    <div
      class="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground"
    >
      <span>{normalizedQuery ? `${results.length} matching questions` : 'Search the handbook'}</span
      >
      <span><Kbd.Kbd>↑↓</Kbd.Kbd> Navigate <Kbd.Kbd class="ml-2">↵</Kbd.Kbd> Open</span>
    </div>
  {/if}
{/snippet}

{#if mode === 'dialog'}
  <Command.Dialog
    bind:open
    title="Search Frontend Atlas"
    description="Search questions and concepts across the handbook."
    shouldFilter={false}
  >
    {@render commandContents()}
  </Command.Dialog>
{:else}
  <section
    class="overflow-hidden rounded-xl border border-border bg-card"
    aria-label="Search the handbook"
  >
    <Command.Root shouldFilter={false}>
      {@render commandContents()}
    </Command.Root>
  </section>
{/if}
