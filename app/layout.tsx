import type { Metadata } from 'next';
import './globals.css';
import { Topbar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Sponsor CRM',
  description: 'Content pipeline and sponsor management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="layout-vertical">
          <Topbar />
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
