'use client';

import { useEffect, useMemo, useState } from 'react';

type SyncFolder = {
    id: string;
    storageKey: string;
    folderPath: string;
    enabled: boolean;
    lastScannedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type SyncSummary = {
    scannedFolders: number;
    scannedFiles: number;
    created: number;
    updated: number;
    skipped: number;
    missingMarked: number;
    errors: Array<{
        storageKey: string;
        folderPath: string;
        error: string;
    }>;
};

export function FilesystemSyncPanel() {
    const [folders, setFolders] = useState<SyncFolder[]>([]);
    const [storageKey, setStorageKey] = useState('main');
    const [folderPath, setFolderPath] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function loadFolders() {
        setLoading(true);

        try {
            const response = await fetch('/api/sync-folders');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? 'Failed to load sync folders');
            }

            setFolders(data.folders ?? []);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load sync folders');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadFolders();
    }, []);

    const enabledCount = useMemo(() => folders.filter((folder) => folder.enabled).length, [folders]);

    async function addFolder(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch('/api/sync-folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storageKey,
                    folderPath,
                    enabled: true
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details ?? data.error ?? 'Could not create sync folder');
            }

            setFolderPath('');
            setMessage('Sync folder added.');
            await loadFolders();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Could not create sync folder');
        } finally {
            setSaving(false);
        }
    }

    async function toggleFolder(folder: SyncFolder) {
        setError(null);
        setMessage(null);

        try {
            const response = await fetch(`/api/sync-folders/${folder.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: !folder.enabled
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details ?? data.error ?? 'Could not update sync folder');
            }

            setFolders((current) =>
                current.map((item) => (item.id === folder.id ? data.folder : item))
            );
        } catch (toggleError) {
            setError(toggleError instanceof Error ? toggleError.message : 'Could not update sync folder');
        }
    }

    async function deleteFolder(id: string) {
        setError(null);
        setMessage(null);

        try {
            const response = await fetch(`/api/sync-folders/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? 'Could not delete sync folder');
            }

            setFolders((current) => current.filter((folder) => folder.id !== id));
            setMessage('Sync folder removed.');
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Could not delete sync folder');
        }
    }

    async function runSync() {
        setSyncing(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch('/api/photos/fs-sync', {
                method: 'POST'
            });

            const data = (await response.json()) as SyncSummary & { error?: string; details?: string };

            if (!response.ok) {
                throw new Error(data.details ?? data.error ?? 'Filesystem sync failed');
            }

            const parts = [
                `Folders scanned: ${data.scannedFolders}`,
                `Files scanned: ${data.scannedFiles}`,
                `Created: ${data.created}`,
                `Updated: ${data.updated}`,
                `Skipped: ${data.skipped}`
            ];

            if (data.missingMarked > 0) {
                parts.push(`Missing marked: ${data.missingMarked}`);
            }

            if (data.errors.length > 0) {
                parts.push(`Folder errors: ${data.errors.length}`);
            }

            parts.push('Duplicate content across different folders is allowed');

            setMessage(parts.join(' · '));
            await loadFolders();
        } catch (syncError) {
            setError(syncError instanceof Error ? syncError.message : 'Filesystem sync failed');
        } finally {
            setSyncing(false);
        }
    }

    return (
        <section className="card stack">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ marginBottom: 4 }}>Filesystem sync</h2>
                    <div className="small">
                        Configure server-side folders to scan recursively and import photo references into the database.
                    </div>
                </div>

                <button type="button" onClick={() => void runSync()} disabled={syncing || enabledCount === 0}>
                    {syncing ? 'Syncing…' : 'Run sync now'}
                </button>
            </div>

            {error && <div className="card error-banner">{error}</div>}
            {message && <div className="card success-banner">{message}</div>}

            <form onSubmit={addFolder} className="stack">
                <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <label>
                        Storage key
                        <input
                            value={storageKey}
                            onChange={(event) => setStorageKey(event.target.value)}
                            placeholder="main"
                        />
                    </label>

                    <label style={{ flex: 1, minWidth: 240 }}>
                        Folder path
                        <input
                            value={folderPath}
                            onChange={(event) => setFolderPath(event.target.value)}
                            placeholder="e.g. trips/2024"
                        />
                    </label>

                    <button type="submit" disabled={saving || !storageKey.trim() || !folderPath.trim()}>
                        {saving ? 'Saving…' : 'Add folder'}
                    </button>
                </div>

                <div className="small">
                    Use a path relative to the configured storage root. Subfolders are scanned recursively.
                </div>
            </form>

            <div className="stack">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Configured folders</strong>
                    <span className="small">{loading ? 'Loading…' : `${folders.length} folder(s), ${enabledCount} enabled`}</span>
                </div>

                {folders.length === 0 && !loading ? (
                    <div className="small">No sync folders configured yet.</div>
                ) : (
                    <div className="stack">
                        {folders.map((folder) => (
                            <article key={folder.id} className="card stack" style={{ padding: 12 }}>
                                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <div className="stack" style={{ gap: 4 }}>
                                        <strong>{folder.folderPath}</strong>
                                        <div className="small">Storage: {folder.storageKey}</div>
                                        <div className="small">
                                            Last scanned:{' '}
                                            {folder.lastScannedAt ? new Date(folder.lastScannedAt).toLocaleString() : 'Never'}
                                        </div>
                                    </div>

                                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                        <button type="button" className="secondary" onClick={() => void toggleFolder(folder)}>
                                            {folder.enabled ? 'Disable' : 'Enable'}
                                        </button>
                                        <button type="button" className="danger" onClick={() => void deleteFolder(folder.id)}>
                                            Remove
                                        </button>
                                    </div>
                                </div>

                                <div className="small">
                                    Status: {folder.enabled ? 'Enabled' : 'Disabled'}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}