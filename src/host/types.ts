export type ThemeName = 'dark' | 'light';

export interface TextHost {
  mode: 'standalone' | 'plugin';
  initialize(onTheme: (theme: ThemeName) => void): Promise<ThemeName>;
  toggleTheme(): Promise<ThemeName>;
  copy(value: string): Promise<void>;
  dispose(): void;
}

export interface CopyDependencies {
  writeClipboard?: (value: string) => Promise<unknown>;
  fallbackCopy: (value: string) => boolean;
}

export async function copyText(
  value: string,
  dependencies: CopyDependencies = browserCopyDependencies()
): Promise<void> {
  if (dependencies.writeClipboard) {
    await dependencies.writeClipboard(value);
    return;
  }
  if (!dependencies.fallbackCopy(value)) {
    throw new Error('Clipboard write was rejected');
  }
}

function browserCopyDependencies(): CopyDependencies {
  return {
    writeClipboard: navigator.clipboard?.writeText
      ? (value) => navigator.clipboard.writeText(value)
      : undefined,
    fallbackCopy(value) {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      try {
        textarea.select();
        return document.execCommand('copy');
      } finally {
        textarea.remove();
      }
    }
  };
}
