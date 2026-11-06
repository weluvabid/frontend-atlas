export const PROGRESS_VERSION = 1 as const;
export const PROGRESS_STORAGE_KEY = 'frontend-atlas:progress:v1';

export interface ProgressSnapshot {
  readonly version: typeof PROGRESS_VERSION;
  readonly completed: readonly string[];
  readonly updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
