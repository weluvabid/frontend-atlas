<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Tooltip } from '@weluvabid/iris/components';
  import { ChevronLeft, ChevronRight } from '@weluvabid/iris/lucide';

  interface NavigationTarget {
    title: string;
    url: string;
  }

  interface Props {
    previous: NavigationTarget | null;
    next: NavigationTarget | null;
  }

  let { previous, next }: Props = $props();

  const ignoredSwipeTargets = [
    'a',
    'button',
    'input',
    'textarea',
    'select',
    'summary',
    'pre',
    'code',
    '[contenteditable="true"]',
    '[data-no-swipe]',
  ].join(',');

  onMount(() => {
    let start: { x: number; y: number; pointerId: number; article: HTMLElement } | null = null;

    function onPointerDown(event: PointerEvent): void {
      if (event.pointerType !== 'touch' || !event.isPrimary || event.button !== 0) return;
      if (event.clientX < 24 || event.clientX > window.innerWidth - 24) return;
      if (!(event.target instanceof Element)) return;

      const article = event.target.closest<HTMLElement>('article[data-article-swipe]');
      if (!article || event.target.closest(ignoredSwipeTargets)) return;

      start = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
        article,
      };
    }

    function onPointerUp(event: PointerEvent): void {
      if (!start || event.pointerId !== start.pointerId) return;

      const origin = start;
      start = null;

      if (event.pointerType !== 'touch' || !(event.target instanceof Element)) return;
      if (event.target.closest('article[data-article-swipe]') !== origin.article) return;
      if (event.target.closest(ignoredSwipeTargets)) return;
      if (window.getSelection()?.toString()) return;

      const deltaX = event.clientX - origin.x;
      const deltaY = event.clientY - origin.y;
      if (Math.abs(deltaX) < 72 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

      const destination = deltaX < 0 ? next : previous;
      if (destination) window.location.assign(destination.url);
    }

    function reset(): void {
      start = null;
    }

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', reset, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', reset);
    };
  });
</script>

{#if previous || next}
  <Tooltip.Provider delayDuration={350}>
    <nav
      class="pointer-events-none fixed inset-0 z-30 hidden lg:block"
      aria-label="Navigate between questions in this domain"
    >
      {#if previous}
        <div
          class="pointer-events-none absolute top-1/2 -translate-y-1/2 [left:max(1rem,calc((100vw-48rem)/2-3.5rem))]"
        >
          <Tooltip.Root>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <Button.Root
                  {...props}
                  variant="ghost"
                  size="icon"
                  class="pointer-events-auto rounded-full border border-border/70 bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
                  href={previous.url}
                  data-article-previous
                  aria-keyshortcuts="["
                  aria-label={`Previous question: ${previous.title}`}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button.Root>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="right">{previous.title}</Tooltip.Content>
          </Tooltip.Root>
        </div>
      {/if}

      {#if next}
        <div
          class="pointer-events-none absolute top-1/2 -translate-y-1/2 [right:max(1rem,calc((100vw-48rem)/2-3.5rem))]"
        >
          <Tooltip.Root>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <Button.Root
                  {...props}
                  variant="ghost"
                  size="icon"
                  class="pointer-events-auto rounded-full border border-border/70 bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
                  href={next.url}
                  data-article-next
                  aria-keyshortcuts="]"
                  aria-label={`Next question: ${next.title}`}
                >
                  <ChevronRight aria-hidden="true" />
                </Button.Root>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="left">{next.title}</Tooltip.Content>
          </Tooltip.Root>
        </div>
      {/if}
    </nav>
  </Tooltip.Provider>
{/if}
