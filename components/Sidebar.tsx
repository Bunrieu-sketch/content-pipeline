'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Video, Handshake, BookOpen } from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/videos', label: 'Videos', icon: Video },
  { href: '/sponsors', label: 'Sponsors', icon: Handshake },
  { href: '/crm-guide', label: 'CRM Guide', icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="sidebar">
      <h2>📹 Sponsor CRM</h2>
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={isActive ? 'active' : ''}>
            <Icon size={16} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
