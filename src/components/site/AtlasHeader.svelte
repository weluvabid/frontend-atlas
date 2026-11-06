<script lang="ts">
  import { onMount } from 'svelte';
  import { SiteHeader } from '@weluvabid/iris/components';
  import { getInitialTheme, toggleTheme } from '@weluvabid/iris/theme';

  let theme = $state<'light' | 'dark'>('light');

  onMount(() => {
    theme = getInitialTheme();
  });

  function handleThemeToggle(): void {
    theme = toggleTheme(theme);
  }
</script>

<SiteHeader>
  <a
    class="inline-flex min-h-11 items-center gap-2 rounded-full font-semibold tracking-tight text-foreground no-underline"
    href="/"
    aria-label="Frontend Atlas home"
  >
    <span
      class="inline-flex size-8 items-center justify-center rounded-xl border border-border bg-muted text-sm font-bold"
      aria-hidden="true"
    >
      fa
    </span>
    <span>Frontend Atlas</span>
  </a>

  <nav class="flex items-center gap-1 sm:gap-2" aria-label="Primary navigation">
    <button
      class="inline-flex size-10 items-center justify-center rounded-full text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      type="button"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      aria-pressed={theme === 'dark'}
      onclick={handleThemeToggle}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
    <a
      class="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      href="/domains/"
    >
      Explore
    </a>
    <a
      class="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      href="/search/"
    >
      Search
    </a>
    <a
      class="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      href="https://github.com/weluvabid/frontend-atlas"
      target="_blank"
      rel="noopener noreferrer"
    >
      GitHub <span class="sr-only">(opens in a new tab)</span>
    </a>
  </nav>
</SiteHeader>
