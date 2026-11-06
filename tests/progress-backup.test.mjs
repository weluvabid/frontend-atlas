import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProgressBackup,
  MAX_PROGRESS_BACKUP_BYTES,
  parseProgressBackup,
} from '../src/lib/progress/backup.ts';
import { createProgressSnapshot } from '../src/lib/progress/model.ts';

const knownIds = new Set(['closures', 'event-loop']);

test('progress backup serializes a normalized snapshot and round-trips', () => {
  const snapshot = createProgressSnapshot(
    ['event-loop', 'closures', 'event-loop'],
    new Date('2026-01-01T00:00:00.000Z'),
  );
  const backup = createProgressBackup(snapshot);

  assert.match(backup, /"version": 1/u);
  assert.deepEqual(parseProgressBackup(backup, knownIds), snapshot);
});

test('progress backup rejects oversized payloads before parsing', () => {
  const oversized = ' '.repeat(MAX_PROGRESS_BACKUP_BYTES + 1);

  assert.throws(() => parseProgressBackup(oversized, knownIds), /64 KiB limit/u);
});

test('progress backup rejects question ids unknown to the current handbook', () => {
  const backup = JSON.stringify(createProgressSnapshot(['removed-question']));

  assert.throws(() => parseProgressBackup(backup, knownIds), /not in this handbook version/u);
});

test('progress backup preserves JSON and schema errors for the UI to report', () => {
  assert.throws(() => parseProgressBackup('{broken', knownIds), SyntaxError);
  assert.throws(() => parseProgressBackup('null', knownIds), /JSON object/u);
});
