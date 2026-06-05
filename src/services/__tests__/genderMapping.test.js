import { resolveGenderKey, extractRawGender } from '../genderMapping';

describe('resolveGenderKey (Task 6 - mapping genere)', () => {
  test('mappa i valori canonici di registrazione M/F/ALTRO', () => {
    expect(resolveGenderKey('M')).toBe('male');
    expect(resolveGenderKey('F')).toBe('female');
    expect(resolveGenderKey('ALTRO')).toBe('other');
  });

  test('è case-insensitive e ignora gli spazi', () => {
    expect(resolveGenderKey('m')).toBe('male');
    expect(resolveGenderKey('  Female  ')).toBe('female');
    expect(resolveGenderKey('OTHER')).toBe('other');
  });

  test('riconosce le varianti legacy IT/EN', () => {
    expect(resolveGenderKey('maschio')).toBe('male');
    expect(resolveGenderKey('uomo')).toBe('male');
    expect(resolveGenderKey('male')).toBe('male');
    expect(resolveGenderKey('femmina')).toBe('female');
    expect(resolveGenderKey('donna')).toBe('female');
    expect(resolveGenderKey('non-binary')).toBe('other');
  });

  test('NON inverte il genere: un cliente maschio resta male (regressione nota)', () => {
    // Bug originale: cliente maschile mostrato come femmina.
    const maleClient = { sex: 'M' };
    expect(resolveGenderKey(extractRawGender(maleClient))).toBe('male');
    expect(resolveGenderKey(extractRawGender(maleClient))).not.toBe('female');
  });

  test('ritorna null per valori vuoti o sconosciuti', () => {
    expect(resolveGenderKey('')).toBeNull();
    expect(resolveGenderKey(null)).toBeNull();
    expect(resolveGenderKey(undefined)).toBeNull();
    expect(resolveGenderKey('xyz')).toBeNull();
  });
});

describe('extractRawGender (alias di campo)', () => {
  test('preferisce il campo canonico sex', () => {
    expect(extractRawGender({ sex: 'F', gender: 'M' })).toBe('F');
  });

  test('fallback al campo legacy gender', () => {
    expect(extractRawGender({ gender: 'M' })).toBe('M');
  });

  test('ritorna null se nessun campo è presente', () => {
    expect(extractRawGender({})).toBeNull();
    expect(extractRawGender(null)).toBeNull();
  });
});
