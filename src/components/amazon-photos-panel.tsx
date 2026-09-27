'use client';

import { useEffect, useState } from 'react';
import { ProviderIntegrationCard } from '@/components/provider-integration-card';

type AmazonMediaItem = {
  id: string;
  filename?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  description?: string;
};

export function AmazonPhotosPanel() {
  const [items, setItems] = useState<AmazonMediaItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function loadMedia() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/providers/amazon/media');
      const data = await response.json();
      setConnected(Boolean(data.connected));
      setItems(data.items ?? []);
      if (data.error) {
        setMessage(data.error);
      }
    } catch {
      setMessage('Failed to load Amazon Photos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMedia();
  }, []);

  function toggleSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function importSelected() {
    const selectedItems = items.filter((item) => selectedIds.includes(item.id));
    if (!selectedItems.length) return;

    setImporting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/providers/amazon/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Import failed');
      }

      setMessage(`Imported ${data.imported?.length ?? 0} items, duplicates ${data.duplicates?.length ?? 0}`);
      setSelectedIds([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function disconnect() {
    await fetch('/api/providers/amazon/disconnect', { method: 'POST' });
    setConnected(false);
    setItems([]);
    setSelectedIds([]);
  }

  return (
    <ProviderIntegrationCard
      title="Amazon Photos"
      description="Connect your Amazon account and manually import selected items."
      connected={connected}
      loading={loading}
      message={message}
      items={items}
      selectedIds={selectedIds}
      importing={importing}
      connectHref="/api/providers/amazon/connect"
      emptyText="Amazon Photos is not connected yet."
      onRefresh={loadMedia}
      onDisconnect={disconnect}
      onImportSelected={importSelected}
      onToggleSelection={toggleSelection}
      getItemId={(item) => item.id}
      renderItem={(item, selected) => (
        <label key={item.id} className="card stack" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggleSelection(item.id)}
          />
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.filename ?? item.id}
              style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12, background: '#f3f4f6' }}
            />
          ) : null}
          <div className="small">{item.filename ?? item.id}</div>
        </label>
      )}
    />
  );
}
