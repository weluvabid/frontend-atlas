<script lang="ts">
  import { onMount } from 'svelte';
  import { SiteHeader, Button, Tooltip, Dialog, Kbd } from '@weluvabid/iris/components';
  import { BookSearch, Moon, Sun, Search, CircleHelp } from '@weluvabid/iris/lucide';
  import { SiGithub } from '@weluvabid/iris/simple-icons';
  import { getInitialTheme, toggleTheme } from '@weluvabid/iris/theme';
  import SearchPanel from '@components/search/SearchPanel.svelte';
  import { appendNavigationDigit, resolveNavigationIndex } from '@lib/keyboard';

  let theme = $state<'light' | 'dark'>('light');
  let searchOpen = $state(false);
  let helpOpen = $state(false);
  let navigationSequence = $state('');
  let navigationMode = $state(false);
  let navigationTimer: number | undefined;
  let navigationCollection: HTMLElement | null = null;

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target.isContentEditable ||
      target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]') !== null
    );
  }

  function hasBlockingOverlay(): boolean {
    return Array.from(
      document.querySelectorAll<HTMLElement>('[role="dialog"], [role="menu"], [role="listbox"]'),
    ).some((overlay) => {
      if (overlay.hidden || overlay.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(overlay);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        overlay.getClientRects().length > 0
      );
    });
  }

  function publishNavigationPrompt(active: boolean, value = '', message = ''): void {
    window.dispatchEvent(
      new CustomEvent('atlas:card-navigation-prompt', {
        detail: { active, value, message },
      }),
    );
  }

  function clearNavigationSequence(message = ''): void {
    if (navigationTimer !== undefined) window.clearTimeout(navigationTimer);
    navigationTimer = undefined;
    navigationSequence = '';
    navigationMode = false;
    navigationCollection = null;
    publishNavigationPrompt(false, '', message);
  }

  function armNavigationTimeout(): void {
    if (navigationTimer !== undefined) window.clearTimeout(navigationTimer);
    navigationTimer = window.setTimeout(() => clearNavigationSequence(), 2000);
  }

  function visibleCardLinks(collection: HTMLElement): HTMLAnchorElement[] {
    return Array.from(
      collection.querySelectorAll<HTMLAnchorElement>('a[data-card-navigation]'),
    ).filter((link) => {
      if (link.hidden || link.getAttribute('aria-hidden') === 'true') return false;
      if (link.closest('[hidden], [aria-hidden="true"]')) return false;
      const style = window.getComputedStyle(link);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        link.getClientRects().length > 0
      );
    });
  }

  function navigateToNumberedCard(value: string, preferredCollection: HTMLElement | null): void {
    const collection = preferredCollection?.isConnected
      ? preferredCollection
      : document.querySelector<HTMLElement>('[data-keyboard-navigation="primary"]');

    if (!collection) {
      clearNavigationSequence('There are no numbered cards on this page.');
      return;
    }

    const links = visibleCardLinks(collection);
    const index = resolveNavigationIndex(value, links.length);
    if (index === null) {
      clearNavigationSequence(`No visible card numbered ${value} in this list.`);
      return;
    }

    links[index]?.click();
  }

  function activateShortcutTarget(selector: string): boolean {
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return false;
    target.click();
    return true;
  }

  onMount(() => {
    theme = getInitialTheme();

    function handleShortcut(event: KeyboardEvent): void {
      if (event.defaultPrevented || event.isComposing) return;

      const key = event.key;
      const hasModifier = event.metaKey || event.ctrlKey || event.altKey;

      if (hasModifier && key.toLowerCase() === 'k') {
        event.preventDefault();
        clearNavigationSequence();
        helpOpen = false;
        searchOpen = true;
        return;
      }

      if (helpOpen || searchOpen || hasBlockingOverlay()) return;

      // While G-navigation is active, capture keys before focused controls can
      // interpret Enter or other keys as their own activation shortcuts.
      if (navigationMode) {
        if (/^\d$/u.test(key) && !hasModifier && !event.shiftKey) {
          event.preventDefault();
          navigationSequence = appendNavigationDigit(navigationSequence, key);
          publishNavigationPrompt(true, navigationSequence);
          armNavigationTimeout();
          return;
        }

        if (key === 'Enter' && !hasModifier) {
          event.preventDefault();
          const value = navigationSequence;
          const collection = navigationCollection;
          clearNavigationSequence();
          if (value) navigateToNumberedCard(value, collection);
          return;
        }

        if (key === 'Backspace' && !hasModifier) {
          event.preventDefault();
          navigationSequence = navigationSequence.slice(0, -1);
          publishNavigationPrompt(true, navigationSequence);
          armNavigationTimeout();
          return;
        }

        if (key === 'Escape') {
          event.preventDefault();
          clearNavigationSequence();
          return;
        }

        clearNavigationSequence();
        return;
      }

      if (
        key === '?' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        clearNavigationSequence();
        helpOpen = true;
        return;
      }

      if (isEditableTarget(event.target)) return;
      if (hasModifier || event.shiftKey) return;

      switch (key.toLowerCase()) {
        case 'g':
          event.preventDefault();
          navigationSequence = '';
          navigationMode = true;
          const active = document.activeElement;
          navigationCollection =
            active instanceof Element
              ? active.closest<HTMLElement>('[data-keyboard-navigation]')
              : null;
          publishNavigationPrompt(true, '');
          armNavigationTimeout();
          break;
        case '[':
          if (activateShortcutTarget('a[data-article-previous]')) event.preventDefault();
          break;
        case ']':
          if (activateShortcutTarget('a[data-article-next]')) event.preventDefault();
          break;
        case 'm':
          if (activateShortcutTarget('[data-completion-toggle]')) event.preventDefault();
          break;
        case 'p':
          if (activateShortcutTarget('[data-progress-menu-trigger]')) event.preventDefault();
          break;
      }
    }

    window.addEventListener('keydown', handleShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleShortcut, true);
      if (navigationTimer !== undefined) window.clearTimeout(navigationTimer);
    };
  });

  function handleThemeToggle(): void {
    theme = toggleTheme(theme);
  }
