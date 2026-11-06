<script lang="ts">
  import { onMount } from 'svelte';
  import {
    createProgressSnapshot,
    parseProgressSnapshot,
    PROGRESS_STORAGE_KEY,
    readProgress,
    writeProgress,
  } from '@lib/progress';

  interface Props {
    questionId: string;
    knownIds: string[];
  }

  let { questionId, knownIds }: Props = $props();
  let completed = $state(false);
  let completedCount = $state(0);
  let completedIds = $state<string[]>([]);
  let status = $state('');
  let storageAvailable = $state(true);
  let progressInvalid = $state(false);
  let fileInput: HTMLInputElement;

  const knownIdSet = $derived(new Set(knownIds));

  function getStorage(): Storage | undefined {
    try {
      return window.localStorage;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'SecurityError') {
        return undefined;
      }

      throw error;
    }
  }

  function persist(ids: readonly string[]): boolean {
    const snapshot = createProgressSnapshot(ids);
    completedIds = [...snapshot.completed];
    progressInvalid = false;
    completed = snapshot.completed.includes(questionId);
    completedCount = snapshot.completed.filter((id) => knownIdSet.has(id)).length;

    if (!writeProgress(getStorage(), snapshot)) {
      storageAvailable = false;
      status = 'Browser storage is unavailable. Progress is only in this tab; export a backup.';
      return false;
    }

    status = 'Progress saved on this device.';

    return true;
  }

  onMount(() => {
    const storage = getStorage();

    function syncFromStorage(): void {
      const result = readProgress(storage);

      if (!result.ok) {
        storageAvailable = result.reason !== 'unavailable';
        progressInvalid = result.reason === 'invalid-data';
        status = result.reason === 'invalid-data'
          ? 'Saved progress is invalid. Import a valid backup or mark a question to replace it.'
          : 'Browser storage is unavailable. Progress will remain in memory for this tab.';
        return;
      }

      storageAvailable = true;
      completedIds = [...result.snapshot.completed];
      completed = result.snapshot.completed.includes(questionId);
      completedCount = result.snapshot.completed.filter((id) => knownIdSet.has(id)).length;
    }

    function handleStorageChange(event: StorageEvent): void {
      if (event.key !== PROGRESS_STORAGE_KEY && event.key !== null) {
        return;
      }

      syncFromStorage();
    }

    syncFromStorage();
    window.addEventListener('storage', handleStorageChange);

    return () => window.removeEventListener('storage', handleStorageChange);
  });

  function toggleCompleted(): void {
    const next = new Set(completedIds);

    if (next.has(questionId)) {
      next.delete(questionId);
    } else {
      next.add(questionId);
    }

    persist([...next]);
  }

  function exportProgress(): void {
    if (progressInvalid) {
      status = 'Cannot export damaged saved progress. Import a valid backup or replace it first.';
      return;
    }

    const snapshot = createProgressSnapshot(completedIds);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'frontend-atlas-progress.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    status = 'Progress export created.';
  }

  async function importProgress(event: Event): Promise<void> {
    const input = event.currentTarget;

    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
      return;
    }

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

      if (!window.confirm(`Replace this device's progress with ${snapshot.completed.length} completed question(s)?`)) {
        status = 'Import cancelled.';
        return;
      }

      const stored = persist(snapshot.completed);
      status = stored
        ? 'Progress imported successfully.'
        : 'Progress imported for this tab, but browser storage is unavailable.';
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError) {
        status = `Import rejected: ${error.message}`;
        return;
      }

      throw error;
    }
  }
</script>

<div class="flex flex-wrap items-center gap-2">
  <button
    type="button"
    class="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-xs font-medium transition-colors hover:bg-muted"
    aria-pressed={completed}
    onclick={toggleCompleted}
  >
    <span aria-hidden="true">{completed ? '✓' : '○'}</span>
    {completed ? 'Completed' : 'Mark as complete'}
  </button>
  <span class="text-xs text-muted-foreground">{completedCount} / {knownIds.length} completed on this device</span>
  <div class="ml-auto flex items-center gap-2">
    <button type="button" class="min-h-10 px-2 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50" onclick={exportProgress} disabled={progressInvalid}>Export</button>
    <button type="button" class="min-h-10 px-2 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onclick={() => fileInput.click()}>Import</button>
    <input bind:this={fileInput} class="sr-only" type="file" accept="application/json,.json" onchange={importProgress} aria-label="Import Frontend Atlas progress file" />
  </div>
  {#if !storageAvailable}
    <span class="w-full text-xs text-destructive">Progress persistence is unavailable.</span>
  {/if}
  <p class="w-full text-xs text-muted-foreground" role="status">{status}</p>
</div>
