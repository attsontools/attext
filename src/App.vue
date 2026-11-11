<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

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
  splitBy,
  type CaseMode,
  type SortMode
} from './text';
import type { TextHost, ThemeName } from './host/types';

const props = defineProps<{ host: TextHost }>();

type Tab = 'clean' | 'sort' | 'case' | 'split' | 'extract' | 'diff';
const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'clean', label: '整理' },
  { id: 'sort', label: '排序' },
  { id: 'case', label: '大小写' },
  { id: 'split', label: '拆合' },
  { id: 'extract', label: '抽取' },
  { id: 'diff', label: '对比' }
];

const active = ref<Tab>('clean');
const theme = ref<ThemeName>('dark');
const connecting = ref(true);
const connectionError = ref('');
const copyState = ref<'idle' | 'ok' | 'fail'>('idle');
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const cleanInput = ref('');
const cleanDedup = ref(true);
const cleanDropEmpty = ref(true);
const cleanTrim = ref(true);
const cleanCollapseSpaces = ref(false);
const cleanOutput = computed(() => cleanText(cleanInput.value, {
  dedup: cleanDedup.value,
  dropEmpty: cleanDropEmpty.value,
  trimEachLine: cleanTrim.value,
  collapseSpaces: cleanCollapseSpaces.value,
  keepOrder: true
}));
const cleanStats = computed(() => computeStats(cleanOutput.value));

const sortInput = ref('');
const sortMode = ref<SortMode>('asc');
const shuffleRevision = ref(0);
const sortOutput = computed(() => {
  void shuffleRevision.value;
  return sortLines(sortInput.value, sortMode.value);
});
const sortModes: Array<{ value: SortMode; label: string }> = [
  { value: 'asc', label: '升序（字典序）' },
  { value: 'desc', label: '降序（字典序）' },
  { value: 'natural', label: '自然序（含数字）' },
  { value: 'length-asc', label: '按长度升序' },
  { value: 'length-desc', label: '按长度降序' },
  { value: 'reverse', label: '原顺序反转' },
  { value: 'shuffle', label: '随机' }
];

const caseInput = ref('');
const caseMode = ref<CaseMode>('upper');
const caseOutput = computed(() => changeCase(caseInput.value, caseMode.value));
const caseModes: Array<{ value: CaseMode; label: string; example: string }> = [
  { value: 'upper', label: 'UPPER', example: 'HELLO WORLD' },
  { value: 'lower', label: 'lower', example: 'hello world' },
  { value: 'title', label: 'Title', example: 'Hello World' },
  { value: 'sentence', label: 'Sentence.', example: 'Hello. World.' },
  { value: 'camel', label: 'camelCase', example: 'helloWorld' },
  { value: 'pascal', label: 'PascalCase', example: 'HelloWorld' },
  { value: 'snake', label: 'snake_case', example: 'hello_world' },
  { value: 'kebab', label: 'kebab-case', example: 'hello-world' },
  { value: 'constant', label: 'CONSTANT', example: 'HELLO_WORLD' },
  { value: 'swap', label: 'SwAP', example: 'hELLO wORLD' }
];

const splitInput = ref('');
const splitDelimiter = ref(',');
const joinDelimiter = ref(', ');
const splitOutput = computed(() => splitBy(splitInput.value, splitDelimiter.value));
const joinOutput = computed(() => joinWith(splitInput.value, joinDelimiter.value));

const extractInput = ref('');
const extractMode = ref('URL');
const extractDedup = ref(true);
const customPattern = ref('');
const customFlags = ref('gi');
const extractError = ref('');
const extractModes = [...Object.keys(BUILTIN_PATTERNS), '自定义正则'];
const matches = computed(() => {
  extractError.value = '';
  if (!extractInput.value) return [];
  try {
    const pattern = extractMode.value === '自定义正则'
      ? createCustomPattern(customPattern.value, customFlags.value)
      : BUILTIN_PATTERNS[extractMode.value];
    return pattern ? extractMatches(extractInput.value, pattern, extractDedup.value) : [];
  } catch (error) {
    extractError.value = error instanceof Error ? error.message : String(error);
    return [];
  }
});

const original = ref('');
const revised = ref('');
const collapseDiff = ref(true);
const diffLines = computed(() => lineDiff(original.value, revised.value));
const visibleDiffRows = computed(() => (
  collapseDiff.value ? collapseEqualLines(diffLines.value, 3) : diffLines.value
));
const summary = computed(() => diffSummary(diffLines.value));

