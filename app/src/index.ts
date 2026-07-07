import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';
import fos from '@forge/object-store';

const ICON_PACKS_INDEX_KEY = 'icon-packs';

async function getIconPackNames(): Promise<string[]> {
  const packs = await kvs.get<unknown>(ICON_PACKS_INDEX_KEY);
  return Array.isArray(packs)
    ? packs.filter((p): p is string => typeof p === 'string')
    : [];
}

const resolver = new Resolver();

/**
 * Returns the list of icon pack names that have been uploaded to the Object
 * Store.  Returns an empty array if no packs have been seeded yet.
 */
resolver.define('listIconPacks', async () => {
  return getIconPackNames();
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

  // Using createPublicDownloadUrl as the UI is fetching the icon pack
  const result = await fos.createPublicDownloadUrl(`iconpack-${pack}`);
  if (!result) {
    throw new Error(
      `Icon pack "${pack}" not found in Object Store. ` +
        `Upload it first with key "iconpack-${pack}".`,
    );
  }
  return result.url;
});

/**
 * Returns the list of registered icon pack names for the admin panel.
 */
resolver.define('getAdminData', async () => {
  return { iconPacks: await getIconPackNames() };
});

/**
 * Creates a pre-signed upload URL for an icon pack JSON file.
 * The caller is responsible for PUT-ing the file to the returned URL.
 */
resolver.define('createIconPackUploadUrl', async (req) => {
  const { name, length, checksum, checksumType } = req.payload as {
    name: string;
    length: number;
    checksum: string;
    checksumType: 'SHA1' | 'SHA256' | 'CRC32' | 'CRC32C';
  };

  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('Pack name must be a non-empty string.');
  }
  if (typeof length !== 'number' || length <= 0) {
    throw new Error('length must be a positive number.');
  }
  if (typeof checksum !== 'string' || checksum.trim() === '') {
    throw new Error('checksum must be a non-empty string.');
  }

  const result = await fos.createPublicUploadUrl({
    key: `iconpack-${name}`,
    length,
    checksum,
    checksumType,
    overwrite: true,
  });

  return { url: result.url };
});

/**
 * Saves the full list of icon pack names to the KVS index.
 */
resolver.define('saveIconPacksIndex', async (req) => {
  const { packs } = req.payload as { packs: string[] };
  if (!Array.isArray(packs) || !packs.every((p) => typeof p === 'string')) {
    throw new Error('packs must be an array of strings.');
  }
  await kvs.set(ICON_PACKS_INDEX_KEY, packs);
  return { ok: true };
});

/**
 * Deletes an icon pack from the Object Store and removes it from the KVS index.
 */
resolver.define('deleteIconPack', async (req) => {
  const { name } = req.payload as { name: string };
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('Pack name must be a non-empty string.');
  }
  await fos.delete(`iconpack-${name}`);
  const current = await getIconPackNames();
  await kvs.set(
    ICON_PACKS_INDEX_KEY,
    current.filter((p) => p !== name),
  );
  return { ok: true };
});

export const handler = resolver.getDefinitions();
