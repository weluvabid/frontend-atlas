<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Button, DropdownMenu, Progress, Tooltip } from '@weluvabid/iris/components';
  import { Check, ChevronDown, SlidersHorizontal } from '@weluvabid/iris/lucide';
  import { createProgressSnapshot, type ProgressSnapshot } from '@lib/progress/model';
  import {
    subscribeToProgress,
    toggleQuestionCompletion,
    updateQuestionReadingProgress,
  } from '@lib/progress/service';
  import { notify } from '@lib/notifications';
  import ProgressQrTransfer from './ProgressQrTransfer.svelte';
  import type { ProgressReadResult } from '@lib/progress/storage';

  interface Props {
    knownIds: string[];
    questionManifest: string[];
    questionId?: string;
  }

  const { knownIds, questionManifest, questionId }: Props = $props();
  let completed = $state(0);
  let readingPosition = $state(0);
  let lastPersisted = -1;
  let persistTimer: number | undefined;
  let frame = 0;
  let article: HTMLElement | null = null;
  let activeQuestionId = questionId;
  let trackingPaused = false;
  let storageWarningShown = false;
  let currentSnapshot = $state(createProgressSnapshot([]));
  const articleCompleted = $derived(
    questionId ? currentSnapshot.completed.includes(questionId) : false,
  );
  let storageMessage = $state('');
  let menuOpen = $state(false);
  let qrOpen = $state(false);
  let qrMode = $state<'overview' | 'export' | 'import'>('overview');
  let navigationInput = $state<HTMLInputElement>();
  let navigationMode = $state(false);
  let navigationSequence = $state('');
  let navigationMessage = $state('');
  let navigationMessageTimer: number | undefined;

  const knownIdSet = $derived(new Set(knownIds));
  const completionPercentage = $derived(
    knownIds.length > 0 ? (completed / knownIds.length) * 100 : 0,
  );

  function applySnapshot(snapshot: ProgressSnapshot): void {
    currentSnapshot = snapshot;
    completed = snapshot.completed.filter((id) => knownIdSet.has(id)).length;
    storageMessage = '';

    if (questionId) {
      const savedPosition = snapshot.readingProgress[questionId]?.position ?? 0;

      readingPosition = Math.max(readingPosition, savedPosition / 65535);
      lastPersisted = Math.max(lastPersisted, savedPosition);
    }
  }

  function measureReadingProgress(): number {
    if (!article) {
      return 0;
    }

    const bounds = article.getBoundingClientRect();
    const articleTop = window.scrollY + bounds.top;
    const scrollable = Math.max(0, article.scrollHeight - window.innerHeight);

    if (scrollable === 0) {
      return window.scrollY + window.innerHeight >= articleTop + article.scrollHeight ? 1 : 0;
    }

    return Math.min(1, Math.max(0, (window.scrollY - articleTop) / scrollable));
  }

  function persistReadingProgress(force = false): void {
    if (!questionId) {
      return;
    }

    const next = Math.round(readingPosition * 65535);

    if (!force && (next === lastPersisted || Math.abs(next - lastPersisted) < 655)) {
      return;
    }

    if (next === lastPersisted) {
      return;
    }

    try {
      const result = updateQuestionReadingProgress(questionId, next);
      const savedPosition = result.snapshot.readingProgress[questionId]?.position ?? 0;

      readingPosition = Math.max(readingPosition, savedPosition / 65535);
      lastPersisted = Math.max(lastPersisted, savedPosition);

      if (!result.persisted && !storageWarningShown) {
        storageWarningShown = true;
        notify('warning', 'Reading progress is available in this tab only', {
          description: 'Browser storage is unavailable.',
        });
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Cannot update reading progress: saved progress is invalid'
      ) {
        notify('error', 'Reading position could not be saved', {
          description: 'Stored progress is invalid. Use Manage Progress to recover it.',
        });

        return;
      }

      throw error;
    }
  }

  function flushReadingProgress(): void {
    if (trackingPaused || persistTimer === undefined) {
      return;
    }

    window.clearTimeout(persistTimer);
    persistTimer = undefined;
    persistReadingProgress(true);
  }

  function handleReadingScroll(): void {
    trackingPaused = false;

    if (frame) {
      return;
    }

    frame = window.requestAnimationFrame(() => {
      frame = 0;
      readingPosition = Math.max(readingPosition, measureReadingProgress());

      if (persistTimer !== undefined) {
        window.clearTimeout(persistTimer);
      }

      persistTimer = window.setTimeout(() => {
        persistTimer = undefined;
        persistReadingProgress();
      }, 1200);
    });
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      flushReadingProgress();
    }
  }

  function toggleArticleCompletion(): void {
    if (!questionId) {
      return;
    }

    try {
      const result = toggleQuestionCompletion(questionId, currentSnapshot.completed);
      const nextCompleted = result.snapshot.completed.includes(questionId);

      applySnapshot(result.snapshot);

      if (!result.persisted) {
        notify('warning', 'Progress is available in this tab only', {
          description: 'Browser storage is unavailable.',
        });

        return;
      }

      notify('success', nextCompleted ? 'Question marked complete' : 'Question marked incomplete');
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Cannot save progress: saved progress is invalid'
      ) {
        notify('error', 'Saved progress is invalid', {
          description: 'Use Manage Progress to import a valid QR image or replace local progress.',
        });

        return;
      }

      throw error;
    }
  }

  onMount(() => {
    function handleProgressResult(result: ProgressReadResult): void {
      if (!result.ok) {
        storageMessage =
          result.reason === 'invalid-data'
            ? 'Saved progress is invalid. Progress transfer is disabled until it is recovered.'
            : 'Progress storage is unavailable in this browser.';

        return;
      }

      if (questionId) {
        const savedPosition = result.snapshot.readingProgress[questionId]?.position ?? 0;
        const isReset =
          savedPosition < lastPersisted ||
          (savedPosition === 0 &&
            readingPosition > 0 &&
            result.snapshot.completed.length === 0 &&
            Object.keys(result.snapshot.readingProgress).length === 0);

        if (isReset) {
          if (persistTimer !== undefined) {
            window.clearTimeout(persistTimer);
            persistTimer = undefined;
          }

          if (frame) {
            window.cancelAnimationFrame(frame);
            frame = 0;
          }

          trackingPaused = true;
          readingPosition = 0;
          lastPersisted = 0;
        }
      }

      applySnapshot(result.snapshot);
    }

    function handleCardNavigationPrompt(event: Event): void {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const detail = event.detail as { active?: boolean; value?: string; message?: string };

      navigationMode = detail.active === true;
      navigationSequence = typeof detail.value === 'string' ? detail.value : '';
      navigationMessage = typeof detail.message === 'string' ? detail.message : '';

      if (navigationMessageTimer !== undefined) {
        window.clearTimeout(navigationMessageTimer);
      }

      if (navigationMode) {
        void tick().then(() => navigationInput?.focus({ preventScroll: true }));
      } else if (navigationMessage) {
        navigationMessageTimer = window.setTimeout(() => (navigationMessage = ''), 3000);
      }
    }

    const unsubscribe = subscribeToProgress(handleProgressResult);

    function handlePageLoad(): void {
      if (activeQuestionId !== questionId) {
        activeQuestionId = questionId;
        const savedPosition = questionId
          ? (currentSnapshot.readingProgress[questionId]?.position ?? 0)
          : 0;

        readingPosition = savedPosition / 65535;
        lastPersisted = savedPosition;
        trackingPaused = false;
      }

      if (!questionId) {
        article = null;

        return;
      }

      article = document.querySelector<HTMLElement>('[data-article-swipe]');

      if (!article) {
        throw new Error('Reading progress requires an article container');
      }

      handleReadingScroll();
    }

    if (questionId) {
      article = document.querySelector<HTMLElement>('[data-article-swipe]');

      if (!article) {
        throw new Error('Reading progress requires an article container');
      }

      handleReadingScroll();
    }

    window.addEventListener('scroll', handleReadingScroll, { passive: true });
    window.addEventListener('resize', handleReadingScroll, { passive: true });
    window.addEventListener('pagehide', flushReadingProgress);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('astro:before-preparation', flushReadingProgress);
    document.addEventListener('astro:page-load', handlePageLoad);
    window.addEventListener('atlas:card-navigation-prompt', handleCardNavigationPrompt);

    return () => {
      unsubscribe();

      window.removeEventListener('scroll', handleReadingScroll);
      window.removeEventListener('resize', handleReadingScroll);
      window.removeEventListener('pagehide', flushReadingProgress);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('astro:before-preparation', flushReadingProgress);
      document.removeEventListener('astro:page-load', handlePageLoad);

      if (questionId) {
        if (persistTimer !== undefined) {
          window.clearTimeout(persistTimer);
        }

        if (frame) {
          window.cancelAnimationFrame(frame);
        }

        article = null;
      }

      window.removeEventListener('atlas:card-navigation-prompt', handleCardNavigationPrompt);

      if (navigationMessageTimer !== undefined) {
        window.clearTimeout(navigationMessageTimer);
      }
    };
  });
