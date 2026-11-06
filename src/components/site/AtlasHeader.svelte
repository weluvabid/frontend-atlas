<script lang="ts">
  import { SiteHeader } from '@weluvabid/iris/components';
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
    <a
      class="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      href="#domains"
    >
      Explore
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
