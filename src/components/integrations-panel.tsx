'use client';

import { useState } from 'react';
import { GooglePhotosPanel } from '@/components/google-photos-panel';
import { AmazonPhotosPanel } from '@/components/amazon-photos-panel';

type IntegrationTab = 'google' | 'amazon';

export function IntegrationsPanel() {
  const [tab, setTab] = useState<IntegrationTab>('google');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Providers</h2>
          <p className="small">
            Synch your external media provider.
          </p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-controls="integrations-panel-content"
        >
          {isOpen ? 'Close' : 'Open'}
        </button>
      </div>

      {isOpen && (
        <>
          <div id="integrations-panel-content" className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={tab === 'google' ? '' : 'secondary'}
              onClick={() => setTab('google')}
            >
              Google Photos
            </button>
            <button
              type="button"
              className={tab === 'amazon' ? '' : 'secondary'}
              onClick={() => setTab('amazon')}
            >
              Amazon Photos
            </button>
          </div>

          {tab === 'google' ? <GooglePhotosPanel /> : <AmazonPhotosPanel />}
        </>
      )}
    </section>
  );
}
