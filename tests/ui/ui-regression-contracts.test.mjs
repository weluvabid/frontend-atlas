import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const styles = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const toaster = await readFile(
  new URL('../src/components/site/AtlasToaster.svelte', import.meta.url),
  'utf8',
);
const qrTransfer = await readFile(
  new URL('../src/components/progress/ProgressQrTransfer.svelte', import.meta.url),
  'utf8',
);
const keyboardController = await readFile(
  new URL('../src/lib/keyboard/controller.ts', import.meta.url),
  'utf8',
);
const helpDialog = await readFile(
  new URL('../src/components/site/HelpDialog.svelte', import.meta.url),
  'utf8',
);
const qrWorker = await readFile(
  new URL('../src/components/progress/qr-decoder.worker.ts', import.meta.url),
  'utf8',
);
const readingProgress = await readFile(
  new URL('../src/components/progress/ReadingProgress.svelte', import.meta.url),
  'utf8',
);
const articlePage = await readFile(
  new URL('../src/pages/questions/[...slug].astro', import.meta.url),
  'utf8',
);
const progressOverview = await readFile(
  new URL('../src/components/progress/ProgressOverview.svelte', import.meta.url),
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
    /AlertDialog\.Content class="max-h-\[calc\(100dvh-2rem\)\] w-\[calc\(100vw-2rem\)\]/u,
  );
});

test('keyboard shortcuts are blocked by confirmation alert dialogs', () => {
  assert.ok(
    keyboardController.includes(
      '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
    ),
  );
});

test('reading progress remains dynamic and doubles as an accessible completion control', () => {
  assert.match(readingProgress, /<Check class="absolute size-4" aria-hidden="true" \/>/u);
  assert.match(readingProgress, /aria-pressed=\{completed\}/u);
  assert.ok(readingProgress.includes('role="progressbar"'));
  assert.ok(readingProgress.includes('aria-valuenow={Math.round(position * 100)}'));
  assert.match(readingProgress, /data-completion-toggle/u);
  assert.match(readingProgress, /aria-keyshortcuts="M"/u);
  assert.match(readingProgress, /stroke-dasharray="69\.115"/u);
  assert.match(readingProgress, /stroke-dashoffset=\{69\.115 \* \(1 - position\)\}/u);
  assert.match(readingProgress, /toggleQuestionCompletion\(questionId, completedIds\)/u);
});

test('article completion has one control and the progress summary retains its floating elevation', () => {
  assert.doesNotMatch(articlePage, /ProgressControl/u);
  assert.match(
    progressOverview,
    /shadow-lg shadow-black\/10 backdrop-blur-md dark:shadow-black\/30/u,
  );
});
