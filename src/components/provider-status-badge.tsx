type ProviderStatusBadgeProps = {
  connected: boolean;
};

export function ProviderStatusBadge({ connected }: ProviderStatusBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: connected ? '#dcfce7' : '#f3f4f6',
        color: connected ? '#166534' : '#4b5563'
      }}
    >
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}
