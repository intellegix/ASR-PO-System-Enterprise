'use client';
import { useEffect } from 'react';

interface ShortcutCallbacks {
  onCommandPalette?: () => void;
  onNewPO?: () => void;
}

export function useKeyboardShortcuts({ onCommandPalette, onNewPO }: ShortcutCallbacks) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') {
        e.preventDefault();
        onCommandPalette?.();
      }
      if (mod && e.key === 'n') {
        e.preventDefault();
        onNewPO?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCommandPalette, onNewPO]);
}
