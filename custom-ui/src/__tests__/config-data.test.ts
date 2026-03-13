import { getIndexFromConfig, CONFIG_FIELD } from '../config-data';
import { describe, it, expect } from 'vitest';

describe('config', () => {
  describe('getIndexFromConfig', () => {
    it('should return undefined when config is undefined', () => {
      expect(getIndexFromConfig(undefined)).toBeUndefined();
    });

    it('should return undefined when config index is undefined', () => {
      expect(getIndexFromConfig({})).toBeUndefined();
    });

    it('should return undefined when config index is not a safe integer', () => {
      expect(getIndexFromConfig({ [CONFIG_FIELD]: NaN })).toBeUndefined();
      expect(getIndexFromConfig({ [CONFIG_FIELD]: Infinity })).toBeUndefined();
      expect(getIndexFromConfig({ [CONFIG_FIELD]: 1.5 })).toBeUndefined();
    });

    it('should return the index when config index is a safe integer', () => {
      expect(getIndexFromConfig({ [CONFIG_FIELD]: 0 })).toBe(0);
      expect(getIndexFromConfig({ [CONFIG_FIELD]: 1 })).toBe(1);
      expect(getIndexFromConfig({ [CONFIG_FIELD]: 42 })).toBe(42);
    });

    it('should return undefined when config index is a negative integer', () => {
      // Negative indices are rejected: Array.at(-1) would silently resolve to the
      // last element instead of throwing, which could render an unintended diagram.
      expect(getIndexFromConfig({ [CONFIG_FIELD]: -1 })).toBeUndefined();
      expect(getIndexFromConfig({ [CONFIG_FIELD]: -42 })).toBeUndefined();
    });
  });

  describe('CONFIG_FIELD', () => {
    it('should have the correct value', () => {
      expect(CONFIG_FIELD).toBe('index');
    });
  });
});
