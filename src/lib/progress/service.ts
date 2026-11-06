import { announceProgressChange, subscribeToProgressChanges } from './events.ts';
import { createProgressSnapshot, parseProgressSnapshot, type ProgressSnapshot } from './model.ts';
import { getProgressStorage, writeProgress, type ProgressReadResult } from './storage.ts';

export interface ProgressSaveResult {
  readonly snapshot: ProgressSnapshot;
  readonly persisted: boolean;
}

/** Persist and broadcast a new completion set through the shared progress boundary. */
export function saveProgress(completed: readonly string[]): ProgressSaveResult {
  const snapshot = createProgressSnapshot(completed);
  const persisted = writeProgress(getProgressStorage(), snapshot);

  announceProgressChange(snapshot);

  return { snapshot, persisted };
}

/** Replace local progress with a previously validated snapshot. */
export function replaceProgress(snapshot: ProgressSnapshot): ProgressSaveResult {
  const normalized = parseProgressSnapshot(snapshot);
  const persisted = writeProgress(getProgressStorage(), normalized);

  announceProgressChange(normalized);

  return { snapshot: normalized, persisted };
}

export function subscribeToProgress(listener: (result: ProgressReadResult) => void): () => void {
  return subscribeToProgressChanges(listener);
}

/** Toggle one question's completion without duplicating mutation logic in UI components. */
export function toggleQuestionCompletion(
  questionId: string,
  completed: readonly string[],
): ProgressSaveResult {
  const next = new Set(completed);

  if (next.has(questionId)) {
    next.delete(questionId);
  } else {
    next.add(questionId);
  }

  return saveProgress([...next]);
}
