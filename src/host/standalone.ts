import { copyText, type TextHost, type ThemeName } from './types';

const STORAGE_KEY = 'attext.theme';
let theme: ThemeName = 'dark';
let themeListener: ((theme: ThemeName) => void) | null = null;

export const host: TextHost = {
  mode: 'standalone',
  async initialize(onTheme) {
    themeListener = onTheme;
    theme = localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    return theme;
  },
  async toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, theme);
    themeListener?.(theme);
    return theme;
  },
  copy: copyText,
  dispose() {
    themeListener = null;
  }
};
