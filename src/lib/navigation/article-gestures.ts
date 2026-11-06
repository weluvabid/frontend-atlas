export interface ArticleSwipeTargets {
  readonly previousUrl: string | null;
  readonly nextUrl: string | null;
  readonly threshold?: number;
}

export function resolveArticleSwipeDestination(
  deltaX: number,
  deltaY: number,
  targets: ArticleSwipeTargets,
): string | null {
  const threshold = targets.threshold ?? 72;

  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new RangeError(`Swipe threshold must be a positive finite number; received ${threshold}`);
  }

  if (Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) {
    return null;
  }

  return deltaX < 0 ? targets.nextUrl : targets.previousUrl;
}

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

/** Attach touch-only horizontal article navigation and return deterministic cleanup. */
export function attachArticleSwipeNavigation(targets: ArticleSwipeTargets): () => void {
  const root = window;
  let start: { x: number; y: number; pointerId: number; article: HTMLElement } | null = null;

  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch' || !event.isPrimary || event.button !== 0) {
      return;
    }

    if (event.clientX < 24 || event.clientX > root.innerWidth - 24) {
      return;
    }

    if (!(event.target instanceof Element)) {
      return;
    }

    const article = event.target.closest<HTMLElement>('article[data-article-swipe]');

    if (!article || event.target.closest(ignoredSwipeTargets)) {
      return;
    }

    start = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, article };
  }

  function onPointerUp(event: PointerEvent): void {
    if (!start || event.pointerId !== start.pointerId) {
      return;
    }

    const origin = start;

    start = null;

    if (event.pointerType !== 'touch' || !(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest('article[data-article-swipe]') !== origin.article) {
      return;
    }

    if (event.target.closest(ignoredSwipeTargets) || root.getSelection()?.toString()) {
      return;
    }

    const destination = resolveArticleSwipeDestination(
      event.clientX - origin.x,
      event.clientY - origin.y,
      targets,
    );

    if (destination) {
      root.location.assign(destination);
    }
  }

  function reset(): void {
    start = null;
  }

  root.addEventListener('pointerdown', onPointerDown, { passive: true });
  root.addEventListener('pointerup', onPointerUp, { passive: true });
  root.addEventListener('pointercancel', reset, { passive: true });

  return () => {
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointerup', onPointerUp);
    root.removeEventListener('pointercancel', reset);
  };
}
