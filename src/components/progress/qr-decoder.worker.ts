/// <reference lib="webworker" />

interface DecodeRequest {
  readonly bitmap: ImageBitmap;
}

interface DecodeSuccess {
  readonly ok: true;
  readonly payload: string;
}

interface DecodeFailure {
  readonly ok: false;
  readonly message: string;
}

const scope = self as DedicatedWorkerGlobalScope;

scope.addEventListener('message', async (event: MessageEvent<DecodeRequest>) => {
  const { bitmap } = event.data;

  try {
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('OffscreenCanvas is unavailable in this browser.');
    }

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      throw new Error('Canvas image processing is unavailable in this browser.');
    }

    context.drawImage(bitmap, 0, 0);

    const { default: decodeQR } = await import('qr/decode.js');
    const payload = decodeQR(context.getImageData(0, 0, canvas.width, canvas.height), {
      effort: Infinity,
      timeLimit: 1_500,
    });

    if (typeof payload !== 'string' || payload.length === 0) {
      throw new Error('The image does not contain a readable QR payload.');
    }

    const response: DecodeSuccess = { ok: true, payload };

    scope.postMessage(response);
  } catch (error) {
    const response: DecodeFailure = {
      ok: false,
      message: error instanceof Error ? error.message : 'QR decoding failed.',
    };

    scope.postMessage(response);
  } finally {
    bitmap.close();
  }
});
