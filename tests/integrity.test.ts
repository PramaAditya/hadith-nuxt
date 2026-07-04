import { describe, it, expect } from 'vitest';
import { db } from '../server/utils/db';
import { checkHadithIntegrityLogic } from '../server/utils/integrity';

describe('Sanad Integrity Analysis', () => {
  it('should run integrity check on a known hadith', async () => {
    // Hadith ID 27076 is a real hadith in Man La Yahduruh (Zayd al-Shahham)
    const result = await checkHadithIntegrityLogic(db, 27076);
    expect(result).toBeDefined();
    expect(result.hadithid).toBe(27076);
    expect(typeof result.is_continuous).toBe('boolean');
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(typeof result.analysis).toBe('string');
  });

  it('should handle non-existent hadith gracefully', async () => {
    await expect(checkHadithIntegrityLogic(db, 99999999)).rejects.toThrow();
  });
});
