import Resolver from '@forge/resolver';
import { permissions } from '@forge/api';
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
 * Store.  Returns an empty array if no packs have been seeded yet, or
 * if the storage:app permission has not been granted for this installation.
 */
resolver.define('listIconPacks', async () => {
  if (!permissions.hasScope('storage:app')) {
    return [];
  }
  return getIconPackNames();
});

/**
 * Returns a CDN URL for the given icon pack.  The URL is valid for 1 hour.
 * Throws if the pack has not been seeded into the Object Store.
 */
resolver.define('getIconPackUrl', async (req) => {
  if (!permissions.hasScope('storage:app')) {
    throw new Error('The storage:app permission has not been granted for this installation.');
  }
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
  if (!permissions.hasScope('storage:app')) {
    return { iconPacks: [] };
  }
  return { iconPacks: await getIconPackNames() };
});

/**
 * Creates a pre-signed upload URL for an icon pack JSON file.
 * The caller is responsible for PUT-ing the file to the returned URL.
 */
resolver.define('createIconPackUploadUrl', async (req) => {
  if (!permissions.hasScope('storage:app')) {
    throw new Error('The storage:app permission has not been granted for this installation.');
  }
  if (req.context?.extension?.type !== 'confluence:globalSettings') {
    throw new Error('Admin access required.');
  }
  const payload = (req.payload ?? {}) as Record<string, unknown>;
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const length = payload.length;
  const checksum =
    typeof payload.checksum === 'string' ? payload.checksum.trim() : '';
  const checksumType = payload.checksumType;

  if (name === '') {
    throw new Error('Pack name must be a non-empty string.');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Pack name may only contain letters, numbers, "_" and "-".');
  }
  if (typeof length !== 'number' || !Number.isFinite(length) || length <= 0) {
    throw new Error('length must be a positive number.');
  }
  if (checksum === '') {
    throw new Error('checksum must be a non-empty string.');
  }
  if (
    checksumType !== 'SHA1' &&
    checksumType !== 'SHA256' &&
    checksumType !== 'CRC32' &&
    checksumType !== 'CRC32C'
  ) {
    throw new Error('checksumType must be one of SHA1, SHA256, CRC32, CRC32C.');
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
  if (!permissions.hasScope('storage:app')) {
    throw new Error('The storage:app permission has not been granted for this installation.');
  }
  if (req.context?.extension?.type !== 'confluence:globalSettings') {
    throw new Error('Admin access required.');
  }
  const payload = (req.payload ?? {}) as Record<string, unknown>;
  const packsRaw = payload.packs;

  if (!Array.isArray(packsRaw)) {
    throw new Error('packs must be an array of strings.');
  }

  const packs = Array.from(
    new Set(
      packsRaw
        .filter((p): p is string => typeof p === 'string')
        .map((p) => p.trim())
        .filter((p) => p !== ''),
    ),
  );

  if (!packs.every((p) => /^[a-zA-Z0-9_-]+$/.test(p))) {
    throw new Error('packs must only contain letters, numbers, "_" and "-".');
  }

  await kvs.set(ICON_PACKS_INDEX_KEY, packs);
  return { ok: true };
});

/**
 * Deletes an icon pack from the Object Store and removes it from the KVS index.
 */
resolver.define('deleteIconPack', async (req) => {
  if (!permissions.hasScope('storage:app')) {
    throw new Error('The storage:app permission has not been granted for this installation.');
  }
  if (req.context?.extension?.type !== 'confluence:globalSettings') {
    throw new Error('Admin access required.');
  }
  const payload = (req.payload ?? {}) as Record<string, unknown>;
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (name === '') {
    throw new Error('Pack name must be a non-empty string.');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Pack name may only contain letters, numbers, "_" and "-".');
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
