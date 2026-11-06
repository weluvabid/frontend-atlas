import { parseProgressSnapshot, type ProgressSnapshot } from './model.ts';

export const MAX_PROGRESS_BACKUP_BYTES = 64 * 1024;

export function createProgressBackup(snapshot: ProgressSnapshot): string {
  return JSON.stringify(parseProgressSnapshot(snapshot), null, 2);
}

export function parseProgressBackup(
  source: string,
  knownIds: ReadonlySet<string>,
): ProgressSnapshot {
  const byteLength = new TextEncoder().encode(source).byteLength;

  if (byteLength > MAX_PROGRESS_BACKUP_BYTES) {
    throw new RangeError(`Progress file exceeds the ${MAX_PROGRESS_BACKUP_BYTES / 1024} KiB limit`);
  }

  const parsed: unknown = JSON.parse(source);
  const snapshot = parseProgressSnapshot(parsed);
  const unknownIds = snapshot.completed.filter((id) => !knownIds.has(id));

  if (unknownIds.length > 0) {
    throw new RangeError(
      `Progress contains ${unknownIds.length} question id(s) that are not in this handbook version`,
    );
  }

  return snapshot;
}

/** Trigger a browser download and revoke its object URL after the click is dispatched. */
export function downloadProgressBackup(snapshot: ProgressSnapshot): void {
  const blob = new Blob([createProgressBackup(snapshot)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = 'frontend-atlas-progress.json';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
