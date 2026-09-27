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
        <h2 style={{ marginBottom: 4 }}>Integrazioni</h2>
        <p className="small">
          Collega i provider esterni e importa manualmente le foto nel tuo archivio Photo Geo.
        </p>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
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
