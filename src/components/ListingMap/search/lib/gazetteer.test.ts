import { describe, it, expect } from 'vitest';
import { PROVINCES, findProvinceInTokens, nearestProvince } from './gazetteer';

describe('PROVINCES', () => {
  it('contains all 81 provinces', () => {
    expect(PROVINCES).toHaveLength(81);
  });

  it('stores pre-normalized names', () => {
    const istanbul = PROVINCES.find((p) => p.name === 'İstanbul');
    expect(istanbul?.normalized).toBe('istanbul');
  });

  it('has no duplicate normalized names', () => {
    const names = PROVINCES.map((p) => p.normalized);
    expect(new Set(names).size).toBe(81);
  });
});

describe('findProvinceInTokens', () => {
  it('finds a province and reports which token it consumed', () => {
    const hit = findProvinceInTokens(['ankara', '2', 'milyon']);
    expect(hit?.province.name).toBe('Ankara');
    expect(hit?.indices).toEqual([0]);
  });

  it('matches a diacritic-free typing of the name', () => {
    expect(findProvinceInTokens(['adiyaman'])?.province.name).toBe('Adıyaman');
    expect(findProvinceInTokens(['kutahya'])?.province.name).toBe('Kütahya');
  });

  it('matches two-word province names across adjacent tokens', () => {
    const hit = findProvinceInTokens(['satilik', 'afyonkarahisar', 'arsa']);
    expect(hit?.province.name).toBe('Afyonkarahisar');
    expect(hit?.indices).toEqual([1]);
  });

  it('returns null when no province is present', () => {
    expect(findProvinceInTokens(['dubleks', 'mesken'])).toBeNull();
  });
});

describe('nearestProvince', () => {
  it('maps Adana coordinates to Adana', () => {
    expect(nearestProvince(35.3033, 36.962).name).toBe('Adana');
  });

  it('maps Düzce coordinates to Düzce', () => {
    expect(nearestProvince(31.13521, 40.81247).name).toBe('Düzce');
  });
});
