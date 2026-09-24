export const appearanceThemes = [
  { id: 'sunshine', label: 'Sunshine', description: 'Bright, playful, a little bold.' },
  { id: 'studio', label: 'Studio', description: 'A softer space to focus.' },
] as const;

export type AppearanceTheme = typeof appearanceThemes[number]['id'];

export function useAppearance() {
  // A cookie lets the server render the chosen skin before the first paint.
  const preference = useCookie<string>('dripdesk-theme', {
    default: () => 'sunshine',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  });
  // Share the current selection across layout mounts. Separate cookie refs can
  // otherwise briefly disagree when moving between authenticated/public shells.
  const selection = useState<string>('dripdesk-appearance', () => preference.value);
  const theme = computed<AppearanceTheme>(() =>
    appearanceThemes.find((item) => item.id === selection.value)?.id ?? 'sunshine',
  );

  function setTheme(value: string) {
    const selected = appearanceThemes.find((item) => item.id === value);
    if (selected) {
      selection.value = selected.id;
      preference.value = selected.id;
    }
  }

  return { theme, themes: appearanceThemes, setTheme };
}
