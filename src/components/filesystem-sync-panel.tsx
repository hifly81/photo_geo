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

type DirectoryTreeResponse = {
    directories?: string[];
    error?: string;
    details?: string;
};

type DirectoryNode = {
    name: string;
    path: string;
    children: DirectoryNode[];
};

function buildDirectoryTree(paths: string[]): DirectoryNode {
    const root: DirectoryNode = {
        name: '/',
        path: '',
        children: []
    };

    for (const rawPath of paths) {
        const normalizedPath = rawPath.trim().replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
        if (!normalizedPath) {
            continue;
        }

        const parts = normalizedPath.split('/').filter(Boolean);
        let current = root;

        for (let index = 0; index < parts.length; index += 1) {
            const part = parts[index];
            const currentPath = parts.slice(0, index + 1).join('/');

            let child = current.children.find((node) => node.name === part);
            if (!child) {
                child = {
                    name: part,
                    path: currentPath,
                    children: []
                };
                current.children.push(child);
                current.children.sort((left, right) => left.name.localeCompare(right.name));
            }

            current = child;
        }
    }

    return root;
}

type DirectoryTreeItemProps = {
    node: DirectoryNode;
    depth: number;
    expandedPaths: Set<string>;
    onToggle: (path: string) => void;
    onSelect: (path: string) => void;
};

