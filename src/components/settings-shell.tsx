'use client';

import { useEffect, useState } from 'react';
import { HomePage } from '@/components/home-page';
import { IntegrationsPanel } from '@/components/integrations-panel';
import { FilesystemSyncPanel } from '@/components/filesystem-sync-panel';

type SettingsSection = 'home' | 'providers' | 'filesystem-sync';

type TagOption = {
    id: string;
    name: string;
};

export function SettingsShell() {
    const [activeSection, setActiveSection] = useState<SettingsSection>('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
        async function loadTags() {
            try {
                const response = await fetch('/api/tags');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error ?? 'Failed to load tags');
                }

                setAvailableTags(data.tags ?? []);
            } catch (error) {
                console.error(error);
            }
        }

        void loadTags();
    }, []);

    function toggleTag(tagName: string) {
        setSelectedTags((current) =>
            current.includes(tagName)
                ? current.filter((tag) => tag !== tagName)
                : [...current, tagName]
        );
        setActiveSection('home');
    }

    function clearTags() {
        setSelectedTags([]);
        setActiveSection('home');
    }

    return (
        <section
            style={{
                display: 'grid',
                gridTemplateColumns: isSidebarOpen ? '240px minmax(0, 1fr)' : '72px minmax(0, 1fr)',
                gap: 16,
                alignItems: 'start'
            }}
        >
            <aside
                className="card"
                style={{
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    position: 'sticky',
                    top: 16
                }}
            >
                <div
                    className="row"
                    style={{
                        justifyContent: isSidebarOpen ? 'space-between' : 'center',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'nowrap'
                    }}
                >
                    {isSidebarOpen ? <strong>Menu</strong> : null}

                    <button
                        type="button"
                        className="secondary"
                        onClick={() => setIsSidebarOpen((current) => !current)}
                        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {isSidebarOpen ? '←' : '→'}
                    </button>
                </div>

                <nav className="stack" style={{ gap: 8 }}>
                    <button
                        type="button"
                        className={activeSection === 'home' ? '' : 'secondary'}
                        onClick={() => setActiveSection('home')}
                        style={{
                            textAlign: 'left',
                            justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                            width: '100%'
                        }}
                        title="Home"
                    >
                        {isSidebarOpen ? 'Home' : 'H'}
                    </button>

                    <button
                        type="button"
                        className={activeSection === 'providers' ? '' : 'secondary'}
                        onClick={() => setActiveSection('providers')}
                        style={{
                            textAlign: 'left',
                            justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                            width: '100%'
                        }}
                        title="Providers"
                    >
                        {isSidebarOpen ? 'Providers' : 'P'}
                    </button>

                    <button
                        type="button"
                        className={activeSection === 'filesystem-sync' ? '' : 'secondary'}
                        onClick={() => setActiveSection('filesystem-sync')}
                        style={{
                            textAlign: 'left',
                            justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                            width: '100%'
                        }}
                        title="Filesystem sync"
                    >
                        {isSidebarOpen ? 'Filesystem sync' : 'F'}
                    </button>
                </nav>

                {isSidebarOpen && activeSection === 'home' ? (
                    <div className="stack" style={{ gap: 8 }}>
                        <strong>Tags</strong>

                        <button
                            type="button"
                            className={selectedTags.length === 0 ? '' : 'secondary'}
                            onClick={clearTags}
                            style={{
                                textAlign: 'left',
                                justifyContent: 'flex-start',
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: 14
                            }}
                        >
                            All tags
                        </button>

                        {availableTags.map((tag) => {
                            const selected = selectedTags.includes(tag.name);

                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    className={selected ? '' : 'secondary'}
                                    onClick={() => toggleTag(tag.name)}
                                    style={{
                                        textAlign: 'left',
                                        justifyContent: 'flex-start',
                                        width: '100%',
                                        padding: '8px 10px',
                                        fontSize: 14,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                    title={tag.name}
                                >
                                    {selected ? '✓ ' : ''}
                                    {tag.name}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </aside>

            <div style={{ minWidth: 0 }}>
                {activeSection === 'home' ? <HomePage selectedTags={selectedTags} /> : null}
                {activeSection === 'providers' ? <IntegrationsPanel /> : null}
                {activeSection === 'filesystem-sync' ? <FilesystemSyncPanel /> : null}
            </div>
        </section>
    );
}