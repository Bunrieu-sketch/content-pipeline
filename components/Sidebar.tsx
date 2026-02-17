'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Handshake, BookOpen } from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sponsors-v2', label: 'Sponsors', icon: Handshake },
  { href: '/crm-guide', label: 'CRM Guide', icon: BookOpen },
];

export function Topbar() {
  const pathname = usePathname();
  return (
    <nav className="topbar">
      <h2>💰 Sponsor CRM</h2>
      <div className="topbar-links">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`topbar-link ${isActive ? 'active' : ''}`}>
              <Icon size={14} /> {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Keep old export name for compatibility
export const Sidebar = Topbar;
