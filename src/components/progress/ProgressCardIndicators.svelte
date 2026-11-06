<script lang="ts">
  import { onMount } from 'svelte';
  import { subscribeToProgress } from '@lib/progress/service';
  import type { ProgressReadResult } from '@lib/progress/storage';

  function updateIndicators(result: ProgressReadResult): void {
    const questionIndicators = document.querySelectorAll<HTMLElement>('[data-question-progress]');
    const domainIndicators = document.querySelectorAll<HTMLElement>('[data-domain-progress]');

    for (const indicator of questionIndicators) {
      indicator.textContent = '';
      indicator.style.display = 'none';
      indicator.removeAttribute('data-progress-state');
      indicator.className = `${indicator.hasAttribute('data-featured-progress') ? 'mt-auto' : 'mt-3'} hidden w-fit rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground`;
    }
    for (const indicator of domainIndicators) {
      indicator.textContent = '';
      indicator.style.display = 'none';
    }

    if (!result.ok) return;

    const { completed, readingProgress } = result.snapshot;
    const completedIds = new Set(completed);

    for (const indicator of questionIndicators) {
      const questionId = indicator.dataset.questionProgress;
      if (!questionId) throw new Error('Question progress indicator is missing its question ID');

      if (completedIds.has(questionId)) {
        indicator.textContent = 'Completed';
        indicator.dataset.progressState = 'completed';
        indicator.className = `${indicator.hasAttribute('data-featured-progress') ? 'mt-auto' : 'mt-3'} inline-flex w-fit self-start rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground`;
        indicator.style.display = '';
      } else {
        const reading = readingProgress[questionId];
        if (!reading || reading.position === 0) continue;
        const percentage = Math.round((reading.position / 65535) * 100);
        indicator.textContent = `In progress · ${percentage}%`;
        indicator.dataset.progressState = 'in-progress';
        indicator.className = `${indicator.hasAttribute('data-featured-progress') ? 'mt-auto' : 'mt-3'} inline-flex w-fit self-start rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground`;
        indicator.style.display = '';
      }
    }

    for (const indicator of domainIndicators) {
      const rawIds = indicator.dataset.questionIds;
      if (!rawIds) throw new Error('Domain progress indicator is missing its question IDs');
      const ids = rawIds.split(',').filter(Boolean);
      const done = ids.filter((id) => completedIds.has(id)).length;
      const inProgress = ids.filter(
        (id) => !completedIds.has(id) && readingProgress[id] && readingProgress[id].position > 0
      ).length;
      indicator.textContent = `${done}/${ids.length} completed${inProgress ? ` · ${inProgress} in progress` : ''}`;
      indicator.style.display = '';
    }
  }

  onMount(() => subscribeToProgress(updateIndicators));
</script>
