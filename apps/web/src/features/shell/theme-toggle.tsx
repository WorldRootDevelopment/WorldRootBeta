'use client';

import { cn } from '@worldroot/ui';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { THEME_CHOICES, THEME_COOKIE, type ThemeChoice } from './theme';

const icons = { system: Monitor, light: Sun, dark: Moon };
const labels = { system: 'System', light: 'Light', dark: 'Dark' };

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === 'system') {
    delete root.dataset.theme;
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } else {
    root.dataset.theme = choice;
    document.cookie = `${THEME_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`;
  }
}

/** A three-way choice: follow the system, or force light or dark. */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setChoice(current === 'light' || current === 'dark' ? current : 'system');
  }, []);

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-lg bg-surface-sunken p-1">
      {THEME_CHOICES.map((option) => {
        const Icon = icons[option];
        const selected = choice === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              apply(option);
              setChoice(option);
            }}
            className={cn(
              'flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium',
              'focus-visible:outline-2 focus-visible:outline-focus',
              selected ? 'bg-surface-raised text-ink shadow-raised' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}
