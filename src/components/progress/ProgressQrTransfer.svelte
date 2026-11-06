<script lang="ts">
  import { Button, Dialog, Progress } from '@weluvabid/iris/components';
  import { Download, ImageUp, Trash2 } from '@weluvabid/iris/lucide';
  import { Sonner } from '@weluvabid/iris/components';
  import { decodeProgressQr, encodeProgressQr } from '@lib/progress/qr';
  import { clearProgress, mergeProgress, replaceProgress } from '@lib/progress/service';
  import { getInProgressIds, type ProgressSnapshot } from '@lib/progress/model';

  interface Props {
    open?: boolean;
    mode?: 'overview' | 'export' | 'import';
    snapshot: ProgressSnapshot;
    questionIds: string[];
    onImported: (snapshot: ProgressSnapshot) => void;
  }

  let { open = $bindable(false), mode = $bindable('overview'), snapshot, questionIds, onImported }: Props = $props();
  let qrUrl = $state('');
  let pendingSnapshot = $state<ProgressSnapshot | undefined>();
  let busy = $state(false);
  let fileInput = $state<HTMLInputElement>();

  const inProgressCount = $derived(getInProgressIds(snapshot).filter((id) => questionIds.includes(id)).length);
  const completedCount = $derived(snapshot.completed.filter((id) => questionIds.includes(id)).length);
  const completionPercentage = $derived(questionIds.length ? completedCount / questionIds.length * 100 : 0);

  $effect(() => {
    if (!open || mode !== 'export') return;
    let cancelled = false;
    qrUrl = '';

    void (async () => {
      const [{ default: encodeQR }, { svgToPng }] = await Promise.all([
        import('qr'),
        import('qr/dom.js'),
      ]);
      const payload = encodeProgressQr(snapshot, questionIds);
      const svg = encodeQR(payload, 'svg', { ecc: 'quartile', border: 4 });
      const pngDataUrl = await svgToPng(svg, 640, 640);
      if (cancelled) return;
      qrUrl = pngDataUrl;
    })().catch((error: unknown) => {
      if (cancelled) return;
      Sonner.toast.error('Could not generate progress QR image', {
        description: error instanceof Error ? error.message : 'An unexpected QR generation error occurred.',
      });
    });

    return () => { cancelled = true; };
  });

  function selectMode(next: 'export' | 'import'): void {
    pendingSnapshot = undefined;
    mode = next;
  }

  async function importQrImage(event: Event): Promise<void> {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;
    const file = input.files[0];
    input.value = '';
    pendingSnapshot = undefined;

    if (!file.type.startsWith('image/')) {
      Sonner.toast.error('Choose an image file containing a Frontend Atlas QR code.');
      return;
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      Sonner.toast.error('Image rejected', { description: 'The image must be between 1 byte and 10 MiB.' });
      return;
    }

    busy = true;
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      const pixels = bitmap.width * bitmap.height;
      if (bitmap.width === 0 || bitmap.height === 0 || pixels > 16_000_000) {
        throw new RangeError('Image dimensions exceed the 16-megapixel limit.');
      }
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas image processing is unavailable in this browser.');
      context.drawImage(bitmap, 0, 0);
      const { default: decodeQR } = await import('qr/decode.js');
      const payload = decodeQR(context.getImageData(0, 0, canvas.width, canvas.height), {
        effort: Infinity,
        timeLimit: Infinity,
      });
      pendingSnapshot = decodeProgressQr(payload, questionIds);
    } catch (error) {
      if (error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError) {
        Sonner.toast.error('QR image rejected', { description: error.message });
      } else if (error instanceof DOMException && ['EncodingError', 'InvalidStateError', 'NotSupportedError', 'OperationError', 'SecurityError'].includes(error.name)) {
        Sonner.toast.error('This image format could not be read', { description: 'Try a PNG or JPEG image.' });
      } else if (error instanceof Error && /QR|barcode|finder|pattern|decode/iu.test(error.message)) {
        Sonner.toast.error('No readable Frontend Atlas progress QR code was found.');
      } else {
        throw error;
      }
    } finally {
      bitmap?.close();
      busy = false;
    }
  }

  function applyImportedProgress(strategy: 'merge' | 'replace'): void {
    if (!pendingSnapshot) throw new Error('Cannot apply QR import without a validated snapshot.');
    const incomingCount = pendingSnapshot.completed.length;
    try {
      const result = strategy === 'merge' ? mergeProgress(pendingSnapshot) : replaceProgress(pendingSnapshot);
      onImported(result.snapshot);
      pendingSnapshot = undefined;
      if (!result.persisted) {
        Sonner.toast.warning('Progress is available in this tab only', { description: 'Browser storage is unavailable, so the change was not saved permanently.' });
      } else {
        Sonner.toast.success(strategy === 'merge' ? 'Progress merged' : 'Progress replaced', {
          description: `${incomingCount} completed questions imported.`,
        });
      }
      mode = 'overview';
    } catch (error) {
      if (error instanceof Error && error.message === 'Cannot merge progress: saved progress is invalid') {
        Sonner.toast.error('Local progress is invalid', { description: 'Replace local progress to recover it.' });
        return;
      }
      throw error;
    }
  }

  function exportDownloaded(): void {
    if (!qrUrl) throw new Error('Cannot export progress before the QR image has been generated.');
    Sonner.toast.success('Progress QR image downloaded');
  }

  function handleClearProgress(): void {
    if (!window.confirm('Clear all learning and reading progress stored on this device? This cannot be undone.')) return;
    const result = clearProgress();
    onImported(result.snapshot);
    if (result.persisted) Sonner.toast.success('Local progress cleared');
    else Sonner.toast.warning('Progress cleared for this tab only', { description: 'Browser storage is unavailable.' });
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Manage Progress</Dialog.Title>
      <Dialog.Description>
        Your learning progress is stored locally on this device. Transfer it between devices using a QR image.
      </Dialog.Description>
    </Dialog.Header>

    {#if mode === 'overview'}
      <section class="space-y-3 rounded-lg border border-border p-4" aria-label="Current learning progress">
        <div class="flex items-center justify-between gap-3 text-sm">
          <span class="text-muted-foreground">Completed</span>
          <span class="font-medium tabular-nums">{completedCount} / {questionIds.length}</span>
        </div>
        <Progress.Root value={completionPercentage} class="h-2" aria-label="Overall completion" />
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>{inProgressCount} in progress</span>
          <span>{Math.round(completionPercentage)}% complete</span>
        </div>
      </section>

      <section class="space-y-2" aria-labelledby="transfer-progress-heading">
        <h3 id="transfer-progress-heading" class="text-sm font-medium">Transfer progress</h3>
        <div class="grid gap-2 sm:grid-cols-2">
          <Button.Root variant="outline" class="justify-start" onclick={() => selectMode('export')}>
            <Download class="size-4" /> Export QR image
          </Button.Root>
          <Button.Root variant="outline" class="justify-start" onclick={() => selectMode('import')}>
            <ImageUp class="size-4" /> Import QR image
          </Button.Root>
        </div>
      </section>

      <div class="border-t border-border pt-3">
        <Button.Root variant="ghost" class="text-destructive hover:text-destructive" onclick={handleClearProgress}>
          <Trash2 class="size-4" /> Clear local progress
        </Button.Root>
      </div>
    {:else if mode === 'export'}
      <div class="space-y-4">
        <Button.Root variant="ghost" size="sm" onclick={() => (mode = 'overview')}>← Back to progress</Button.Root>
        <div class="flex flex-col items-center gap-3 py-2">
          {#if qrUrl}
            <img src={qrUrl} alt="Frontend Atlas progress QR code" class="aspect-square w-64 max-w-full rounded-md bg-white p-2" />
            <a href={qrUrl} download="frontend-atlas-progress.png" onclick={exportDownloaded} class="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline">
              <Download class="size-4" /> Save QR image
            </a>
          {:else}
            <p class="text-sm text-muted-foreground" role="status">Generating QR image…</p>
          {/if}
          <p class="max-w-sm text-center text-xs text-muted-foreground">Keep the saved image somewhere safe. Anyone with the image can read its progress data.</p>
        </div>
      </div>
    {:else}
      <div class="space-y-3">
        <Button.Root variant="ghost" size="sm" onclick={() => (mode = 'overview')}>← Back to progress</Button.Root>
        <p class="text-sm text-muted-foreground">Choose a PNG, JPEG, WebP, or other supported image containing a Frontend Atlas progress QR code.</p>
        <Button.Root variant="outline" class="w-full" disabled={busy} onclick={() => fileInput.click()}>
          <ImageUp class="size-4" /> {busy ? 'Reading image…' : 'Choose QR image'}
        </Button.Root>
        <input bind:this={fileInput} class="sr-only" type="file" accept="image/*" onchange={importQrImage} aria-label="Choose an image containing a Frontend Atlas progress QR code" />
        {#if pendingSnapshot}
          <div class="space-y-3 rounded-md border border-border p-3 text-sm">
            <p class="font-medium">QR code validated</p>
            <p class="text-muted-foreground">{pendingSnapshot.completed.length} completed · {Object.keys(pendingSnapshot.readingProgress).length} saved reading positions</p>
            <div class="flex flex-wrap gap-2">
              <Button.Root size="sm" onclick={() => applyImportedProgress('merge')}>Merge progress</Button.Root>
              <Button.Root size="sm" variant="outline" onclick={() => applyImportedProgress('replace')}>Replace local progress</Button.Root>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <Dialog.Footer>
      <Button.Root variant="outline" onclick={() => (open = false)}>Close</Button.Root>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
