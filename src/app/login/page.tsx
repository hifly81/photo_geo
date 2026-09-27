import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { getCurrentUser } from '@/lib/auth';

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
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
