import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';

const sessionCookieName = 'photo_geo_session';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(sessionCookieName)?.value;

  if (userId) {
    redirect('/');
  }

  return (
    <main className="container stack" style={{ maxWidth: 480 }}>
      <div>
        <h1>Sign in to Photo Geo</h1>
        <p>Use a simple username for this MVP environment.</p>
      </div>
      <section className="card stack">
        <LoginForm />
      </section>
    </main>
  );
}
