import { GooglePhotosPanel } from '@/components/google-photos-panel';
import { AmazonPhotosPanel } from '@/components/amazon-photos-panel';

export function IntegrationsPanel() {
  return (
    <section className="card stack">
      <div>
        <h2 style={{ marginBottom: 4 }}>Integrazioni</h2>
        <p className="small">
          Collega i provider esterni e importa manualmente le foto nel tuo archivio Photo Geo.
        </p>
      </div>

      <div className="stack">
        <GooglePhotosPanel />
        <AmazonPhotosPanel />
      </div>
    </section>
  );
}
