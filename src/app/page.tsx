import Link from 'next/link';
import { HomePage } from '@/components/home-page';

export default function Page() {
  return (
    <>
      <header className="container" style={{ paddingBottom: 0 }}>
        <nav className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Photo Geo</strong>
          <Link href="/">Home</Link>
        </nav>
      </header>
      <HomePage />
    </>
  );
}
