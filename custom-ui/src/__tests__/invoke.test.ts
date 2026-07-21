import { unwrapInvoke } from '../invoke';
import { describe, it, expect } from 'vitest';

describe('unwrapInvoke', () => {
  it('returns the value directly when there is no body wrapper', () => {
    expect(unwrapInvoke(['pack-a', 'pack-b'])).toEqual(['pack-a', 'pack-b']);
    expect(unwrapInvoke('https://cdn.example.com/pack.json')).toBe(
      'https://cdn.example.com/pack.json',
    );
    expect(
      unwrapInvoke({ url: 'https://upload.example.com/presigned' }),
    ).toEqual({
      url: 'https://upload.example.com/presigned',
    });
  });

  it('unwraps the body property when Forge Bridge wraps the result', () => {
    expect(unwrapInvoke({ body: ['pack-a', 'pack-b'] })).toEqual([
      'pack-a',
      'pack-b',
    ]);
    expect(unwrapInvoke({ body: 'https://cdn.example.com/pack.json' })).toBe(
      'https://cdn.example.com/pack.json',
    );
    expect(
      unwrapInvoke({ body: { url: 'https://upload.example.com/presigned' } }),
    ).toEqual({ url: 'https://upload.example.com/presigned' });
  });

  it('passes null through unchanged', () => {
    expect(unwrapInvoke(null)).toBeNull();
  });
});
