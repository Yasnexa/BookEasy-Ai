'use client';

import { ReactNode, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Moon, Sun, LogOut, Menu, X, ChevronDown, Bell, ExternalLink, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { useBusiness } from '@/lib/business-context';
import { useTheme } from '@/lib/theme-context';
import { navConfig, roleLabels } from '@/lib/nav-config';
import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const pageTitleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/appointments': 'Appointments',
  '/dashboard/availability': 'Calendar',
  '/dashboard/customers': 'Customers',
  '/dashboard/services': 'Services',
  '/dashboard/staff': 'Staff',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/business': 'Business Profile',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/settings': 'Settings',
  '/dashboard/profile': 'Profile',
  '/dashboard/search': 'Find a Business',
  '/dashboard/assistant': 'AI Assistant',
  '/dashboard/schedule': 'My Schedule',
  '/dashboard/businesses': 'Businesses',
  '/dashboard/users': 'Users',
  '/dashboard/subscriptions': 'Subscriptions',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { business } = useBusiness();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user) return null;

  const sections = navConfig[user.role] || [];
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isOwner = user.role === 'business_owner';
  const hasBusiness = isOwner && business;
  const pageTitle = pageTitleMap[pathname] || 'Dashboard';

  const brandStyle = useMemo<CSSProperties>(() => {
    if (!hasBusiness) return {};
    return {
      '--owner-primary': business!.primary_color,
      '--owner-accent': business!.accent_color,
    } as CSSProperties;
  }, [hasBusiness, business]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const websiteHref =
    process.env.NODE_ENV === 'development' && business
      ? `/${business.slug}`
      : business
        ? `https://${business.slug}.bookeasy.ai`
        : '#';

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  const mainPadding = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64';

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn('flex h-16 items-center border-b border-border/60', sidebarCollapsed ? 'justify-center px-2' : 'px-5')}>
        {hasBusiness && !sidebarCollapsed ? (
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 min-w-0">
            {business!.logo_url ? (
              <img
                src={business!.logo_url}
                alt={`${business!.name} logo`}
                className="h-9 w-9 rounded-lg object-cover shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 text-sm font-bold"
                style={{ backgroundColor: `${business!.primary_color}15`, color: business!.primary_color }}
              >
                {business!.name[0]?.toUpperCase()}
              </div>
            )}
            <span className="truncate text-sm font-bold" style={{ color: business!.primary_color }}>
              {business!.name}
            </span>
          </Link>
        ) : hasBusiness && sidebarCollapsed ? (
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center justify-center">
            {business!.logo_url ? (
              <img
                src={business!.logo_url}
                alt={`${business!.name} logo`}
                className="h-9 w-9 rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
                style={{ backgroundColor: `${business!.primary_color}15`, color: business!.primary_color }}
              >
                {business!.name[0]?.toUpperCase()}
              </div>
            )}
          </Link>
        ) : (
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className={cn(sidebarCollapsed && 'flex justify-center')}>
            <Logo />
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6 scrollbar-thin">
        {sections.map((section, i) => (
          <div key={i}>
            {section.label && !sidebarCollapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center rounded-lg text-sm font-medium transition-colors',
                      sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                      active
                        ? hasBusiness
                          ? 'text-white'
                          : 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                    style={active && hasBusiness ? { backgroundColor: business!.primary_color } : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/60 p-3">
        {hasBusiness && !sidebarCollapsed && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 flex items-center justify-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View public website
          </a>
        )}
        <div className={cn('flex items-center gap-3', sidebarCollapsed && 'flex-col gap-1')}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback
              className="text-xs font-semibold"
              style={
                hasBusiness
                  ? { backgroundColor: `${business!.primary_color}15`, color: business!.primary_color }
                  : { backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }
              }
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabels[user.role]}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20" style={brandStyle}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-border/60 bg-card transition-all duration-200 lg:block',
          sidebarWidth
        )}
      >
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border/60 bg-card lg:hidden animate-in slide-in-from-left duration-200">
            {SidebarContent}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className={cn('transition-all duration-200', mainPadding)}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{pageTitle}</h2>
              {hasBusiness && (
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  · <span className="font-medium" style={{ color: business!.primary_color }}>{business!.name}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative" size="icon">
                    <Bell className="h-5 w-5" />
                    <span
                      className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                      style={
                        hasBusiness
                          ? { backgroundColor: business!.accent_color }
                          : { backgroundColor: 'hsl(var(--primary))' }
                      }
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <div>
                      <p className="text-sm font-medium">New booking request</p>
                      <p className="text-xs text-muted-foreground">Michael Brown requested a Blowout & Style</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div>
                      <p className="text-sm font-medium">Upcoming appointment</p>
                      <p className="text-xs text-muted-foreground">Sarah Johnson&apos;s coloring in 2 days</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className="text-xs font-semibold"
                      style={
                        hasBusiness
                          ? { backgroundColor: `${business!.primary_color}15`, color: business!.primary_color }
                          : { backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }
                      }
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:block">{user.full_name.split(' ')[0]}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">Settings</Link>
                </DropdownMenuItem>
                {hasBusiness && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" /> View public website
                      </a>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
