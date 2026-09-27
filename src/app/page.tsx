import Link from 'next/link';
import { redirect } from 'next/navigation';
import { HomePage } from '@/components/home-page';
import { LogoutButton } from '@/components/logout-button';
import { getCurrentUser } from '@/lib/auth';

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <>
      <header className="container" style={{ paddingBottom: 0 }}>
        <nav className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="row" style={{ alignItems: 'center' }}>
            <strong>Photo Geo</strong>
            <span className="small">Signed in as {user.username}</span>
          </div>
          <div className="row" style={{ alignItems: 'center' }}>
            <Link href="/">Home</Link>
            <LogoutButton />
          </div>
        </nav>
      </header>
      <HomePage />
    </>
  );
}
