<script lang="ts">
  import { onMount } from 'svelte';
  import { Sonner } from '@weluvabid/iris/components';
  import { subscribeToProgress, updateQuestionReadingProgress } from '@lib/progress/service';

  interface Props { questionId: string }
  let { questionId }: Props = $props();
  let position = $state(0);
  let article: HTMLElement | null = null;
  let persistTimer: number | undefined;
  let frame = 0;
  let lastPersisted = -1;
  let storageWarningShown = false;

  function measure(): number {
    if (!article) return 0;
    const bounds = article.getBoundingClientRect();
    const articleTop = window.scrollY + bounds.top;
    const scrollable = Math.max(0, article.scrollHeight - window.innerHeight);
    if (scrollable === 0) return window.scrollY + window.innerHeight >= articleTop + article.scrollHeight ? 1 : 0;
    return Math.min(1, Math.max(0, (window.scrollY - articleTop) / scrollable));
  }

  function persist(force = false): void {
    const next = Math.round(position * 65535);
    if (!force && (next === lastPersisted || Math.abs(next - lastPersisted) < 655)) return;
    if (next === lastPersisted) return;
    try {
      const result = updateQuestionReadingProgress(questionId, next);
      lastPersisted = next;
      if (!result.persisted && !storageWarningShown) {
        storageWarningShown = true;
        Sonner.toast.warning('Reading progress is available in this tab only', { description: 'Browser storage is unavailable.' });
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Cannot update reading progress: saved progress is invalid') {
        Sonner.toast.error('Reading position could not be saved', { description: 'Stored progress is invalid. Use Manage Progress to recover it.' });
        return;
      }
      throw error;
    }
  }

  function handleScroll(): void {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      position = measure();
      if (persistTimer !== undefined) window.clearTimeout(persistTimer);
      persistTimer = window.setTimeout(() => persist(), 1200);
    });
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') flush();
  }


  function flush(): void {
    if (persistTimer !== undefined) window.clearTimeout(persistTimer);
    position = measure();
    persist(true);
  }

  onMount(() => {
    article = document.querySelector<HTMLElement>('[data-article-swipe]');
    if (!article) throw new Error('Reading progress requires an article container');
    const unsubscribe = subscribeToProgress((result) => {
      if (!result.ok) return;
    });
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      unsubscribe();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (persistTimer !== undefined) window.clearTimeout(persistTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  });
</script>

<div
  class="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] bg-transparent"
  role="progressbar"
  aria-label="Article reading progress"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={Math.round(position * 100)}
>
  <div
    class="h-full origin-left bg-primary transition-[width] duration-150"
    style={`width: ${position * 100}%`}
  ></div>
</div>
