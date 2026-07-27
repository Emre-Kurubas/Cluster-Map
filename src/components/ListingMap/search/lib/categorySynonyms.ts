import type { Category } from '../../types/listing';

/**
 * Keys are already normalized (lowercase, diacritic-folded).
 *
 * `dubleks` and `mesken` are deliberately absent. Both appear verbatim in real
 * listing titles, so treating them as category synonyms would consume them into
 * a chip and starve the fuzzy scorer of useful search terms.
 */
export const CATEGORY_SYNONYMS: Record<string, Category> = {
  gayrimenkul: 'Gayrimenkul',
  daire: 'Gayrimenkul',
  ev: 'Gayrimenkul',
  konut: 'Gayrimenkul',
  villa: 'Gayrimenkul',
  bina: 'Gayrimenkul',
  isyeri: 'Gayrimenkul',
  dukkan: 'Gayrimenkul',

  arsa: 'Arsa',
  tarla: 'Arsa',
  parsel: 'Arsa',
  arazi: 'Arsa',
  imarli: 'Arsa',
  bahce: 'Arsa',

  arac: 'Araç',
  araba: 'Araç',
  otomobil: 'Araç',
  vasita: 'Araç',
  hatchback: 'Araç',
  sedan: 'Araç',
  ticari: 'Araç',
  kamyon: 'Araç',
  motosiklet: 'Araç',
};
