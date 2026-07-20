import {
  iconPackCacheKey,
  readFromCache,
  writeToCache,
  fetchAndCacheIconPack,
  makeIconPackLoader,
  isPageReload,
  registerIconPacks,
} from '../icon-packs';
import { invoke } from '@forge/bridge';
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  type MockedFunction,
} from 'vitest';

vi.mock('@forge/bridge', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = invoke as MockedFunction<typeof invoke>;

// ---------------------------------------------------------------------------
// Helpers to stub window.caches
// ---------------------------------------------------------------------------

function makeCacheStorage(matchResult: Response | undefined) {
  const cacheStore = {
    match: vi.fn().mockResolvedValue(matchResult),
    put: vi.fn().mockResolvedValue(undefined),
  };
  return {
    open: vi.fn().mockResolvedValue(cacheStore),
    store: cacheStore,
  };
}

function makeCachedResponse(body: unknown, cachedAtMs: number): Response {
  const headers = new Headers({ 'Cached-At': String(cachedAtMs) });
  return new Response(JSON.stringify(body), { headers });
}

// ---------------------------------------------------------------------------

describe('iconPackCacheKey', () => {
  it('produces a stable, URL-safe key for a pack name', () => {
    expect(iconPackCacheKey('logos')).toBe('/__mdv_iconpacks/logos');
    expect(iconPackCacheKey('my pack')).toBe('/__mdv_iconpacks/my%20pack');
  });
});

// ---------------------------------------------------------------------------

describe('isPageReload', () => {
  it('returns false when performance API is unavailable', () => {
    const original = global.performance;
    // @ts-expect-error intentionally removing performance to test the guard
    delete global.performance;
    expect(isPageReload()).toBe(false);
    global.performance = original;
  });

  it('returns false when there are no navigation entries', () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);
    expect(isPageReload()).toBe(false);
  });

  it('returns true when the navigation type is reload', () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      { type: 'reload' } as PerformanceNavigationTiming,
    ]);
    expect(isPageReload()).toBe(true);
  });

  it('returns false when the navigation type is navigate', () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      { type: 'navigate' } as PerformanceNavigationTiming,
    ]);
    expect(isPageReload()).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('readFromCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined when Cache API is unavailable', async () => {
    expect(await readFromCache('logos', undefined)).toBeUndefined();
  });

  it('returns undefined when no cached entry exists', async () => {
    const stub = makeCacheStorage(undefined);
    expect(
      await readFromCache('logos', stub as unknown as CacheStorage),
    ).toBeUndefined();
  });

  it('returns undefined when the Cached-At header is not a valid number', async () => {
    const headers = new Headers({ 'Cached-At': 'not-a-number' });
    const badResponse = new Response('{}', { headers });
    const stub = makeCacheStorage(badResponse);
    expect(
      await readFromCache('logos', stub as unknown as CacheStorage),
    ).toBeUndefined();
  });

  it('returns undefined when the cached entry is stale', async () => {
    const staleMs = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
    const stub = makeCacheStorage(makeCachedResponse({ foo: 1 }, staleMs));
    expect(
      await readFromCache('logos', stub as unknown as CacheStorage),
    ).toBeUndefined();
  });

  it('returns parsed JSON when the cached entry is fresh', async () => {
    const freshMs = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    const payload = { prefix: 'logos', icons: {} };
    const stub = makeCacheStorage(makeCachedResponse(payload, freshMs));
    expect(
      await readFromCache('logos', stub as unknown as CacheStorage),
    ).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------

describe('writeToCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when Cache API is unavailable', async () => {
    await expect(
      writeToCache('logos', new Response('{}', { status: 200 }), undefined),
    ).resolves.toBeUndefined();
  });

  it('writes the response to cache with a Cached-At header', async () => {
    const stub = makeCacheStorage(undefined);
    const before = Date.now();
    await writeToCache(
      'logos',
      new Response('{}', { status: 200 }),
      stub as unknown as CacheStorage,
    );
    expect(stub.store.put).toHaveBeenCalledOnce();
    const [key, stored] = stub.store.put.mock.calls[0] as [string, Response];
    expect(key).toBe(iconPackCacheKey('logos'));
    const cachedAt = Number(stored.headers.get('Cached-At'));
    expect(cachedAt).toBeGreaterThanOrEqual(before);
    expect(cachedAt).toBeLessThanOrEqual(Date.now());
  });
});

// ---------------------------------------------------------------------------

describe('fetchAndCacheIconPack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the CDN URL and returns parsed JSON', async () => {
    const payload = { prefix: 'logos', icons: {} };
    mockInvoke.mockResolvedValue('https://cdn.example.com/logos.json');
    const stub = makeCacheStorage(undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(payload), { status: 200 }),
        ),
    );
    expect(
      await fetchAndCacheIconPack('logos', stub as unknown as CacheStorage),
    ).toEqual(payload);
    expect(mockInvoke).toHaveBeenCalledWith('getIconPackUrl', {
      pack: 'logos',
    });
  });

  it('throws when the CDN fetch returns a non-ok status', async () => {
    mockInvoke.mockResolvedValue('https://cdn.example.com/logos.json');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('Not Found', { status: 404, statusText: 'Not Found' }),
        ),
    );
    await expect(fetchAndCacheIconPack('logos', undefined)).rejects.toThrow(
      'Failed to fetch icon pack "logos": 404',
    );
  });
});

// ---------------------------------------------------------------------------

describe('makeIconPackLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached data without calling invoke when cache is fresh and not a reload', async () => {
    const payload = { prefix: 'logos', icons: {} };
    const freshMs = Date.now() - 5 * 60 * 1000;
    const stub = makeCacheStorage(makeCachedResponse(payload, freshMs));

    const loader = makeIconPackLoader(
      'logos',
      false,
      stub as unknown as CacheStorage,
    );
    expect(await loader()).toEqual(payload);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('fetches fresh data when isReload is true even if cache is warm', async () => {
    const payload = { prefix: 'logos', icons: {} };
    const freshMs = Date.now() - 5 * 60 * 1000;
    const stub = makeCacheStorage(makeCachedResponse(payload, freshMs));
    mockInvoke.mockResolvedValue('https://cdn.example.com/logos.json');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(payload), { status: 200 }),
        ),
    );

    const loader = makeIconPackLoader(
      'logos',
      true,
      stub as unknown as CacheStorage,
    );
    await loader();
    expect(mockInvoke).toHaveBeenCalledWith('getIconPackUrl', {
      pack: 'logos',
    });
  });
});

// ---------------------------------------------------------------------------

describe('registerIconPacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);
  });

  it('does not call register when listIconPacks returns an empty array', async () => {
    mockInvoke.mockResolvedValue([]);
    const register = vi.fn();
    await registerIconPacks(register);
    expect(register).not.toHaveBeenCalled();
  });

  it('calls register with one entry per pack name', async () => {
    mockInvoke.mockResolvedValue(['logos', 'mdi']);
    const register = vi.fn();
    await registerIconPacks(register);
    expect(register).toHaveBeenCalledOnce();
    const [packs] = register.mock.calls[0] as [
      { name: string; loader: () => Promise<unknown> }[],
    ];
    expect(packs.map((p) => p.name)).toEqual(['logos', 'mdi']);
    expect(typeof packs[0].loader).toBe('function');
  });

  it('unwraps a bridge-wrapped response', async () => {
    mockInvoke.mockResolvedValue({ body: ['logos'] });
    const register = vi.fn();
    await registerIconPacks(register);
    expect(register).toHaveBeenCalledOnce();
  });
});
