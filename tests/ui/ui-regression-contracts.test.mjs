import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const styles = await readFile(new URL('../../src/styles/global.css', import.meta.url), 'utf8');
const toaster = await readFile(
  new URL('../../src/components/site/AtlasToaster.svelte', import.meta.url),
  'utf8',
);
const qrTransfer = await readFile(
  new URL('../../src/components/progress/ProgressQrTransfer.svelte', import.meta.url),
  'utf8',
);
const keyboardController = await readFile(
  new URL('../../src/lib/keyboard/controller.ts', import.meta.url),
  'utf8',
);
const helpDialog = await readFile(
  new URL('../../src/components/site/HelpDialog.svelte', import.meta.url),
  'utf8',
);
const qrWorker = await readFile(
  new URL('../../src/components/progress/qr-decoder.worker.ts', import.meta.url),
  'utf8',
);
const articlePage = await readFile(
  new URL('../../src/pages/questions/[...slug].astro', import.meta.url),
  'utf8',
);
const progressOverview = await readFile(
  new URL('../../src/components/progress/ProgressOverview.svelte', import.meta.url),
  'utf8',
);
const baseLayout = await readFile(
  new URL('../../src/layouts/BaseLayout.astro', import.meta.url),
  'utf8',
);

test('Sonner descriptions do not inherit the library default opacity', () => {
  assert.match(styles, /\[data-sonner-toast\]\s+\[data-description\][\s\S]*?opacity:\s*1;/u);
  assert.match(
    styles,
    /\[data-sonner-toast\]\s+\[data-description\][\s\S]*?color:\s*var\(--muted-foreground\);/u,
  );
});

test('Sonner close controls stay inside the notification surface', () => {
  assert.match(
    styles,
    /\[data-sonner-toast\]\s+\[data-close-button\][\s\S]*?inset:\s*0\.5rem\s+0\.5rem\s+auto\s+auto;/u,
  );
  assert.match(styles, /\[data-sonner-toast\][\s\S]*?padding-inline-end:\s*2\.75rem;/u);
  assert.match(toaster, /position="bottom-right"\s+closeButton/u);
  assert.match(toaster, /astro:before-preparation/u);
  assert.match(toaster, /Sonner\.toast\.dismiss\(\)/u);
});

test('QR image decoding is delegated to a bounded worker', () => {
  assert.match(
    qrTransfer,
    /new Worker\(new URL\('\.\/qr-decoder\.worker\.ts', import\.meta\.url\)/u,
  );
  assert.match(qrTransfer, /\},\s*2_000\);/u);
  assert.match(qrWorker, /timeLimit:\s*1_500/u);
  assert.match(qrWorker, /new OffscreenCanvas\(/u);
  assert.match(qrWorker, /bitmap\.close\(\)/u);
});

test('primary dialogs retain viewport gutters and bounded scrolling on mobile', () => {
  assert.match(qrTransfer, /max-h-\[calc\(100dvh-2rem\)\][\s\S]*?w-\[calc\(100vw-2rem\)\]/u);
  assert.match(helpDialog, /max-h-\[calc\(100dvh-2rem\)\][\s\S]*?w-\[calc\(100vw-2rem\)\]/u);
  assert.match(
    qrTransfer,
    /AlertDialog\.Content\s+class="max-h-\[calc\(100dvh-2rem\)\] w-\[calc\(100vw-2rem\)\]/u,
  );
});

test('keyboard shortcuts are blocked by confirmation alert dialogs', () => {
  assert.ok(
    keyboardController.includes(
      '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
    ),
  );
});

test('article completion and overall progress share one accessible compound control', () => {
  assert.match(progressOverview, /data-completion-toggle/u);
  assert.match(progressOverview, /aria-pressed=\{articleCompleted\}/u);
  assert.match(progressOverview, /aria-keyshortcuts="M"/u);
  assert.match(progressOverview, /stroke-dasharray="81\.681"/u);
  assert.match(progressOverview, /stroke-dashoffset=\{81\.681 \* \(1 - readingPosition\)\}/u);
  assert.match(
    progressOverview,
    /toggleQuestionCompletion\(questionId, currentSnapshot\.completed\)/u,
  );
  assert.match(progressOverview, /grid-cols-\[44px_minmax\(0,1fr\)\]/u);
  assert.match(progressOverview, /row-span-2 row-start-1/u);
  assert.match(progressOverview, /col-start-2 row-start-2 min-w-0/u);
  assert.match(
    progressOverview,
    /articleCompleted\s+\?\s+'text-emerald-600 dark:text-emerald-400'\s+:\s+'text-foreground'/u,
  );
  assert.match(progressOverview, /stroke="currentColor"/u);
  assert.match(
    progressOverview,
    /articleCompleted\s+\?\s+'text-emerald-200 dark:text-emerald-900\/70'\s+:\s+'text-border'/u,
  );
  assert.match(progressOverview, /class="h-1\.5 \[&>div\]:bg-foreground"/u);
  assert.match(progressOverview, /astro:page-load/u);
  assert.match(
    progressOverview,
    /completed\s+<span class="hidden sm:inline">on this device<\/span>/u,
  );
  assert.match(
    progressOverview,
    /shadow-lg shadow-black\/10 backdrop-blur-md dark:shadow-black\/30/u,
  );
  assert.match(articlePage, /questionId=\{question\.id\}/u);
  assert.match(baseLayout, /transition:persist="atlas-progress-overview"/u);
  assert.doesNotMatch(articlePage, /ReadingProgress/u);
});

test('article completion has one control and the progress summary retains its floating elevation', () => {
  assert.doesNotMatch(articlePage, /ProgressControl/u);
  assert.match(
    progressOverview,
    /shadow-lg shadow-black\/10 backdrop-blur-md dark:shadow-black\/30/u,
  );
});
