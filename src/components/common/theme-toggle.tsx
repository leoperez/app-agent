'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { MdLightMode, MdDarkMode, MdBrightness6 } from 'react-icons/md';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  const cycle = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const icon =
    theme === 'dark' ? (
      <MdDarkMode className="h-5 w-5" />
    ) : theme === 'light' ? (
      <MdLightMode className="h-5 w-5" />
    ) : (
      <MdBrightness6 className="h-5 w-5" />
    );

  const label =
    theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

  return (
    <button
      onClick={cycle}
      title={`Theme: ${label} — click to cycle`}
      className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label={`Current theme: ${label}`}
    >
      {icon}
    </button>
  );
}
