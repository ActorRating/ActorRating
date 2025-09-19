'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/admin/movies',
      label: 'Movies',
      description: 'View and manage all movies'
    },
    {
      href: '/admin/add-movies',
      label: 'Add Movies',
      description: 'Bulk add movies from TMDb'
    }
  ];

  return (
    <nav className="bg-secondary border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-xs opacity-75">{item.description}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 