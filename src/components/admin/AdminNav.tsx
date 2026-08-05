'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/admin',
      label: 'Dashboard',
      match: (path: string) => path === '/admin' || path.startsWith('/admin?'),
    },
    {
      href: '/admin/movies',
      label: 'Movies',
      match: (path: string) => path.startsWith('/admin/movies'),
    },
    {
      href: '/admin/add-movies',
      label: 'Add Movies',
      match: (path: string) => path.startsWith('/admin/add-movies'),
    },
    {
      href: '/admin/editorial',
      label: 'Editorial',
      match: (path: string) => path.startsWith('/admin/editorial'),
    },
  ];

  return (
    <nav className="border-b border-border/70 bg-secondary/40">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
        <span className="mr-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD700]/80">
          Admin
        </span>
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
