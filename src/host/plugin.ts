import { connectPlugin, type PluginClient } from '@attson/plugin-sdk/browser';

import { copyText, type TextHost, type ThemeName } from './types';

let client: PluginClient | null = null;
let removeThemeListener: (() => void) | null = null;
let currentTheme: ThemeName = 'dark';

export const host: TextHost = {
  mode: 'plugin',
  async initialize(onTheme) {
    client = await connectPlugin('com.attson.text');
    const handshake = await client.handshake();
    currentTheme = handshake.theme;
    removeThemeListener = client.onThemeChange((theme) => {
      currentTheme = theme;
      onTheme(theme);
    });
    return currentTheme;
  },
  async toggleTheme() {
    return currentTheme;
  },
  copy: copyText,
  dispose() {
    removeThemeListener?.();
    removeThemeListener = null;
    client?.close();
    client = null;
  }
};
