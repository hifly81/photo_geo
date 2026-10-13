'use client';

import { useRouter } from 'next/navigation';

function IconLogout() {
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
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
  );
}

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
      <button
          type="button"
          className="secondary"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
          style={{
            width: 38,
            height: 38,
            borderRadius: '999px',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
      >
        <IconLogout />
      </button>
  );
}