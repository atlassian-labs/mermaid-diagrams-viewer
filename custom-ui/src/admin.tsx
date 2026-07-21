import React, { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@forge/bridge';
import { token } from '@atlaskit/tokens';
import { unwrapInvoke } from './invoke.ts';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface AdminData {
  iconPacks: string[];
}

interface UploadUrlResponse {
  url: string;
}

async function sha256Base64(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

export const AdminPanel = () => {
  const [iconPacks, setIconPacks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [packName, setPackName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deletingPack, setDeletingPack] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = unwrapInvoke<AdminData>(await invoke('getAdminData'));
      const packs: string[] = Array.isArray(res.iconPacks) ? res.iconPacks : [];
      setIconPacks(packs);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleUpload = async () => {
    if (!packName.trim() || !file) return;

    setUploadState('uploading');
    setUploadError('');

    try {
      const buffer = await file.arrayBuffer();
      const checksum = await sha256Base64(buffer);

      const { url } = unwrapInvoke<UploadUrlResponse>(
        await invoke('createIconPackUploadUrl', {
          name: packName.trim(),
          length: buffer.byteLength,
          checksum,
          checksumType: 'SHA256',
        }),
      );

      const uploadResp = await fetch(url, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: buffer,
      });

      if (!uploadResp.ok) {
        throw new Error(`Upload failed: ${String(uploadResp.status)}`);
      }

      const updatedPacks = Array.from(new Set([...iconPacks, packName.trim()]));
      await invoke('saveIconPacksIndex', { packs: updatedPacks });

      setIconPacks(updatedPacks);
      setPackName('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadState('success');
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
      );
      setUploadState('error');
    }
  };

  const handleDelete = async (name: string) => {
    setDeletingPack(name);
    try {
      await invoke('deleteIconPack', { name });
      setIconPacks((prev: string[]) => prev.filter((p) => p !== name));
    } finally {
      setDeletingPack(null);
    }
  };

  const containerStyle: React.CSSProperties = {
    padding: token('space.400', '32px'),
    maxWidth: '640px',
    fontFamily: 'inherit',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: token('color.text', '#172B4D'),
    margin: `0 0 ${token('space.100', '8px')}`,
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: token('color.text.subtle', '#626F86'),
    margin: `0 0 ${token('space.300', '24px')}`,
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: token('color.text', '#172B4D'),
    margin: `0 0 ${token('space.100', '8px')}`,
  };

  const listStyle: React.CSSProperties = {
    border: `1px solid ${token('color.border', '#091E4224')}`,
    borderRadius: '3px',
    marginBottom: token('space.300', '24px'),
    overflow: 'hidden',
  };

  const listItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${token('space.150', '12px')} ${token('space.200', '16px')}`,
    borderBottom: `1px solid ${token('color.border', '#091E4224')}`,
    fontSize: '14px',
  };

  const lastItemStyle: React.CSSProperties = {
    ...listItemStyle,
    borderBottom: 'none',
  };

  const emptyStyle: React.CSSProperties = {
    ...listItemStyle,
    color: token('color.text.subtlest', '#8590A2'),
    borderBottom: 'none',
  };

  const formStyle: React.CSSProperties = {
    border: `1px solid ${token('color.border', '#091E4224')}`,
    borderRadius: '3px',
    padding: token('space.200', '16px'),
    display: 'flex',
    flexDirection: 'column',
    gap: token('space.150', '12px'),
    marginBottom: token('space.200', '16px'),
  };

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: token('space.050', '4px'),
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: token('color.text.subtle', '#626F86'),
  };

  const inputStyle: React.CSSProperties = {
    padding: `${token('space.075', '6px')} ${token('space.100', '8px')}`,
    border: `2px solid ${token('color.border.input', '#091E4224')}`,
    borderRadius: '3px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const hintStyle: React.CSSProperties = {
    fontSize: '12px',
    color: token('color.text.subtlest', '#8590A2'),
    margin: 0,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: token('color.text.danger', '#AE2A19'),
    margin: 0,
  };

  if (loading) {
    return (
      <div
        style={{
          ...containerStyle,
          display: 'flex',
          alignItems: 'center',
          gap: token('space.100', '8px'),
        }}
      >
        <Spinner size="small" />
        <span style={{ fontSize: '14px', color: token('color.text.subtle') }}>
          Loading…
        </span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={containerStyle}>
        <p style={errorStyle}>Failed to load admin data. Please refresh.</p>
      </div>
    );
  }

  const canUpload =
    packName.trim() !== '' && file !== null && uploadState !== 'uploading';

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Mermaid Diagrams Viewer</h1>
      <p style={descriptionStyle}>
        Manage icon packs available for use in Mermaid diagrams. Reference them
        in diagrams as <code>prefix:icon-name</code>, for example{' '}
        <code>logos:aws-ec2</code>.
      </p>

      <h2 style={sectionHeadingStyle}>Icon Packs</h2>

      <div style={listStyle}>
        {iconPacks.length === 0 ? (
          <div style={emptyStyle}>No icon packs registered yet.</div>
        ) : (
          iconPacks.map((name, i) => (
            <div
              key={name}
              style={i === iconPacks.length - 1 ? lastItemStyle : listItemStyle}
            >
              <code style={{ fontSize: '13px' }}>{name}</code>
              <Button
                appearance="subtle"
                isDisabled={deletingPack !== null}
                isLoading={deletingPack === name}
                onClick={() => void handleDelete(name)}
              >
                Delete
              </Button>
            </div>
          ))
        )}
      </div>

      <h2 style={sectionHeadingStyle}>Upload new pack</h2>

      <div style={formStyle}>
        <div style={fieldStyle}>
          <label htmlFor="pack-name" style={labelStyle}>
            Pack name
          </label>
          <input
            id="pack-name"
            style={inputStyle}
            type="text"
            placeholder="e.g. logos"
            value={packName}
            disabled={uploadState === 'uploading'}
            onChange={(e) => {
              setPackName(e.target.value);
              setUploadState('idle');
            }}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="pack-file" style={labelStyle}>
            File
          </label>
          <input
            id="pack-file"
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            disabled={uploadState === 'uploading'}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setUploadState('idle');
            }}
          />
        </div>

        <div>
          <Button
            appearance="primary"
            isDisabled={!canUpload}
            isLoading={uploadState === 'uploading'}
            onClick={() => void handleUpload()}
          >
            Upload
          </Button>
        </div>
      </div>

      {uploadState === 'error' && <p style={errorStyle}>{uploadError}</p>}
      {uploadState === 'success' && (
        <p
          style={{
            ...hintStyle,
            color: token('color.text.success', '#216E4E'),
          }}
        >
          Icon pack uploaded successfully.
        </p>
      )}

      <p style={hintStyle}>
        Upload a JSON file from{' '}
        <a href="https://iconify.design" target="_blank" rel="noreferrer">
          iconify.design
        </a>
        . The pack name is used as the prefix in diagram references.
      </p>
    </div>
  );
};
