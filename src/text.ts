export interface CleanOptions {
  dedup: boolean;
  dropEmpty: boolean;
  trimEachLine: boolean;
  collapseSpaces: boolean;
  keepOrder: boolean;
}

export function cleanText(input: string, options: CleanOptions): string {
  let lines = input.split(/\r?\n/);
  if (options.trimEachLine) lines = lines.map((line) => line.trim());
  if (options.collapseSpaces) lines = lines.map((line) => line.replace(/[ \t]+/g, ' '));
  if (options.dropEmpty) lines = lines.filter((line) => line.length > 0);
  if (options.dedup) {
    const seen = new Set<string>();
    lines = lines.filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    });
  }
  return lines.join('\n');
}

export type SortMode =
  | 'asc'
  | 'desc'
  | 'natural'
  | 'length-asc'
  | 'length-desc'
  | 'reverse'
  | 'shuffle';

export function sortLines(input: string, mode: SortMode): string {
  const sorted = [...input.split(/\r?\n/)];
  switch (mode) {
    case 'asc':
      sorted.sort((left, right) => left.localeCompare(right));
      break;
    case 'desc':
      sorted.sort((left, right) => right.localeCompare(left));
      break;
    case 'natural':
      sorted.sort((left, right) => left.localeCompare(
        right,
        undefined,
        { numeric: true, sensitivity: 'base' }
      ));
      break;
    case 'length-asc':
      sorted.sort((left, right) => left.length - right.length);
      break;
    case 'length-desc':
      sorted.sort((left, right) => right.length - left.length);
      break;
    case 'reverse':
      sorted.reverse();
      break;
    case 'shuffle':
      for (let index = sorted.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      }
      break;
  }
  return sorted.join('\n');
}

export type CaseMode =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'swap';

export function changeCase(input: string, mode: CaseMode): string {
  switch (mode) {
    case 'upper':
      return input.toUpperCase();
    case 'lower':
      return input.toLowerCase();
    case 'title':
      return input.replace(/\b([a-z])/g, (match) => match.toUpperCase());
    case 'sentence':
      return input.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, character) => (
        prefix + character.toUpperCase()
      ));
    case 'swap':
      return input.replace(/[a-zA-Z]/g, (character) => (
        character === character.toLowerCase()
          ? character.toUpperCase()
          : character.toLowerCase()
      ));
    case 'camel':
      return toCamel(input, false);
    case 'pascal':
      return toCamel(input, true);
    case 'snake':
      return splitWords(input).join('_').toLowerCase();
    case 'kebab':
      return splitWords(input).join('-').toLowerCase();
    case 'constant':
      return splitWords(input).join('_').toUpperCase();
  }
}

function splitWords(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function toCamel(input: string, pascal: boolean): string {
  return splitWords(input)
    .map((word) => word.toLowerCase())
    .map((word, index) => (
      index === 0 && !pascal
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
    ))
    .join('');
}

export function splitBy(input: string, delimiter: string): string {
  return delimiter ? input.split(delimiter).join('\n') : input;
}

export function joinWith(input: string, delimiter: string): string {
  return input.split(/\r?\n/).join(delimiter);
}

export const BUILTIN_PATTERNS: Record<string, RegExp> = {
  URL: /https?:\/\/[^\s"'<>]+/gi,
  Email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  数字: /-?\d+(?:\.\d+)?/g,
  中文: /[一-龥]+/g,
  手机号: /1[3-9]\d{9}/g,
  IPv4: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g,
  Hex颜色: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g,
  日期: /\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?/g
};

export function extractMatches(input: string, pattern: RegExp, dedup = false): string[] {
  const matches = input.match(pattern) ?? [];
  return dedup ? [...new Set(matches)] : matches;
}

export interface TextStats {
  chars: number;
  charsNoSpace: number;
  words: number;
  lines: number;
  bytes: number;
  chinese: number;
  ascii: number;
}

export function computeStats(input: string): TextStats {
  const chineseMatches = input.match(/[一-龥]/g);
  const asciiMatches = input.match(/[\x21-\x7e]/g);
  const words = input.trim() === '' ? [] : input.trim().split(/\s+/);
  return {
    chars: [...input].length,
    charsNoSpace: [...input.replace(/\s+/g, '')].length,
    words: words.length,
    lines: input === '' ? 0 : input.split(/\r?\n/).length,
    bytes: new TextEncoder().encode(input).length,
    chinese: chineseMatches?.length ?? 0,
    ascii: asciiMatches?.length ?? 0
  };
}

export type DiffLineType = 'equal' | 'add' | 'remove';

export interface DiffLine {
  type: DiffLineType;
  text: string;
  lineNumA?: number;
  lineNumB?: number;
}

export interface DiffGap {
  type: 'gap';
  text: '';
  gapSize: number;
}

export type DiffRow = DiffLine | DiffGap;

export function lineDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split(/\r?\n/);
  const rightLines = right.split(/\r?\n/);
  const rows = leftLines.length;
  const columns = rightLines.length;
  const matrix: number[][] = Array.from(
    { length: rows + 1 },
    () => new Array(columns + 1).fill(0)
  );

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      matrix[row][column] = leftLines[row - 1] === rightLines[column - 1]
        ? matrix[row - 1][column - 1] + 1
        : Math.max(matrix[row - 1][column], matrix[row][column - 1]);
    }
  }

  const result: DiffLine[] = [];
  let row = rows;
  let column = columns;
  while (row > 0 || column > 0) {
    if (row > 0 && column > 0 && leftLines[row - 1] === rightLines[column - 1]) {
      result.push({
        type: 'equal',
        text: leftLines[row - 1],
        lineNumA: row,
        lineNumB: column
      });
      row -= 1;
      column -= 1;
    } else if (column > 0 && (row === 0 || matrix[row][column - 1] >= matrix[row - 1][column])) {
      result.push({ type: 'add', text: rightLines[column - 1], lineNumB: column });
      column -= 1;
    } else {
      result.push({ type: 'remove', text: leftLines[row - 1], lineNumA: row });
      row -= 1;
    }
  }
  return result.reverse();
}

export function collapseEqualLines(lines: DiffLine[], contextLines = 3): DiffRow[] {
  const rows: DiffRow[] = [];
  let index = 0;
  while (index < lines.length) {
    if (lines[index].type !== 'equal') {
      rows.push(lines[index]);
      index += 1;
      continue;
    }

    let end = index;
    while (end < lines.length && lines[end].type === 'equal') end += 1;
    const runLength = end - index;
    if (runLength <= contextLines * 2 + 1) {
      rows.push(...lines.slice(index, end));
      index = end;
      continue;
    }

    const headCount = index === 0 ? 0 : contextLines;
    const tailCount = end === lines.length ? 0 : contextLines;
    rows.push(...lines.slice(index, index + headCount));
    rows.push({
      type: 'gap',
      text: '',
      gapSize: runLength - headCount - tailCount
    });
    rows.push(...lines.slice(end - tailCount, end));
    index = end;
  }
  return rows;
}

export interface DiffSummary {
  added: number;
  removed: number;
  equal: number;
  identical: boolean;
}

export function diffSummary(lines: DiffLine[]): DiffSummary {
  const summary = { added: 0, removed: 0, equal: 0, identical: true };
  for (const line of lines) {
    summary[line.type === 'add' ? 'added' : line.type === 'remove' ? 'removed' : 'equal'] += 1;
  }
  summary.identical = summary.added === 0 && summary.removed === 0;
  return summary;
}
