import { describe, expect, it } from 'vitest';
import { defaultPreferences, readPreferences, writePreferences } from './preferences';

describe('preferências locais tolerantes a falhas', () => {
  it('recupera apenas preferências booleanas conhecidas da versão suportada', () => {
    const getItem = () => JSON.stringify({ version: 1, autosave: false, audio: true, showGuide: false, shadows: 'false', injected: true });
    expect(readPreferences({ getItem })).toEqual({ ...defaultPreferences, autosave: false, audio: true, showGuide: false });
    for (const raw of ['null', '{broken', '[]', '{"version":99,"audio":true}']) expect(readPreferences({ getItem: () => raw })).toEqual(defaultPreferences);
  });
  it('salva somente as opções e mantém a sessão utilizável se o armazenamento falhar', () => {
    let data = '';
    expect(writePreferences({ ...defaultPreferences, audio: true, city: 'never serialize' } as typeof defaultPreferences, { setItem: (_, value) => { data = value; } })).toBe(true);
    expect(JSON.parse(data)).not.toHaveProperty('city'); expect(JSON.parse(data).audio).toBe(true);
    expect(writePreferences(defaultPreferences, { setItem: () => { throw new Error('quota'); } })).toBe(false);
    expect(readPreferences({ getItem: () => { throw new Error('blocked'); } })).toEqual(defaultPreferences);
  });
});
