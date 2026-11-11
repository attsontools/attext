import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BUILTIN_PATTERNS,
  changeCase,
  cleanText,
  collapseEqualLines,
  computeStats,
  diffSummary,
  extractMatches,
  joinWith,
  lineDiff,
  sortLines,
  splitBy
} from '../src/text';

describe('text processing core', () => {
  it('cleans lines with the same defaults as AT Tool', () => {
    assert.equal(cleanText(' a  \n\na\n b ', {
      dedup: true,
      dropEmpty: true,
      trimEachLine: true,
      collapseSpaces: false,
      keepOrder: true
    }), 'a\nb');
    assert.equal(cleanText('hi   world', {
      dedup: false,
      dropEmpty: false,
      trimEachLine: false,
      collapseSpaces: true,
      keepOrder: true
    }), 'hi world');
  });

  it('sorts lexically, naturally, by length, and in reverse order', () => {
    assert.equal(sortLines('c\na\nb', 'asc'), 'a\nb\nc');
    assert.equal(sortLines('c\na\nb', 'desc'), 'c\nb\na');
    assert.equal(sortLines('item10\nitem2\nitem1', 'natural'), 'item1\nitem2\nitem10');
    assert.equal(sortLines('bbb\na\ncc', 'length-asc'), 'a\ncc\nbbb');
    assert.equal(sortLines('bbb\na\ncc', 'length-desc'), 'bbb\ncc\na');
    assert.equal(sortLines('a\nb\nc', 'reverse'), 'c\nb\na');
  });

  it('supports all case conversion families', () => {
    assert.equal(changeCase('Hello World', 'upper'), 'HELLO WORLD');
    assert.equal(changeCase('Hello World', 'lower'), 'hello world');
    assert.equal(changeCase('hello world', 'title'), 'Hello World');
    assert.equal(changeCase('hello. world', 'sentence'), 'Hello. World');
    assert.equal(changeCase('hello world', 'camel'), 'helloWorld');
    assert.equal(changeCase('hello-world', 'pascal'), 'HelloWorld');
    assert.equal(changeCase('fooBarBaz', 'snake'), 'foo_bar_baz');
    assert.equal(changeCase('Hello World', 'kebab'), 'hello-world');
    assert.equal(changeCase('helloWorld', 'constant'), 'HELLO_WORLD');
    assert.equal(changeCase('Hello', 'swap'), 'hELLO');
  });

  it('splits and joins with multi-character delimiters', () => {
    assert.equal(splitBy('a--b--c', '--'), 'a\nb\nc');
    assert.equal(splitBy('a,b', ''), 'a,b');
    assert.equal(joinWith('a\nb\nc', ', '), 'a, b, c');
  });

  it('extracts built-in patterns and supports deduplication', () => {
    assert.deepEqual(
      extractMatches('https://example.com http://x.co/y?z=1', BUILTIN_PATTERNS.URL),
      ['https://example.com', 'http://x.co/y?z=1']
    );
    assert.deepEqual(
      extractMatches('a@x.com b@x.com a@x.com', BUILTIN_PATTERNS.Email, true),
      ['a@x.com', 'b@x.com']
    );
    assert.deepEqual(
      extractMatches('192.168.1.1 999.999.999.999 8.8.8.8', BUILTIN_PATTERNS.IPv4),
      ['192.168.1.1', '8.8.8.8']
    );
  });

  it('computes text statistics by code point and UTF-8 byte', () => {
    const stats = computeStats('中文 hello\nworld');
    assert.equal(stats.chinese, 2);
    assert.equal(stats.lines, 2);
    assert.equal(stats.words, 3);
    assert.ok(stats.bytes > stats.chars);
    assert.deepEqual(computeStats(''), {
      chars: 0,
      charsNoSpace: 0,
      words: 0,
      lines: 0,
      bytes: 0,
      chinese: 0,
      ascii: 0
    });
  });

  it('produces a numbered line diff and summary', () => {
    const diff = lineDiff('a\nb\nc', 'a\nX\nc');
    assert.deepEqual(diffSummary(diff), {
      added: 1,
      removed: 1,
      equal: 2,
      identical: false
    });
    assert.deepEqual(diff.find((line) => line.text === 'c'), {
      type: 'equal',
      text: 'c',
      lineNumA: 3,
      lineNumB: 3
    });
  });

  it('collapses long unchanged runs while preserving context', () => {
    const left = ['start', ...Array.from({ length: 10 }, (_, index) => `same-${index}`), 'old'];
    const right = ['start', ...Array.from({ length: 10 }, (_, index) => `same-${index}`), 'new'];
    const diff = lineDiff(left.join('\n'), right.join('\n'));
    const collapsed = collapseEqualLines(diff, 3);

    assert.deepEqual(
      collapsed.map((row) => row.type === 'gap' ? `gap:${row.gapSize}` : row.text),
      ['gap:8', 'same-7', 'same-8', 'same-9', 'old', 'new']
    );
    assert.deepEqual(collapseEqualLines(diff.slice(-5), 3), diff.slice(-5));
  });
});
