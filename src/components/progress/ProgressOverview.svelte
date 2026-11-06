<script lang="ts">
  import { onMount } from 'svelte';
  import { PROGRESS_STORAGE_KEY, readProgress } from '@lib/progress';

  interface Props {
    knownIds: string[];
  }

  let { knownIds }: Props = $props();
  let completed = $state(0);
  let storageMessage = $state('');

  onMount(() => {
    let storage: Storage | undefined;

    try {
      storage = window.localStorage;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'SecurityError') {
        storageMessage = 'Progress storage is disabled in this browser.';
        return;
      }

      throw error;
    }

    function syncFromStorage(): void {
      const result = readProgress(storage);

      if (!result.ok) {
        storageMessage = result.reason === 'invalid-data'
          ? 'Saved progress could not be read.'
          : 'Progress storage is unavailable.';
        return;
      }

      const known = new Set(knownIds);
      completed = result.snapshot.completed.filter((id) => known.has(id)).length;
      storageMessage = '';
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
</script>

<div class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
  <div class="min-w-0 flex-1">
    <p class="text-sm font-medium">Your progress</p>
    <p class="mt-1 text-xs text-muted-foreground">Stored locally in this browser. No account or sync.</p>
    {#if storageMessage}<p class="mt-1 text-xs text-destructive">{storageMessage}</p>{/if}
  </div>
  <div class="text-right">
    <p class="text-2xl font-semibold tabular-nums">{completed}<span class="text-sm text-muted-foreground">/{knownIds.length}</span></p>
    <p class="text-xs text-muted-foreground">completed</p>
  </div>
</div>
