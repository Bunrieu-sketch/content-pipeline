'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Sidebar } from './Sidebar';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get('embedded') === '1';

  if (isEmbedded) {
    return (
      <div style={{ padding: '1rem' }}>{children}</div>
    );
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="content">{children}</main>
    </div>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="layout"><main className="content">{children}</main></div>}>
      <LayoutInner>{children}</LayoutInner>
    </Suspense>
  );
}
