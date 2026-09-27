import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Photo Geo',
  description: 'Upload, map, and search your photos by place and time.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
