import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { SettingsShell } from '@/components/settings-shell';
import { getCurrentUser } from '@/lib/auth';

function IconHome() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block' }}
        >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9 21v-6h6v6" />
        </svg>
    );
}

const headerIconButtonStyle = {
    width: 38,
    height: 38,
    borderRadius: '999px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    textDecoration: 'none',
    background: '#f8fafc',
    border: '1px solid #d0d5dd',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    color: 'inherit'
} as const;

export default async function Page() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <>
            <header className="container" style={{ paddingBottom: 12 }}>
                <nav
                    className="row"
                    style={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 0 0'
                    }}
                >
                    <div
                        className="card"
                        style={{
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            borderRadius: 14,
                            background: '#f8fafc',
                            border: '1px solid #d0d5dd',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
                        }}
                    >
                        <strong
                            style={{
                                fontSize: 16,
                                lineHeight: 1.2,
                                color: '#0f172a'
                            }}
                        >
                            Photo Geo
                        </strong>
                        <span
                            className="small"
                            style={{
                                color: '#475467',
                                whiteSpace: 'nowrap'
                            }}
                        >
              Signed in as <strong style={{ color: '#0f172a' }}>{user.username}</strong>
            </span>
                    </div>

                    <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                        <Link
                            href="/"
                            aria-label="Home"
                            title="Home"
                            style={headerIconButtonStyle}
                        >
                            <IconHome />
                        </Link>
                        <LogoutButton />
                    </div>
                </nav>
            </header>

            <main className="container">
                <SettingsShell />
            </main>
        </>
    );
}