function DirectoryTreeItem(props: DirectoryTreeItemProps) {
    const { node, depth, expandedPaths, onToggle, onSelect } = props;
    const hasChildren = node.children.length > 0;
    const isExpanded = node.path === '' || expandedPaths.has(node.path);

    return (
        <div className="stack" style={{ gap: 4 }}>
            <div
                className="row"
                style={{
                    gap: 8,
                    alignItems: 'center',
                    paddingLeft: depth * 16
                }}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        className="secondary"
                        onClick={() => onToggle(node.path)}
                        style={{ minWidth: 32, padding: '2px 8px' }}
                    >
                        {isExpanded ? '−' : '+'}
                    </button>
                ) : (
                    <span style={{ display: 'inline-block', width: 32 }} />
                )}

                <button
                    type="button"
                    className="secondary"
                    style={{ textAlign: 'left', justifyContent: 'flex-start', flex: 1 }}
                    onClick={() => onSelect(node.path)}
                >
                    {node.name}
                </button>
            </div>

            {hasChildren && isExpanded && (
                <div className="stack" style={{ gap: 4 }}>
                    {node.children.map((child) => (
                        <DirectoryTreeItem
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            expandedPaths={expandedPaths}
                            onToggle={onToggle}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FilesystemSyncPanel() {
    const [folders, setFolders] = useState<SyncFolder[]>([]);
    const [storageKey, setStorageKey] = useState('main');
    const [folderPath, setFolderPath] = useState('');
    const [availableDirectories, setAvailableDirectories] = useState<string[]>([]);
    const [loadingDirectories, setLoadingDirectories] = useState(false);
    const [isDirectoryPickerOpen, setIsDirectoryPickerOpen] = useState(false);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
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
    const directoryTree = useMemo(() => buildDirectoryTree(availableDirectories), [availableDirectories]);

    async function loadAvailableDirectories() {
        const trimmedStorageKey = storageKey.trim();

        setError(null);
        setAvailableDirectories([]);
        setExpandedPaths(new Set());
        setIsDirectoryPickerOpen(true);

        if (!trimmedStorageKey) {
            setLoadingDirectories(false);
            setError('Storage key is required');
            return;
        }

        setLoadingDirectories(true);

        try {
            const response = await fetch(`/api/sync-folders/tree?storageKey=${encodeURIComponent(trimmedStorageKey)}`);
            const data = (await response.json()) as DirectoryTreeResponse;

            if (!response.ok) {
                throw new Error(data.details ?? data.error ?? 'Failed to load filesystem tree');
            }

            setAvailableDirectories(data.directories ?? []);
        } catch (treeError) {
            setError(treeError instanceof Error ? treeError.message : 'Failed to load filesystem tree');
        } finally {
            setLoadingDirectories(false);
        }
    }

    function toggleExpanded(path: string) {
        if (!path) return;

        setExpandedPaths((current) => {
            const next = new Set(current);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }

    async function addFolder(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setMessage(null);

        try {
            const selectedFolderPath = folderPath;

            const response = await fetch('/api/sync-folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storageKey,
                    folderPath: selectedFolderPath,
                    enabled: true
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details ?? data.error ?? 'Could not create sync folder');
            }

            setFolderPath('');
            setAvailableDirectories((current) =>
                current.filter((dir) => dir !== selectedFolderPath && !dir.startsWith(`${selectedFolderPath}/`))
            );
            setIsDirectoryPickerOpen(false);
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

            setMessage(parts.join(' · '));
            await loadFolders();
        } catch (syncError) {
            setError(syncError instanceof Error ? syncError.message : 'Filesystem sync failed');
        } finally {
            setSyncing(false);
        }
    }

    async function runFolderSync(folder: SyncFolder) {
        setSyncing(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch('/api/photos/fs-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folderId: folder.id
                })
            });

            const data = (await response.json()) as SyncSummary & { error?: string; details?: string };

            if (!response.ok) {
                throw new Error(data.details ?? data.error ?? 'Filesystem sync failed');
            }

            const parts = [
                `Folder synced: ${folder.folderPath || '/'}`,
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
            <div>
                <h2 style={{ marginBottom: 4 }}>Filesystem sync</h2>
                <p className="small">
                    Configure server-side folders to scan recursively and import photo references into the database.
                </p>
            </div>

            <div id="filesystem-sync-panel-content" className="stack">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span className="small">
                        {loading ? 'Loading…' : `${folders.length} folder(s), ${enabledCount} enabled`}
                    </span>
                    <button type="button" onClick={() => void runSync()} disabled={syncing || enabledCount === 0}>
                        {syncing ? 'Syncing…' : 'Run sync for all enabled folders'}
                    </button>
                </div>

                <div className="small">
                    The main sync scans every enabled folder. Use “Sync this folder” below to scan only one folder.
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
                            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                <input
                                    value={folderPath || '/'}
                                    readOnly
                                    placeholder="Click Browse to choose a folder"
                                    onClick={() => void loadAvailableDirectories()}
                                    style={{ flex: 1, minWidth: 220, cursor: 'pointer' }}
                                />
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => void loadAvailableDirectories()}
                                    disabled={loadingDirectories}
                                >
                                    {loadingDirectories ? 'Loading…' : 'Browse'}
                                </button>
                            </div>
                        </label>

                        <button type="submit" disabled={saving || !storageKey.trim()}>
                            {saving ? 'Saving…' : 'Add folder'}
                        </button>
                    </div>

                    <div className="small">
                        Use a path relative to the configured storage root. Subfolders are scanned recursively.
                    </div>

                    {isDirectoryPickerOpen && (
                        <div className="card stack" style={{ padding: 12, maxHeight: 320, overflow: 'auto' }}>
                            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                <strong>Select a folder</strong>
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setIsDirectoryPickerOpen(false)}
                                >
                                    Close
                                </button>
                            </div>

                            {loadingDirectories ? (
                                <div className="small">Loading folders…</div>
                            ) : availableDirectories.length === 0 ? (
                                <div className="small">No folders available to add.</div>
                            ) : (
                                <div className="stack" style={{ gap: 4 }}>
                                    <button
                                        type="button"
                                        className="secondary"
                                        style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                                        onClick={() => {
                                            setFolderPath('');
                                            setIsDirectoryPickerOpen(false);
                                        }}
                                    >
                                        /
                                    </button>

                                    {directoryTree.children.map((child) => (
                                        <DirectoryTreeItem
                                            key={child.path}
                                            node={child}
                                            depth={0}
                                            expandedPaths={expandedPaths}
                                            onToggle={toggleExpanded}
                                            onSelect={(path) => {
                                                setFolderPath(path);
                                                setIsDirectoryPickerOpen(false);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </form>

                <div className="stack">
                    <strong>Configured folders</strong>

                    {folders.length === 0 && !loading ? (
                        <div className="small">No sync folders configured yet.</div>
                    ) : (
                        <div className="stack">
                            {folders.map((folder) => (
                                <article key={folder.id} className="card stack" style={{ padding: 12 }}>
                                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        <div className="stack" style={{ gap: 4 }}>
                                            <strong>{folder.folderPath || '/'}</strong>
                                            <div className="small">Storage: {folder.storageKey}</div>
                                            <div className="small">
                                                Last scanned:{' '}
                                                {folder.lastScannedAt ? new Date(folder.lastScannedAt).toLocaleString() : 'Never'}
                                            </div>
                                        </div>

                                        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                onClick={() => void runFolderSync(folder)}
                                                disabled={syncing || !folder.enabled}
                                            >
                                                Sync this folder
                                            </button>
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
            </div>
        </section>
    );
}