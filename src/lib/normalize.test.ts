import { describe, it, expect } from 'vitest';
import { normalizeTr, tokenize } from './normalize';

describe('normalizeTr', () => {
  it('lowercases dotted capital I to plain i', () => {
    expect(normalizeTr('İcra')).toBe('icra');
    expect(normalizeTr('İSTANBUL')).toBe('istanbul');
  });

  it('lowercases dotless capital I to i as well, so typos still match', () => {
    expect(normalizeTr('IZMIR')).toBe('izmir');
  });

  it('folds every Turkish diacritic', () => {
    expect(normalizeTr('Şığçöü')).toBe('sigcou');
    expect(normalizeTr('Araç')).toBe('arac');
    expect(normalizeTr('Adıyaman')).toBe('adiyaman');
    expect(normalizeTr('Kütahya')).toBe('kutahya');
  });

  it('collapses whitespace and trims', () => {
    expect(normalizeTr('  Ankara   Merkez  ')).toBe('ankara merkez');
  });

  it('is idempotent', () => {
    const once = normalizeTr('Kırşehir');
    expect(normalizeTr(once)).toBe(once);
  });

  it('handles empty input', () => {
    expect(normalizeTr('')).toBe('');
  });
});

describe('tokenize', () => {
  it('splits normalized words', () => {
    expect(tokenize("Adana Merkez'de Satılık Arsa"))
      .toEqual(['adana', 'merkez', 'de', 'satilik', 'arsa']);
  });

  it('keeps digits as their own tokens', () => {
    expect(tokenize('2 milyon altı')).toEqual(['2', 'milyon', 'alti']);
    expect(tokenize('500m2 İmarlı')).toEqual(['500m2', 'imarli']);
  });

  it('drops punctuation-only fragments', () => {
    expect(tokenize('2024/2679 Esas -')).toEqual(['2024', '2679', 'esas']);
  });

  it('returns an empty array for empty input', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});
