<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Alert } from '@weluvabid/iris/components';
  import { Check, Circle } from '@weluvabid/iris/lucide';
  import { subscribeToProgress, toggleQuestionCompletion } from '@lib/progress/service';
  import type { ProgressReadResult } from '@lib/progress/storage';

  interface Props {
    questionId: string;
  }

  let { questionId }: Props = $props();
  let completed = $state(false);
  let completedIds = $state<string[]>([]);
  let status = $state('');
  let storageAvailable = $state(true);

  function toggleCompleted(): void {
    const result = toggleQuestionCompletion(questionId, completedIds);
    completedIds = [...result.snapshot.completed];
    completed = result.snapshot.completed.includes(questionId);

    if (!result.persisted) {
      storageAvailable = false;
      status = 'Browser storage is unavailable. Progress is only available in this tab.';
      return;
    }

    storageAvailable = true;
    status = 'Progress saved on this device.';
  }

  onMount(() => {
    function handleProgressResult(result: ProgressReadResult): void {
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

    return subscribeToProgress(handleProgressResult);
  });
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
