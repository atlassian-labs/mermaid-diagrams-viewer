import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';
import fos from '@forge/object-store';

const ICON_PACKS_INDEX_KEY = 'icon-packs/index';

const resolver = new Resolver();

/**
 * Returns the list of icon pack names that have been uploaded to the Object
 * Store.  Returns an empty array if no packs have been seeded yet.
 */
resolver.define('listIconPacks', async () => {
  const packs = await kvs.get<unknown>(ICON_PACKS_INDEX_KEY);
  return Array.isArray(packs)
    ? packs.filter((p): p is string => typeof p === 'string')
    : [];
});

/**
 * Returns a CDN URL for the given icon pack.  The URL is valid for 1 hour.
 * Throws if the pack has not been seeded into the Object Store.
 */
resolver.define('getIconPackUrl', async (req) => {
  const pack = req.payload?.pack;
  if (typeof pack !== 'string' || pack.trim() === '') {
    throw new Error('Icon pack name must be a non-empty string.');
  }

  const result = await fos.createCDNUrl(`iconpack-${pack}`);
  if (!result) {
    throw new Error(
      `Icon pack "${pack}" not found in Object Store. ` +
        `Upload it first with key "iconpack-${pack}".`,
    );
  }
  return result.url;
});

export const handler = resolver.getDefinitions();
