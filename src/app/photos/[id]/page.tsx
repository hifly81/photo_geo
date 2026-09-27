import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPhotoForUser } from '@/lib/photos';
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

  return (
    <main className="container stack">
      <nav className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/">← Back to home</Link>
        <strong>{photo.originalFilename}</strong>
      </nav>

      <section className="card stack">
        <img src={photo.storagePath} alt={photo.originalFilename} style={{ width: '100%', maxHeight: 520, objectFit: 'contain', borderRadius: 12, background: '#f3f4f6' }} />
        <div className="stack">
          <div><strong>Caption:</strong> {photo.caption || '—'}</div>
          <div><strong>Source:</strong> {photo.source}</div>
          <div><strong>Taken at:</strong> {photo.takenAt ? new Date(photo.takenAt).toLocaleString() : '—'}</div>
          <div><strong>Country:</strong> {photo.country || '—'}</div>
          <div><strong>City:</strong> {photo.city || '—'}</div>
          <div><strong>Latitude:</strong> {photo.latitude ?? '—'}</div>
          <div><strong>Longitude:</strong> {photo.longitude ?? '—'}</div>
          <div>
            <strong>Tags:</strong>{' '}
            {photo.tags.length ? photo.tags.map(({ tag }) => tag.name).join(', ') : '—'}
          </div>
        </div>
      </section>
    </main>
  );
}
