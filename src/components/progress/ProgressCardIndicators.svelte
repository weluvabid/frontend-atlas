<script lang="ts">
  import { onMount } from 'svelte';
  import { subscribeToProgress } from '@lib/progress/service';
  import type { ProgressReadResult } from '@lib/progress/storage';

  function updateIndicators(result: ProgressReadResult): void {
    const questionIndicators = document.querySelectorAll<HTMLElement>('[data-question-progress]');
    const domainIndicators = document.querySelectorAll<HTMLElement>('[data-domain-progress]');

    for (const indicator of questionIndicators) {
      indicator.textContent = '';
      indicator.classList.add('hidden');
      indicator.removeAttribute('data-progress-state');
    }
    for (const indicator of domainIndicators) {
      indicator.textContent = '';
      indicator.classList.add('hidden');
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
        indicator.classList.remove('hidden');
      } else {
        const reading = readingProgress[questionId];
        if (!reading) continue;
        const percentage = Math.round((reading.position / 65535) * 100);
        indicator.textContent = percentage > 0 ? `In progress · ${percentage}%` : 'In progress';
        indicator.dataset.progressState = 'in-progress';
        indicator.classList.remove('hidden');
      }
    }

    for (const indicator of domainIndicators) {
      const rawIds = indicator.dataset.questionIds;
      if (!rawIds) throw new Error('Domain progress indicator is missing its question IDs');
      const ids = rawIds.split(',').filter(Boolean);
      const done = ids.filter((id) => completedIds.has(id)).length;
      const inProgress = ids.filter((id) => !completedIds.has(id) && readingProgress[id]).length;
      indicator.textContent = `${done}/${ids.length} completed${inProgress ? ` · ${inProgress} in progress` : ''}`;
      indicator.classList.remove('hidden');
    }
  }

  onMount(() => subscribeToProgress(updateIndicators));
</script>