</script>

<Tooltip.Provider delayDuration={300}>
  <Dialog.Root bind:open={helpOpen}>
    <SiteHeader>
      <a
        class="inline-flex min-h-10 shrink-0 items-center rounded-full font-semibold tracking-tight text-foreground no-underline"
        href="/"
        aria-label="Frontend Atlas home"
      >
        fa
      </a>

      <nav class="flex shrink-0 items-center gap-1" aria-label="Primary navigation">
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <Button.Root
                {...props}
                variant="ghost"
                size="icon"
                class="rounded-full"
                href="/domains/"
                aria-label="Explore domains"
              >
                <BookSearch aria-hidden="true" />
              </Button.Root>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>Explore domains</Tooltip.Content>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <Button.Root
                {...props}
                variant="ghost"
                size="icon"
                class="rounded-full"
                aria-label="Search the handbook"
                aria-keyshortcuts="Meta+K Control+K"
                onclick={() => (searchOpen = true)}
              >
                <Search aria-hidden="true" />
              </Button.Root>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>Search</Tooltip.Content>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <Button.Root
                {...props}
                variant="ghost"
                size="icon"
                class="rounded-full"
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                aria-pressed={theme === 'dark'}
                onclick={handleThemeToggle}
              >
                {#if theme === 'dark'}<Sun aria-hidden="true" />{:else}<Moon
                    aria-hidden="true"
                  />{/if}
              </Button.Root>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content
            >{theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}</Tooltip.Content
          >
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <Button.Root
                {...props}
                variant="ghost"
                size="icon"
                class="rounded-full"
                href="https://github.com/weluvabid/frontend-atlas"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Frontend Atlas on GitHub (opens in a new tab)"
              >
                <SiGithub aria-hidden="true" />
              </Button.Root>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>GitHub repository</Tooltip.Content>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <Button.Root
                {...props}
                variant="ghost"
                size="icon"
                class="rounded-full"
                aria-label="Help and keyboard shortcuts"
                aria-keyshortcuts="?"
                onclick={() => (helpOpen = true)}
              >
                <CircleHelp aria-hidden="true" />
              </Button.Root>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>Help</Tooltip.Content>
        </Tooltip.Root>
      </nav>
    </SiteHeader>

    <Dialog.Content class="sm:max-w-lg">
      <Dialog.Header>
        <Dialog.Title>Keyboard shortcuts</Dialog.Title>
        <Dialog.Description
          >Navigate Frontend Atlas without leaving the keyboard.</Dialog.Description
        >
      </Dialog.Header>

      <div class="space-y-5">
        <section aria-labelledby="help-navigation-heading">
          <h3
            id="help-navigation-heading"
            class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Navigation
          </h3>
          <dl class="space-y-3">
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted-foreground">Open search</dt>
              <dd class="flex items-center gap-1">
                <Kbd.Kbd>⌘ K</Kbd.Kbd><span class="text-muted-foreground">/</span><Kbd.Kbd
                  >Ctrl K</Kbd.Kbd
                >
              </dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted-foreground">Previous question</dt>
              <dd><Kbd.Kbd>[</Kbd.Kbd></dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted-foreground">Next question</dt>
              <dd><Kbd.Kbd>]</Kbd.Kbd></dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted-foreground">Go to numbered card</dt>
              <dd class="flex items-center gap-1">
                <Kbd.Kbd>G</Kbd.Kbd><span class="text-muted-foreground">then number</span>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted-foreground">Open selected card</dt>
              <dd><Kbd.Kbd>Enter</Kbd.Kbd></dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted-foreground">Edit card number</dt>
              <dd><Kbd.Kbd>Backspace</Kbd.Kbd></dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="help-reading-heading">
          <h3
            id="help-reading-heading"
            class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Reading
          </h3>
          <dl class="space-y-3">
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted-foreground">Toggle question completion</dt>
              <dd><Kbd.Kbd>M</Kbd.Kbd></dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted-foreground">Open progress menu</dt>
              <dd><Kbd.Kbd>P</Kbd.Kbd></dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="help-general-heading">
          <h3
            id="help-general-heading"
            class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            General
          </h3>
          <dl class="space-y-3">
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted-foreground">Open help</dt>
              <dd><Kbd.Kbd>?</Kbd.Kbd></dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted-foreground">Close dialog or cancel card navigation</dt>
              <dd><Kbd.Kbd>Esc</Kbd.Kbd></dd>
            </div>
          </dl>
        </section>
        <p class="text-xs text-muted-foreground">
          On touch screens, swipe left or right within an article to move between questions. For
          numbered cards, press G, type the card number, then press Enter. Backspace edits the
          number; the sequence expires after two seconds of inactivity.
        </p>
      </div>
    </Dialog.Content>
  </Dialog.Root>
</Tooltip.Provider>

<SearchPanel mode="dialog" bind:open={searchOpen} />