onMounted(async () => {
  try {
    theme.value = await props.host.initialize((value) => {
      theme.value = value;
      applyTheme();
    });
    applyTheme();
  } catch (error) {
    connectionError.value = error instanceof Error ? error.message : String(error);
  } finally {
    connecting.value = false;
  }
});

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
  props.host.dispose();
});

function applyTheme() {
  document.documentElement.dataset.theme = theme.value;
}

async function toggleTheme() {
  theme.value = await props.host.toggleTheme();
  applyTheme();
}

async function copy(value: string) {
  if (!value) return;
  if (copyTimer) clearTimeout(copyTimer);
  try {
    await props.host.copy(value);
    copyState.value = 'ok';
  } catch {
    copyState.value = 'fail';
  }
  copyTimer = setTimeout(() => {
    copyState.value = 'idle';
  }, 1600);
}

function createCustomPattern(source: string, flags: string): RegExp | null {
  if (!source) return null;
  const normalizedFlags = flags.includes('g') ? flags : `${flags}g`;
  return new RegExp(source, normalizedFlags);
}

function swapDiff() {
  [original.value, revised.value] = [revised.value, original.value];
}

function unifiedDiff() {
  return diffLines.value.map((line) => {
    if (line.type === 'add') return `+${line.text}`;
    if (line.type === 'remove') return `-${line.text}`;
    return ` ${line.text}`;
  }).join('\n');
}
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">文</span>
        <div class="brand-copy">
          <strong>文本工具</strong>
          <span>整理、转换与对比</span>
        </div>
      </div>
      <div class="top-actions">
        <span v-if="copyState !== 'idle'" class="copy-state" :class="`is-${copyState}`">
          {{ copyState === 'ok' ? '已复制' : '复制失败' }}
        </span>
        <span class="host-badge">{{ host.mode === 'plugin' ? '平台插件' : '独立应用' }}</span>
        <button
          v-if="host.mode === 'standalone'"
          class="icon-button"
          type="button"
          :title="theme === 'dark' ? '切换到浅色' : '切换到深色'"
          :aria-label="theme === 'dark' ? '切换到浅色' : '切换到深色'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/></svg>
        </button>
      </div>
    </header>

    <div v-if="connecting" class="center-state">正在连接宿主</div>
    <div v-else-if="connectionError" class="center-state error-state">
      <strong>无法启动文本工具</strong>
      <span>{{ connectionError }}</span>
    </div>

    <template v-else>
      <nav class="tabs" aria-label="文本工具">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="{ active: active === tab.id }"
          @click="active = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <section class="workspace">
        <template v-if="active === 'clean'">
          <div class="control-bar">
            <label><input v-model="cleanDedup" type="checkbox">去重</label>
            <label><input v-model="cleanDropEmpty" type="checkbox">去空行</label>
            <label><input v-model="cleanTrim" type="checkbox">每行 trim</label>
            <label><input v-model="cleanCollapseSpaces" type="checkbox">折叠连续空格</label>
          </div>
          <div class="two-column">
            <article class="panel">
              <header><strong>输入</strong></header>
              <textarea v-model="cleanInput" spellcheck="false" placeholder="粘贴多行文本" />
            </article>
            <article class="panel">
              <header><strong>结果</strong><button type="button" :disabled="!cleanOutput" @click="copy(cleanOutput)">复制</button></header>
              <textarea :value="cleanOutput" readonly spellcheck="false" />
            </article>
          </div>
          <div class="stats mono">
            <span>行 {{ cleanStats.lines }}</span><span>字符 {{ cleanStats.chars }}</span><span>去空格 {{ cleanStats.charsNoSpace }}</span><span>词 {{ cleanStats.words }}</span><span>字节 {{ cleanStats.bytes }}</span><span>中文 {{ cleanStats.chinese }}</span>
          </div>
        </template>

        <template v-else-if="active === 'sort'">
          <div class="control-bar">
            <label class="field"><span>排序方式</span><select v-model="sortMode"><option v-for="mode in sortModes" :key="mode.value" :value="mode.value">{{ mode.label }}</option></select></label>
            <button v-if="sortMode === 'shuffle'" type="button" @click="shuffleRevision += 1">重新随机</button>
          </div>
          <div class="two-column">
            <article class="panel"><header><strong>输入</strong></header><textarea v-model="sortInput" spellcheck="false" placeholder="每行一个条目" /></article>
            <article class="panel"><header><strong>结果</strong><button type="button" :disabled="!sortOutput" @click="copy(sortOutput)">复制</button></header><textarea :value="sortOutput" readonly spellcheck="false" /></article>
          </div>
        </template>

        <template v-else-if="active === 'case'">
          <div class="case-grid">
            <button v-for="mode in caseModes" :key="mode.value" type="button" :class="{ active: caseMode === mode.value }" @click="caseMode = mode.value"><strong>{{ mode.label }}</strong><span>{{ mode.example }}</span></button>
          </div>
          <div class="two-column">
            <article class="panel"><header><strong>输入</strong></header><textarea v-model="caseInput" spellcheck="false" /></article>
            <article class="panel"><header><strong>结果</strong><button type="button" :disabled="!caseOutput" @click="copy(caseOutput)">复制</button></header><textarea :value="caseOutput" readonly spellcheck="false" /></article>
          </div>
        </template>

        <template v-else-if="active === 'split'">
          <article class="panel compact-input"><header><strong>输入</strong></header><textarea v-model="splitInput" spellcheck="false" /></article>
          <div class="two-column split-results">
            <article class="panel">
              <header><strong>拆成多行</strong><button type="button" :disabled="!splitOutput" @click="copy(splitOutput)">复制</button></header>
              <label class="inline-field"><span>分隔符</span><input v-model="splitDelimiter" type="text"></label>
              <textarea :value="splitOutput" readonly spellcheck="false" />
            </article>
            <article class="panel">
              <header><strong>多行拼接</strong><button type="button" :disabled="!joinOutput" @click="copy(joinOutput)">复制</button></header>
              <label class="inline-field"><span>拼接符</span><input v-model="joinDelimiter" type="text"></label>
              <textarea :value="joinOutput" readonly spellcheck="false" />
            </article>
          </div>
        </template>

        <template v-else-if="active === 'extract'">
          <div class="control-bar extract-controls">
            <label class="field"><span>抽取</span><select v-model="extractMode"><option v-for="mode in extractModes" :key="mode">{{ mode }}</option></select></label>
            <template v-if="extractMode === '自定义正则'">
              <label class="field grow"><span>Regex</span><input v-model="customPattern" type="text"></label>
              <label class="field flags"><span>Flags</span><input v-model="customFlags" type="text"></label>
            </template>
            <label><input v-model="extractDedup" type="checkbox">去重</label>
          </div>
          <div class="two-column">
            <article class="panel"><header><strong>输入</strong></header><textarea v-model="extractInput" spellcheck="false" /></article>
            <article class="panel result-panel">
              <header><strong>结果（{{ matches.length }}）</strong><button type="button" :disabled="matches.length === 0" @click="copy(matches.join('\n'))">复制全部</button></header>
              <p v-if="extractError" class="inline-error">{{ extractError }}</p>
              <ul v-else class="matches"><li v-for="(match, index) in matches" :key="`${index}-${match}`" class="mono">{{ match }}</li></ul>
            </article>
          </div>
        </template>

        <template v-else>
          <div class="two-column diff-inputs">
            <article class="panel"><header><strong>原文</strong></header><textarea v-model="original" spellcheck="false" /></article>
            <article class="panel"><header><strong>新文</strong></header><textarea v-model="revised" spellcheck="false" /></article>
          </div>
          <div class="diff-toolbar">
            <div class="diff-summary mono"><span v-if="summary.identical">完全相同</span><template v-else><span class="added">+{{ summary.added }}</span><span class="removed">-{{ summary.removed }}</span><span>未变 {{ summary.equal }}</span></template></div>
            <div>
              <label class="collapse-control"><span>折叠未变行（上下文 3 行）</span><input v-model="collapseDiff" type="checkbox"></label>
              <button type="button" @click="swapDiff">交换</button><button type="button" :disabled="summary.identical" @click="copy(unifiedDiff())">复制 Diff</button>
            </div>
          </div>
          <article class="panel diff-panel">
            <header><strong>Diff</strong></header>
            <div class="diff-view">
              <div v-for="(line, index) in visibleDiffRows" :key="index" class="diff-row" :class="`is-${line.type}`"><span class="line-number">{{ 'lineNumA' in line ? line.lineNumA ?? '' : '' }}</span><span class="line-number">{{ 'lineNumB' in line ? line.lineNumB ?? '' : '' }}</span><span class="marker">{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : line.type === 'gap' ? '...' : ' ' }}</span><span class="mono">{{ line.type === 'gap' ? `${line.gapSize} 行未变` : line.text || ' ' }}</span></div>
            </div>
          </article>
        </template>
      </section>
    </template>
  </main>
</template>
