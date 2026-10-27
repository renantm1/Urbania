export const PREFERENCES_KEY = 'urbania-preferences';
export const defaultPreferences = {
  shadows: true, showGrid: true, autosave: true, dayNight: true,
  audio: false, performanceMode: false, showPerformance: false, showGuide: true,
};
export type Preferences = typeof defaultPreferences;
export function readPreferences(storage?: Pick<Storage, 'getItem'>): Preferences {
  const result = { ...defaultPreferences };
  try {
    const source = storage ?? window.localStorage;
    const data: unknown = JSON.parse(source.getItem(PREFERENCES_KEY) ?? 'null');
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1) return result;
    for (const key of Object.keys(result) as (keyof Preferences)[]) {
      if (key in data && typeof data[key as keyof typeof data] === 'boolean') result[key] = data[key as keyof typeof data] as boolean;
    }
  } catch { /* Private browsing or unavailable storage keeps safe session defaults. */ }
  return result;
}
export function writePreferences(settings: Preferences, storage?: Pick<Storage, 'setItem'>): boolean {
  const data = { version: 1 } as Record<string, number | boolean>;
  for (const key of Object.keys(defaultPreferences) as (keyof Preferences)[]) data[key] = settings[key];
  try { (storage ?? window.localStorage).setItem(PREFERENCES_KEY, JSON.stringify(data)); return true; }
  catch { return false; }
}
