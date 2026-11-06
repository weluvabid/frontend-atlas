<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Alert } from '@weluvabid/iris/components';
  import { Check, Circle } from '@weluvabid/iris/lucide';
  import {
    announceProgressChange,
    createProgressSnapshot,
    parseProgressSnapshot,
    PROGRESS_CHANGE_EVENT,
    PROGRESS_STORAGE_KEY,
    readProgress,
    writeProgress,
  } from '@lib/progress';

  interface Props {
    questionId: string;
  }

  let { questionId }: Props = $props();
  let completed = $state(false);
  let completedIds = $state<string[]>([]);
  let status = $state('');
  let storageAvailable = $state(true);

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
    completed = snapshot.completed.includes(questionId);

    const stored = writeProgress(getStorage(), snapshot);
    announceProgressChange(snapshot);

    if (!stored) {
      storageAvailable = false;
      status = 'Browser storage is unavailable. Progress is only available in this tab.';
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
        status =
          result.reason === 'invalid-data'
            ? 'Saved progress is invalid. Use the progress menu to import a valid backup or mark a question to replace it.'
            : 'Browser storage is unavailable. Progress will remain in memory for this tab.';
        return;
      }

      storageAvailable = true;
      completedIds = [...result.snapshot.completed];
      completed = result.snapshot.completed.includes(questionId);
    }

    function handleStorageChange(event: StorageEvent): void {
      if (event.key !== PROGRESS_STORAGE_KEY && event.key !== null) {
        return;
      }

      syncFromStorage();
    }

    function handleProgressChange(event: Event): void {
      if (!(event instanceof CustomEvent)) return;
      const snapshot = parseProgressSnapshot(event.detail);
      completedIds = [...snapshot.completed];
      completed = snapshot.completed.includes(questionId);
      status = 'Progress updated in this tab.';
    }

    syncFromStorage();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(PROGRESS_CHANGE_EVENT, handleProgressChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(PROGRESS_CHANGE_EVENT, handleProgressChange);
    };
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
</script>

<div class="flex flex-wrap items-center gap-3">
  <Button.Root
    variant={completed ? 'secondary' : 'outline'}
    class="rounded-full"
    aria-pressed={completed}
    aria-keyshortcuts="M"
    data-completion-toggle
    onclick={toggleCompleted}
  >
    {#if completed}<Check aria-hidden="true" />{:else}<Circle aria-hidden="true" />{/if}
    {completed ? 'Completed' : 'Mark as complete'}
  </Button.Root>
  {#if !storageAvailable}
    <Alert.Root variant="destructive" class="w-full"
      ><Alert.Description>Progress persistence is unavailable.</Alert.Description></Alert.Root
    >
  {/if}
  {#if status}
    <p class="w-full text-xs text-muted-foreground" role="status">{status}</p>
  {/if}
</div>
