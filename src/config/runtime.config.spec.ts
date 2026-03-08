import { parseCorsOrigins, parseTrustProxy } from './runtime.config';

describe('runtime.config', () => {
  describe('parseCorsOrigins', () => {
    it('returns false when cors is not configured', () => {
      expect(parseCorsOrigins(undefined)).toBe(false);
      expect(parseCorsOrigins('   ')).toBe(false);
    });

    it('returns true when cors wildcard is configured', () => {
      expect(parseCorsOrigins('*')).toBe(true);
    });

    it('returns sanitized origin list for comma separated values', () => {
      expect(
        parseCorsOrigins('https://matiasgaleano.dev, http://localhost:4200 '),
      ).toEqual(['https://matiasgaleano.dev', 'http://localhost:4200']);
    });
  });

  describe('parseTrustProxy', () => {
    it('returns false by default', () => {
      expect(parseTrustProxy(undefined)).toBe(false);
      expect(parseTrustProxy('false')).toBe(false);
      expect(parseTrustProxy('0')).toBe(false);
    });

    it('returns booleans and hop counts when configured', () => {
      expect(parseTrustProxy('true')).toBe(true);
      expect(parseTrustProxy('1')).toBe(1);
      expect(parseTrustProxy('2')).toBe(2);
    });
  });
});
