'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  FileText,
  PlusCircle,
  Search,
  LayoutTemplate,
  Building2,
  Settings,
  LogOut,
  Newspaper,
  ShoppingBag,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  {
    label: 'Blogs',
    items: [
      { href: '/blogs', label: 'My Blogs', icon: FileText },
      { href: '/blogs/new', label: 'New Blog', icon: PlusCircle },
      { href: '/keywords', label: 'Keyword Research', icon: Search },
    ],
  },
  {
    label: 'Presell Pages',
    items: [
      { href: '/presell', label: 'My Pages', icon: ShoppingBag },
      { href: '/presell/new', label: 'New Page', icon: PlusCircle },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/templates', label: 'Templates', icon: LayoutTemplate },
      { href: '/brands', label: 'Brands', icon: Building2 },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity',
          collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
        onClick={() => setCollapsed(true)}
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200',
          collapsed ? 'w-0 lg:w-16 overflow-hidden' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          {!collapsed && (
            <Link href="/" className="font-semibold text-sidebar-foreground">
              Copywriting Hub
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground hidden lg:block"
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navItems.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider px-3 mb-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === '/settings'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 w-full"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setCollapsed(false)}
        className={cn(
          'fixed top-3 left-3 z-30 p-2 rounded-md bg-background border shadow-sm lg:hidden',
          !collapsed && 'hidden'
        )}
      >
        <PanelLeft className="h-4 w-4" />
      </button>
    </>
  );
}
