import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { permissions } from '@forge/api';
import { kvs } from '@forge/kvs';
import fos from '@forge/object-store';

// vi.hoisted ensures this runs before vi.mock factories and static imports,
// making the captured handlers available inside the @forge/resolver factory.
const { capturedHandlers } = vi.hoisted(() => {
  const capturedHandlers: Record<string, (req: ResolverRequest) => Promise<unknown>> = {};
  return { capturedHandlers };
});

vi.mock('@forge/resolver', () => ({
  default: class MockResolver {
    define(name: string, fn: (req: ResolverRequest) => Promise<unknown>): void {
      capturedHandlers[name] = fn;
    }
    getDefinitions() {
      return {};
    }
  },
}));

vi.mock('@forge/api', () => ({
  permissions: { hasScope: vi.fn() },
}));

vi.mock('@forge/kvs', () => ({
  kvs: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('@forge/object-store', () => ({
  default: {
    createPublicDownloadUrl: vi.fn(),
    createPublicUploadUrl: vi.fn(),
    delete: vi.fn(),
  },
}));

// Importing the module triggers all resolver.define() calls, populating capturedHandlers.
import '../index';

interface ResolverRequest {
  payload?: Record<string, unknown>;
  context?: { extension?: { type?: string } };
}

const call = (name: string, req: ResolverRequest = {}) =>
  capturedHandlers[name](req);

const ADMIN_CTX: ResolverRequest = {
  context: { extension: { type: 'confluence:globalSettings' } },
};

const mockHasScope = permissions.hasScope as MockedFunction<typeof permissions.hasScope>;
const mockKvsGet = kvs.get as MockedFunction<(key: string) => Promise<unknown>>;
const mockKvsSet = kvs.set as MockedFunction<typeof kvs.set>;
const mockFosDownload = fos.createPublicDownloadUrl as MockedFunction<
  typeof fos.createPublicDownloadUrl
>;
const mockFosUpload = fos.createPublicUploadUrl as MockedFunction<
  typeof fos.createPublicUploadUrl
>;
const mockFosDelete = fos.delete as MockedFunction<typeof fos.delete>;

describe('resolver handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listIconPacks', () => {
    it('returns [] when storage:app permission is not granted', async () => {
      mockHasScope.mockReturnValue(false);
      expect(await call('listIconPacks')).toEqual([]);
    });

    it('returns the pack list from kvs when permitted', async () => {
      mockHasScope.mockReturnValue(true);
      mockKvsGet.mockResolvedValue(['pack-a', 'pack-b']);
      expect(await call('listIconPacks')).toEqual(['pack-a', 'pack-b']);
    });

    it('returns [] when kvs has no data', async () => {
      mockHasScope.mockReturnValue(true);
      mockKvsGet.mockResolvedValue(undefined);
      expect(await call('listIconPacks')).toEqual([]);
    });
  });

  describe('getIconPackUrl', () => {
    it('throws when storage:app permission is not granted', async () => {
      mockHasScope.mockReturnValue(false);
      await expect(call('getIconPackUrl', { payload: { pack: 'pack-a' } })).rejects.toThrow(
        'storage:app permission',
      );
    });

    it('throws for an empty pack name', async () => {
      mockHasScope.mockReturnValue(true);
      await expect(call('getIconPackUrl', { payload: { pack: '' } })).rejects.toThrow(
        'non-empty string',
      );
    });

    it('returns the CDN URL when the pack exists', async () => {
      mockHasScope.mockReturnValue(true);
      mockKvsGet.mockResolvedValue(['pack-a']);
      mockFosDownload.mockResolvedValue({ url: 'https://cdn.example.com/pack-a.json' });
      const result = await call('getIconPackUrl', { payload: { pack: 'pack-a' } });
      expect(result).toBe('https://cdn.example.com/pack-a.json');
      expect(mockFosDownload).toHaveBeenCalledWith('iconpack-pack-a');
    });

    it('throws when the pack is not found in the Object Store', async () => {
      mockHasScope.mockReturnValue(true);
      mockKvsGet.mockResolvedValue(['missing']); // The pack is registered but not found in the Object Store
      mockFosDownload.mockResolvedValue(undefined);
      await expect(
        call('getIconPackUrl', { payload: { pack: 'missing' } }),
      ).rejects.toThrow('"missing" not found');
    });
  });

  describe('getAdminData', () => {
    it('returns empty iconPacks when storage:app permission is not granted', async () => {
      mockHasScope.mockReturnValue(false);
      expect(await call('getAdminData')).toEqual({ iconPacks: [] });
    });

    it('returns iconPacks from kvs when permitted', async () => {
      mockHasScope.mockReturnValue(true);
      mockKvsGet.mockResolvedValue(['pack-a']);
      expect(await call('getAdminData')).toEqual({ iconPacks: ['pack-a'] });
    });
  });

  describe('createIconPackUploadUrl', () => {
    const validPayload = {
      name: 'test-pack',
      length: 1024,
      checksum: 'abc123',
      checksumType: 'SHA256',
    };

    it('throws when storage:app permission is not granted', async () => {
      mockHasScope.mockReturnValue(false);
      await expect(
        call('createIconPackUploadUrl', { ...ADMIN_CTX, payload: validPayload }),
      ).rejects.toThrow('storage:app permission');
    });

    it('throws when called outside globalSettings context', async () => {
      mockHasScope.mockReturnValue(true);
      await expect(
        call('createIconPackUploadUrl', { payload: validPayload }),
      ).rejects.toThrow('Admin access required');
    });

    it('returns the upload URL for valid input', async () => {
      mockHasScope.mockReturnValue(true);
      mockFosUpload.mockResolvedValue({ url: 'https://upload.example.com/presigned' });
      const result = await call('createIconPackUploadUrl', {
        ...ADMIN_CTX,
        payload: validPayload,
      });
      expect(result).toEqual({ url: 'https://upload.example.com/presigned' });
      expect(mockFosUpload).toHaveBeenCalledWith({
        key: 'iconpack-test-pack',
        length: 1024,
        checksum: 'abc123',
        checksumType: 'SHA256',
        overwrite: true,
      });
    });
  });

  describe('saveIconPacksIndex', () => {
    it('throws when storage:app permission is not granted', async () => {
      mockHasScope.mockReturnValue(false);
      await expect(
        call('saveIconPacksIndex', { ...ADMIN_CTX, payload: { packs: ['pack-a'] } }),
      ).rejects.toThrow('storage:app permission');
    });

    it('throws when called outside globalSettings context', async () => {
      mockHasScope.mockReturnValue(true);
      await expect(
        call('saveIconPacksIndex', { payload: { packs: ['pack-a'] } }),
      ).rejects.toThrow('Admin access required');
    });

    it('saves the deduplicated list and returns ok', async () => {
      mockHasScope.mockReturnValue(true);
      mockKvsSet.mockResolvedValue(undefined);
      const result = await call('saveIconPacksIndex', {
        ...ADMIN_CTX,
        payload: { packs: ['pack-a', 'pack-b', 'pack-a'] },
      });
      expect(result).toEqual({ ok: true });
      expect(mockKvsSet).toHaveBeenCalledWith('icon-packs', ['pack-a', 'pack-b']);
    });
  });

  describe('deleteIconPack', () => {
    it('throws when storage:app permission is not granted', async () => {
      mockHasScope.mockReturnValue(false);
      await expect(
        call('deleteIconPack', { ...ADMIN_CTX, payload: { name: 'pack-a' } }),
      ).rejects.toThrow('storage:app permission');
    });

    it('throws when called outside globalSettings context', async () => {
      mockHasScope.mockReturnValue(true);
      await expect(
        call('deleteIconPack', { payload: { name: 'pack-a' } }),
      ).rejects.toThrow('Admin access required');
    });

    it('deletes the pack and removes it from the kvs index', async () => {
      mockHasScope.mockReturnValue(true);
      mockFosDelete.mockResolvedValue(undefined);
      mockKvsGet.mockResolvedValue(['pack-a', 'pack-b']);
      mockKvsSet.mockResolvedValue(undefined);
      const result = await call('deleteIconPack', {
        ...ADMIN_CTX,
        payload: { name: 'pack-a' },
      });
      expect(result).toEqual({ ok: true });
      expect(mockFosDelete).toHaveBeenCalledWith('iconpack-pack-a');
      expect(mockKvsSet).toHaveBeenCalledWith('icon-packs', ['pack-b']);
    });
  });
});
