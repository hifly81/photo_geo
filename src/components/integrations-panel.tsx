'use client';

import { useState } from 'react';
import { GooglePhotosPanel } from '@/components/google-photos-panel';
import { AmazonPhotosPanel } from '@/components/amazon-photos-panel';

type IntegrationTab = 'google' | 'amazon';

function IconGooglePhotos() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" style={{ display: 'block' }}>
            <path d="M12 3a4.5 4.5 0 0 1 4.5 4.5V12H12a4.5 4.5 0 0 1 0-9Z" fill="#ea4335" />
            <path d="M21 12a4.5 4.5 0 0 1-4.5 4.5H12V12a4.5 4.5 0 0 1 9 0Z" fill="#34a853" />
            <path d="M12 21a4.5 4.5 0 0 1-4.5-4.5V12H12a4.5 4.5 0 0 1 0 9Z" fill="#4285f4" />
            <path d="M3 12a4.5 4.5 0 0 1 4.5-4.5H12V12H7.5A4.5 4.5 0 0 1 3 12Z" fill="#fbbc05" />
        </svg>
    );
}

function IconAmazonPhotos() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
            <path d="M6 19h12" />
            <path d="M7 19 12 5l5 14" />
            <path d="M8.5 14h7" />
        </svg>
    );
}

const iconTabButtonStyle = {
    width: 42,
    height: 42,
    borderRadius: '999px',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
} as const;

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
                    style={iconTabButtonStyle}
                    aria-label="Google Photos"
                    title="Google Photos"
                >
                    <IconGooglePhotos />
                </button>

                <button
                    type="button"
                    className={tab === 'amazon' ? '' : 'secondary'}
                    onClick={() => setTab('amazon')}
                    style={iconTabButtonStyle}
                    aria-label="Amazon Photos"
                    title="Amazon Photos"
                >
                    <IconAmazonPhotos />
                </button>
            </div>

            {tab === 'google' ? <GooglePhotosPanel /> : <AmazonPhotosPanel />}
        </section>
    );
}