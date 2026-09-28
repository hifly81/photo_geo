import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPhotoForUser, mapPhotoForClient } from '@/lib/photos';
import { getCurrentUser } from '@/lib/auth';

export default async function PhotoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const photo = await getPhotoForUser(id, user.id);

  if (!photo) {
    notFound();
  }

  const clientPhoto = mapPhotoForClient(photo);

  return (
    <main className="container stack">
      <nav className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/">← Back to home</Link>
        <strong>{clientPhoto.originalFilename}</strong>
      </nav>

      <section className="card stack">
        <img src={clientPhoto.imageUrl} alt={clientPhoto.originalFilename} style={{ width: '100%', maxHeight: 520, objectFit: 'contain', borderRadius: 12, background: '#f3f4f6' }} />
        <div className="stack">
          <div><strong>Caption:</strong> {clientPhoto.caption || '—'}</div>
          <div><strong>Source:</strong> {clientPhoto.source}</div>
          <div><strong>Storage key:</strong> {clientPhoto.storageKey}</div>
          <div><strong>File path:</strong> {clientPhoto.filePath}</div>
          <div><strong>Taken at:</strong> {clientPhoto.takenAt ? new Date(clientPhoto.takenAt).toLocaleString() : '—'}</div>
          <div><strong>Country:</strong> {clientPhoto.country || '—'}</div>
          <div><strong>City:</strong> {clientPhoto.city || '—'}</div>
          <div><strong>Latitude:</strong> {clientPhoto.latitude ?? '—'}</div>
          <div><strong>Longitude:</strong> {clientPhoto.longitude ?? '—'}</div>
          <div>
            <strong>Tags:</strong>{' '}
            {clientPhoto.tags.length ? clientPhoto.tags.map(({ tag }) => tag.name).join(', ') : '—'}
          </div>
        </div>
      </section>
    </main>
  );
}
