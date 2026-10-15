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

function IconConnect() {
  return (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
  );
}

function IconRefresh() {
  return (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
  );
}

function IconDisconnect() {
  return (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        <path d="M9 18 15 12 9 6" />
        <path d="M15 12H3" />
        <path d="M21 5v14" />
      </svg>
  );
}

const roundActionButtonStyle = {
  width: 38,
  height: 38,
  borderRadius: '999px',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center'
} as const;

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

          <div className="row" style={{ gap: 8 }}>
            {!connected ? (
                <a
                    className="button"
                    href={connectHref}
                    style={roundActionButtonStyle}
                    aria-label={`Connect ${title}`}
                    title={`Connect ${title}`}
                >
                  <IconConnect />
                </a>
            ) : (
                <>
                  <button
                      type="button"
                      className="secondary"
                      onClick={onRefresh}
                      style={roundActionButtonStyle}
                      aria-label={`Refresh ${title}`}
                      title={`Refresh ${title}`}
                  >
                    <IconRefresh />
                  </button>
                  <button
                      type="button"
                      className="secondary"
                      onClick={onDisconnect}
                      style={roundActionButtonStyle}
                      aria-label={`Disconnect ${title}`}
                      title={`Disconnect ${title}`}
                  >
                    <IconDisconnect />
                  </button>
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