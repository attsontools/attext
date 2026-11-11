import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { copyText, type CopyDependencies } from '../src/host/types';

describe('clipboard adapter', () => {
  it('prefers the browser Clipboard API', async () => {
    const calls: string[] = [];
    const dependencies: CopyDependencies = {
      writeClipboard: async (value) => calls.push(`clipboard:${value}`),
      fallbackCopy: (value) => {
        calls.push(`fallback:${value}`);
        return true;
      }
    };

    await copyText('result', dependencies);
    assert.deepEqual(calls, ['clipboard:result']);
  });

  it('uses the user-gesture fallback when Clipboard API is unavailable', async () => {
    const calls: string[] = [];
    await copyText('result', {
      fallbackCopy(value) {
        calls.push(value);
        return true;
      }
    });
    assert.deepEqual(calls, ['result']);
  });

  it('reports a failed fallback instead of silently succeeding', async () => {
    await assert.rejects(
      () => copyText('result', { fallbackCopy: () => false }),
      /Clipboard write was rejected/
    );
  });
});
