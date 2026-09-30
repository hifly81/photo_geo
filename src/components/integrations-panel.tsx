'use client';

import { useState } from 'react';
import { GooglePhotosPanel } from '@/components/google-photos-panel';
import { AmazonPhotosPanel } from '@/components/amazon-photos-panel';

type IntegrationTab = 'google' | 'amazon';

export function IntegrationsPanel() {
  const [tab, setTab] = useState<IntegrationTab>('google');

  return (
      <section className="card stack">
        <div>
          <h2 style={{ marginBottom: 4 }}>Providers</h2>
          <p className="small">
            Synch your external media provider.
          </p>
        </div>

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
      </section>
  );
}