<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Button, DropdownMenu, Progress } from '@weluvabid/iris/components';
  import { ChevronDown, Download, Upload } from '@weluvabid/iris/lucide';
  import {
    announceProgressChange,
    createProgressSnapshot,
    parseProgressSnapshot,
    PROGRESS_CHANGE_EVENT,
    PROGRESS_STORAGE_KEY,
    readProgress,
    writeProgress,
    type ProgressSnapshot,
  } from '@lib/progress';

  interface Props {
    knownIds: string[];
  }

  let { knownIds }: Props = $props();
  let completed = $state(0);
  let currentSnapshot = $state(createProgressSnapshot([]));
  let storageMessage = $state('');
  let status = $state('');
  let progressInvalid = $state(false);
  let menuOpen = $state(false);
  let fileInput: HTMLInputElement;
  let navigationInput: HTMLInputElement;
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
    progressInvalid = false;
    storageMessage = '';
  }

  function getStorage(): Storage | undefined {
    try {
      return window.localStorage;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'SecurityError') return undefined;
      throw error;
    }
  }

  onMount(() => {
    const storage = getStorage();
    if (!storage) storageMessage = 'Progress storage is disabled in this browser.';

    function syncFromStorage(): void {
      const result = readProgress(storage);

      if (!result.ok) {
        progressInvalid = result.reason === 'invalid-data';
        storageMessage =
          result.reason === 'invalid-data'
            ? 'Saved progress is invalid. Import a valid backup to recover it.'
            : 'Progress storage is unavailable in this browser.';
        return;
      }

      applySnapshot(result.snapshot);
    }

    async function handleCardNavigationPrompt(event: Event): Promise<void> {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as { active?: boolean; value?: string; message?: string };
      navigationMode = detail.active === true;
      navigationSequence = typeof detail.value === 'string' ? detail.value : '';
      navigationMessage = typeof detail.message === 'string' ? detail.message : '';
      if (navigationMessageTimer !== undefined) window.clearTimeout(navigationMessageTimer);

      if (navigationMode) {
        await tick();
        navigationInput?.focus({ preventScroll: true });
      } else if (navigationMessage) {
        navigationMessageTimer = window.setTimeout(() => (navigationMessage = ''), 3000);
      }
    }

    function handleStorageChange(event: StorageEvent): void {
      if (event.key !== PROGRESS_STORAGE_KEY && event.key !== null) return;
      syncFromStorage();
    }

    function handleProgressChange(event: Event): void {
      if (!(event instanceof CustomEvent)) return;
      const snapshot = parseProgressSnapshot(event.detail);
      applySnapshot(snapshot);
    }

    syncFromStorage();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('atlas:card-navigation-prompt', handleCardNavigationPrompt);
    window.addEventListener(PROGRESS_CHANGE_EVENT, handleProgressChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('atlas:card-navigation-prompt', handleCardNavigationPrompt);
      if (navigationMessageTimer !== undefined) window.clearTimeout(navigationMessageTimer);
      window.removeEventListener(PROGRESS_CHANGE_EVENT, handleProgressChange);
    };
  });

  function exportProgress(): void {
    if (progressInvalid) {
      status = 'Cannot export invalid saved progress. Import a valid backup first.';
      return;
    }

    const snapshot = createProgressSnapshot(currentSnapshot.completed);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'frontend-atlas-progress.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    status = 'Progress export created.';
  }

  function openFilePicker(): void {
    fileInput.click();
  }

  async function importProgress(event: Event): Promise<void> {
    const input = event.currentTarget;

    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;

    const file = input.files[0];
    input.value = '';

    if (file.size > 64 * 1024) {
      status = 'Import rejected: progress file exceeds the 64 KiB limit.';
      return;
    }

    try {
      const parsed: unknown = JSON.parse(await file.text());
      const snapshot = parseProgressSnapshot(parsed);
      const unknownIds = snapshot.completed.filter((id) => !knownIdSet.has(id));

      if (unknownIds.length > 0) {
        status = `Import rejected: ${unknownIds.length} question id(s) are not in this handbook version.`;
        return;
      }

      if (
        !window.confirm(
          `Replace this device's progress with ${snapshot.completed.length} completed question(s)?`,
        )
      ) {
        status = 'Import cancelled.';
        return;
      }

      const stored = writeProgress(getStorage(), snapshot);
      applySnapshot(snapshot);
      announceProgressChange(snapshot);
      status = stored
        ? 'Progress imported successfully.'
        : 'Progress imported for this tab, but browser storage is unavailable.';
    } catch (error) {
      if (
        error instanceof SyntaxError ||
        error instanceof TypeError ||
        error instanceof RangeError
      ) {
        status = `Import rejected: ${error.message}`;
        return;
      }

      throw error;
    }
  }
</script>

<div class="pointer-events-none relative flex flex-col items-center py-3">
  <DropdownMenu.Root bind:open={menuOpen}>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button.Root
          {...props}
          variant="outline"
          class="pointer-events-auto h-10 max-w-[calc(100vw-2rem)] gap-3 rounded-full border-border/80 bg-card/95 px-4 shadow-md shadow-black/10 backdrop-blur-md dark:shadow-black/30"
          aria-label={`${completed} of ${knownIds.length} questions completed. Open progress actions.`}
          aria-expanded={menuOpen}
          aria-keyshortcuts="P"
          data-progress-menu-trigger
        >
          <span
            class="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted"
            aria-hidden="true"
          >
            <span
              class="block h-full rounded-full bg-primary transition-[width]"
              style={`width: ${completionPercentage}%`}
            ></span>
          </span>
          <span class="whitespace-nowrap text-xs text-muted-foreground" aria-live="polite">
            <span class="font-semibold tabular-nums text-foreground"
              >{completed} / {knownIds.length}</span
            >
            completed on this device
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
      <DropdownMenu.Group>
        <DropdownMenu.Item onSelect={exportProgress} disabled={progressInvalid}>
          <Download aria-hidden="true" />
          Export progress
        </DropdownMenu.Item>
        <DropdownMenu.Item onSelect={openFilePicker}>
          <Upload aria-hidden="true" />
          Import progress
        </DropdownMenu.Item>
      </DropdownMenu.Group>
      {#if storageMessage || status}
        <DropdownMenu.Separator />
        <div class="px-2 py-1.5 text-xs text-muted-foreground">
          {status || storageMessage}
        </div>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
  {#if navigationMode || navigationMessage}
    <div
      class="pointer-events-auto absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2"
      aria-live="polite"
      aria-atomic="true"
    >
      {#if navigationMode}
        <input
          bind:this={navigationInput}
          class="h-8 w-36 rounded-md border border-border bg-popover px-2 py-1 text-center text-xs text-popover-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
  <input
    bind:this={fileInput}
    class="sr-only"
    type="file"
    accept="application/json,.json"
    onchange={importProgress}
    aria-label="Import Frontend Atlas progress file"
  />
  <span class="sr-only" role="status" aria-live="polite">{status || storageMessage}</span>
</div>
