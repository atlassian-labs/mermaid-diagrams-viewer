import { invoke } from '@forge/bridge';
import type { IconifyJSON } from '@iconify/types';
import { unwrapInvoke } from './invoke.ts';

const CACHE_NAME = 'mermaid-diagrams-viewer-icon-packs';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/** Returns the cache key for a given icon pack name. */
export function iconPackCacheKey(name: string): string {
  return `/__mdv_iconpacks/${encodeURIComponent(name)}`;
}

/** Resolves the browser's CacheStorage, or undefined if unavailable. */
function resolveCacheStorage(): CacheStorage | undefined {
  return typeof window !== 'undefined' && 'caches' in window
    ? window.caches
    : undefined;
}

/**
 * Reads a cached icon pack from Cache Storage.
 * Returns `undefined` if the Cache API is unavailable, the entry is missing,
 * or the cached entry has exceeded `maxAgeMs`.
 */
export async function readFromCache(
  name: string,
  cacheStorage: CacheStorage | undefined = resolveCacheStorage(),
  maxAgeMs = CACHE_MAX_AGE_MS,
): Promise<IconifyJSON | undefined> {
  if (!cacheStorage) return undefined;
  const cacheKey = iconPackCacheKey(name);
  const cached = await cacheStorage
    .open(CACHE_NAME)
    .then((cache) => cache.match(cacheKey))
    .catch(() => undefined);
  if (!cached) return undefined;
  const cachedAtRaw = cached.headers.get('Cached-At');
  const cachedAt = Number(cachedAtRaw);
  if (!cachedAtRaw || !Number.isFinite(cachedAt) || cachedAt <= 0) return undefined;
  if (new Date().valueOf() - cachedAt >= maxAgeMs) return undefined;
  return cached.json() as Promise<IconifyJSON>;
}

/**
 * Writes an icon pack response to Cache Storage, stamping a `Cached-At` header.
 * Silently swallows errors (cache is best-effort).
 */
export async function writeToCache(
  name: string,
  resp: Response,
  cacheStorage: CacheStorage | undefined = resolveCacheStorage(),
): Promise<void> {
  if (!cacheStorage) return;
  const cacheKey = iconPackCacheKey(name);
  const modifiedHeaders = new Headers(resp.headers);
  modifiedHeaders.set('Cached-At', new Date().valueOf().toString());
  const newResponse = new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: modifiedHeaders,
  });
  await cacheStorage
    .open(CACHE_NAME)
    .then((cache) => cache.put(cacheKey, newResponse))
    .catch(() => undefined);
}

/**
 * Fetches an icon pack from the Forge Object Store, writes it to Cache
 * Storage, and returns the parsed JSON.
 */
export async function fetchAndCacheIconPack(
  name: string,
  cacheStorage: CacheStorage | undefined = resolveCacheStorage(),
): Promise<IconifyJSON> {
  const urlRes = await invoke<string>('getIconPackUrl', { pack: name });
  const url = unwrapInvoke(urlRes);
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch icon pack "${name}": ${String(resp.status)} ${resp.statusText}`,
    );
  }
  const [forCache, forParse] = [resp.clone(), resp.clone()];
  void writeToCache(name, forCache, cacheStorage);
  return forParse.json() as Promise<IconifyJSON>;
}

/**
 * Builds a mermaid icon pack loader for a given pack name.
 * Uses Cache Storage when available, falling back to a live fetch.
 *
 * @param name     The icon pack name (used as the mermaid prefix).
 * @param isReload When true, bypasses the cache and always fetches fresh data.
 */
export function makeIconPackLoader(
  name: string,
  isReload: boolean,
  cacheStorage: CacheStorage | undefined = resolveCacheStorage(),
): () => Promise<IconifyJSON> {
  return async () => {
    if (!isReload) {
      const cached = await readFromCache(name, cacheStorage);
      if (cached) return cached;
    }
    return fetchAndCacheIconPack(name, cacheStorage);
  };
}

/**
 * Returns true when the current navigation was triggered by a page reload,
 * which signals that the icon pack cache should be bypassed.
 */
export function isPageReload(): boolean {
  if (
    typeof performance === 'undefined' ||
    typeof performance.getEntriesByType !== 'function'
  ) {
    return false;
  }
  const entry = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  return entry?.type === 'reload';
}

/**
 * Registers all icon packs with mermaid. Fetches the list of pack names from
 * the Forge resolver and registers a cache-aware loader for each one.
 *
 * Resolves without registering any packs when:
 * - The `storage:app` permission has not been granted (resolver returns [])
 * - No packs have been seeded yet
 */
export async function registerIconPacks(
  register: (
    packs: { name: string; loader: () => Promise<IconifyJSON> }[],
  ) => void,
): Promise<void> {
  const res = await invoke<string[]>('listIconPacks');
  const packNames = unwrapInvoke(res);
  if (!Array.isArray(packNames) || packNames.length === 0) return;

  const reload = isPageReload();
  const cacheStorage = resolveCacheStorage();
  register(
    packNames.map((name) => ({
      name,
      loader: makeIconPackLoader(name, reload, cacheStorage),
    })),
  );
}
