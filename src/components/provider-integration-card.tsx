import { ReactNode } from 'react';
import { ProviderStatusBadge } from '@/components/provider-status-badge';

type ProviderIntegrationCardProps<TItem> = {
  title: string;
  description: string;
  connected: boolean;
  loading: boolean;
  message: string | null;
  items: TItem[];
  selectedIds: string[];
  importing: boolean;
  connectHref: string;
  emptyText: string;
  onRefresh: () => void;
  onDisconnect: () => void;
  onImportSelected: () => void;
  onToggleSelection: (id: string) => void;
  renderItem: (item: TItem, selected: boolean) => ReactNode;
  getItemId: (item: TItem) => string;
};

export function ProviderIntegrationCard<TItem>({
  title,
  description,
  connected,
  loading,
  message,
  items,
  selectedIds,
  importing,
  connectHref,
  emptyText,
  onRefresh,
  onDisconnect,
  onImportSelected,
  renderItem,
  getItemId
}: ProviderIntegrationCardProps<TItem>) {
  if (loading) {
    return (
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{title}</strong>
          <ProviderStatusBadge connected={connected} />
        </div>
        <p className="small">Loading…</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className="stack" style={{ gap: 4 }}>
          <div className="row" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <ProviderStatusBadge connected={connected} />
          </div>
          <p className="small">{description}</p>
        </div>
        <div className="row">
          {!connected ? (
            <a className="button" href={connectHref}>Connect</a>
          ) : (
            <>
              <button type="button" className="secondary" onClick={onRefresh}>Refresh</button>
              <button type="button" className="secondary" onClick={onDisconnect}>Disconnect</button>
            </>
          )}
        </div>
      </div>

      {message && <div className="card error-banner">{message}</div>}

      {connected ? (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>{items.length} item(s) available</strong>
            <button type="button" onClick={onImportSelected} disabled={importing || selectedIds.length === 0}>
              {importing ? 'Importing…' : `Import selected (${selectedIds.length})`}
            </button>
          </div>
          <div className="photo-grid">
            {items.map((item) => renderItem(item, selectedIds.includes(getItemId(item))))}
          </div>
        </>
      ) : (
        <p className="small">{emptyText}</p>
      )}
    </div>
  );
}
