export const PROGRESS_VERSION = 1 as const;
export const PROGRESS_STORAGE_KEY = 'frontend-atlas:progress:v1';

export interface ProgressSnapshot {
  readonly version: typeof PROGRESS_VERSION;
  readonly completed: readonly string[];
  readonly updatedAt: string;
}

export const PROGRESS_CHANGE_EVENT = 'frontend-atlas:progress-change';

export function announceProgressChange(snapshot: ProgressSnapshot): void {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') {return;}

  window.dispatchEvent(
    new CustomEvent<ProgressSnapshot>(PROGRESS_CHANGE_EVENT, { detail: snapshot }),
  );
}

export type ProgressReadResult =
  | { readonly ok: true; readonly snapshot: ProgressSnapshot }
  | { readonly ok: false; readonly reason: 'unavailable' | 'invalid-data' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isExpectedStorageFailure(error: unknown): boolean {
  return (
    error instanceof DOMException && ['QuotaExceededError', 'SecurityError'].includes(error.name)
  );
}

export function createProgressSnapshot(
  completed: readonly string[],
  now = new Date(),
): ProgressSnapshot {
  const normalized = [...new Set(completed)].sort();

  if (normalized.some((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id))) {
    throw new TypeError('Progress contains an invalid question id');
  }

  if (Number.isNaN(now.getTime())) {
    throw new RangeError('Progress timestamp must be a valid date');
  }

  return {
    version: PROGRESS_VERSION,
    completed: normalized,
    updatedAt: now.toISOString(),
  };
}

export function parseProgressSnapshot(input: unknown): ProgressSnapshot {
  if (!isRecord(input)) {
    throw new TypeError('Progress import must be a JSON object');
  }

  if (input.version !== PROGRESS_VERSION) {
    throw new RangeError(`Unsupported progress version: ${String(input.version)}`);
  }

  if (!Array.isArray(input.completed) || !input.completed.every((id) => typeof id === 'string')) {
    throw new TypeError('Progress completed field must be an array of question ids');
  }

  if (typeof input.updatedAt !== 'string' || Number.isNaN(Date.parse(input.updatedAt))) {
    throw new TypeError('Progress updatedAt field must be a valid timestamp');
  }

  return createProgressSnapshot(input.completed, new Date(input.updatedAt));
}

export function readProgress(storage: Storage | undefined): ProgressReadResult {
  if (!storage) {
    return { ok: false, reason: 'unavailable' };
  }

  let raw: string | null;

  try {
    raw = storage.getItem(PROGRESS_STORAGE_KEY);
  } catch (error) {
    if (isExpectedStorageFailure(error)) {
      return { ok: false, reason: 'unavailable' };
    }

    throw error;
  }

  if (raw === null) {
    return { ok: true, snapshot: createProgressSnapshot([]) };
  }

  try {
    return { ok: true, snapshot: parseProgressSnapshot(JSON.parse(raw) as unknown) };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError) {
      return { ok: false, reason: 'invalid-data' };
    }

    throw error;
  }
}

export function writeProgress(storage: Storage | undefined, snapshot: ProgressSnapshot): boolean {
  if (!storage) {
    return false;
  }

  const normalized = parseProgressSnapshot(snapshot);

  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(normalized));

    return true;
  } catch (error) {
    if (isExpectedStorageFailure(error)) {
      return false;
    }

    throw error;
  }
}
