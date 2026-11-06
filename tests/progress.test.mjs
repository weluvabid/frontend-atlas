import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProgressSnapshot,
  parseProgressSnapshot,
  PROGRESS_STORAGE_KEY,
  readProgress,
  writeProgress,
} from '../src/lib/progress.ts';

function createStorage(initial = null) {
  let value = initial;

  return {
    getItem(key) {
      assert.equal(key, PROGRESS_STORAGE_KEY);

      return value;
    },
    setItem(key, next) {
      assert.equal(key, PROGRESS_STORAGE_KEY);
      value = next;
    },
    get value() {
      return value;
    },
  };
}

test('snapshot normalizes ordering and duplicates', () => {
  const snapshot = createProgressSnapshot(
    ['zeta', 'alpha', 'zeta'],
    new Date('2026-01-01T00:00:00.000Z'),
  );

  assert.deepEqual(snapshot.completed, ['alpha', 'zeta']);
  assert.equal(snapshot.version, 1);
});

test('snapshot rejects malformed ids and invalid dates', () => {
  assert.throws(() => createProgressSnapshot(['not a valid id']), TypeError);
  assert.throws(() => createProgressSnapshot([], new Date('invalid')), RangeError);
});

test('import rejects unknown schema versions and malformed fields', () => {
  assert.throws(
    () => parseProgressSnapshot({ version: 2, completed: [], updatedAt: new Date().toISOString() }),
    /Unsupported progress version/,
  );
  assert.throws(
    () =>
      parseProgressSnapshot({ version: 1, completed: [4], updatedAt: new Date().toISOString() }),
    /array of question ids/,
  );
  assert.throws(
    () => parseProgressSnapshot({ version: 1, completed: [], updatedAt: 'invalid' }),
    /valid timestamp/,
  );
});

test('storage round-trips valid progress', () => {
  const storage = createStorage();
  const snapshot = createProgressSnapshot(['event-loop']);

  assert.equal(writeProgress(storage, snapshot), true);
  const result = readProgress(storage);

  assert.equal(result.ok, true);
  assert.deepEqual(result.snapshot.completed, ['event-loop']);
});

test('storage reports corrupt JSON without throwing', () => {
  const result = readProgress(createStorage('{broken'));

  assert.deepEqual(result, { ok: false, reason: 'invalid-data' });
});

test('storage reports expected browser security failures', () => {
  const storage = {
    getItem() {
      throw new DOMException('blocked', 'SecurityError');
    },
  };

  assert.deepEqual(readProgress(storage), { ok: false, reason: 'unavailable' });
});

test('storage does not swallow unexpected failures', () => {
  const storage = {
    getItem() {
      throw new Error('unexpected storage failure');
    },
  };

  assert.throws(() => readProgress(storage), /unexpected storage failure/);
});

test('storage write returns false for quota failures but propagates unknown failures', () => {
  const quotaStorage = {
    setItem() {
      throw new DOMException('full', 'QuotaExceededError');
    },
  };

  assert.equal(writeProgress(quotaStorage, createProgressSnapshot([])), false);
  const brokenStorage = {
    setItem() {
      throw new Error('unexpected write failure');
    },
  };

  assert.throws(
    () => writeProgress(brokenStorage, createProgressSnapshot([])),
    /unexpected write failure/,
  );
});
