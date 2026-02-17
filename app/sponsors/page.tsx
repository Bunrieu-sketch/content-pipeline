'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SponsorsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/sponsors-v2'); }, [router]);
  return (
    <div style={{ padding: 40, color: 'var(--text-muted)' }}>
      <p>Sponsors V1 has been deprecated. Redirecting to Sponsors V2...</p>
    </div>
  );
}