</script>

<div class="pointer-events-none relative flex flex-col items-center py-3">
  <div
    class={`pointer-events-auto grid w-fit max-w-[calc(100vw-2rem)] ${questionId ? 'grid-cols-[44px_minmax(0,1fr)] grid-rows-[44px_auto]' : 'grid-cols-1 grid-rows-[44px_auto]'} items-center gap-x-3 gap-y-2 overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/95 px-2 py-2 shadow-lg shadow-black/10 backdrop-blur-md dark:shadow-black/30`}
  >
    {#if questionId}
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                class="relative col-start-1 row-span-2 row-start-1 grid size-11 shrink-0 place-items-center self-center rounded-full bg-background/90 text-foreground ring-1 ring-border/70 shadow-md shadow-black/10 backdrop-blur-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none dark:shadow-black/30"
                aria-label={articleCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                aria-pressed={articleCompleted}
                aria-keyshortcuts="M"
                data-completion-toggle
                onclick={toggleArticleCompletion}
              >
                <svg aria-hidden="true" class="size-9 -rotate-90" viewBox="0 0 32 32" fill="none">
                  <circle
                    cx="16"
                    cy="16"
                    r="13"
                    stroke="currentColor"
                    stroke-width="2"
                    class={`transition-colors duration-150 ${
                      articleCompleted ? 'text-emerald-200 dark:text-emerald-900/70' : 'text-border'
                    }`}
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="13"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-dasharray="81.681"
                    stroke-dashoffset={81.681 * (1 - readingPosition)}
                    class={`transition-[stroke-dashoffset,color] duration-150 ${
                      articleCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-foreground'
                    }`}
                  />
                </svg>
                <span
                  aria-hidden="true"
                  class={`absolute grid size-5 place-items-center rounded-full transition-colors duration-150 motion-reduce:transition-none ${articleCompleted ? 'bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-800' : 'bg-background'}`}
                >
                  <Check
                    class={`size-3.5 transition-colors duration-150 motion-reduce:transition-none ${articleCompleted ? 'text-emerald-700 text-emerald-400' : 'text-foreground'}`}
                  />
                </span>
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>
            {articleCompleted ? 'Mark as incomplete' : 'Mark as complete'} · Reading progress · {Math.round(
              readingPosition * 100,
            )}%
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    {/if}
    <div class={questionId ? 'col-start-2 row-start-1 min-w-0' : 'col-start-1 row-start-1 min-w-0'}>
      <DropdownMenu.Root bind:open={menuOpen}>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button.Root
              {...props}
              variant="ghost"
              class="h-9 min-w-0 gap-3 rounded-full px-3 hover:bg-muted/60"
              aria-label={`${completed} of ${knownIds.length} questions completed. Open progress actions.`}
              aria-expanded={menuOpen}
              aria-keyshortcuts="P"
              data-progress-menu-trigger
            >
              <span class="whitespace-nowrap text-xs text-muted-foreground" aria-live="polite">
                <span class="font-semibold tabular-nums text-foreground"
                  >{completed} / {knownIds.length}</span
                >
                completed <span class="hidden sm:inline">on this device</span>
              </span>
              <ChevronDown class="size-4 shrink-0" aria-hidden="true" />
            </Button.Root>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content side="bottom" align="center" sideOffset={8} class="w-64">
          <DropdownMenu.Label>Learning progress</DropdownMenu.Label>
          <div class="px-2 pb-2 text-xs text-muted-foreground">
            {completed} of {knownIds.length} questions completed on this device.
          </div>
          <div class="px-2 pb-2">
            <Progress.Root
              value={completionPercentage}
              class="h-1.5"
              aria-label="Handbook completion"
            />
          </div>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onSelect={() => {
              qrMode = 'overview';
              qrOpen = true;
            }}
          >
            <SlidersHorizontal aria-hidden="true" />
            Manage Progress
          </DropdownMenu.Item>
          {#if storageMessage}
            <DropdownMenu.Separator />
            <div class="px-2 py-1.5 text-xs text-muted-foreground">
              {storageMessage}
            </div>
          {/if}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
    <div
      class={questionId
        ? 'col-start-2 row-start-2 min-w-0 pr-3'
        : 'col-start-1 row-start-2 min-w-0 px-3'}
      role="group"
      aria-label="Overall handbook completion"
    >
      <Progress.Root
        value={completionPercentage}
        class="h-1.5 [&>div]:bg-foreground"
        aria-label="Handbook completion"
      />
    </div>
  </div>
  {#if navigationMode || navigationMessage}
    <div
      class="pointer-events-auto absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2"
      aria-live="polite"
      aria-atomic="true"
    >
      {#if navigationMode}
        <input
          bind:this={navigationInput}
          class="h-8 w-36 rounded-md border border-border bg-popover px-2 py-1 text-center text-base text-popover-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="text"
          value={navigationSequence}
          readonly
          aria-label="Card number. Type digits and press Enter to navigate, or Escape to cancel."
          placeholder="Go to card…"
        />
      {:else}
        <p
          class="rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm"
          role="status"
        >
          {navigationMessage}
        </p>
      {/if}
    </div>
  {/if}
  <ProgressQrTransfer
    bind:open={qrOpen}
    bind:mode={qrMode}
    snapshot={currentSnapshot}
    questionIds={questionManifest}
    onImported={applySnapshot}
  />
  <span class="sr-only" role="status" aria-live="polite">{storageMessage}</span>
</div>
