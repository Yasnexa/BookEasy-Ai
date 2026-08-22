import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Scissors,
  Clock,
  Settings,
  BarChart3,
  Bell,
  Store,
  Search,
  Sparkles,
  UserCircle,
  CreditCard,
  ShieldCheck,
  Building2,
  CalendarDays,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const navConfig: Record<UserRole, NavSection[]> = {
  customer: [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Find a business', href: '/dashboard/search', icon: Search },
        { label: 'My appointments', href: '/dashboard/appointments', icon: CalendarCheck },
        { label: 'AI Assistant', href: '/dashboard/assistant', icon: Sparkles },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Profile', href: '/dashboard/profile', icon: UserCircle },
        { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
      ],
    },
  ],
  business_owner: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarCheck },
        { label: 'Calendar', href: '/dashboard/availability', icon: CalendarDays },
        { label: 'Customers', href: '/dashboard/customers', icon: Users },
        { label: 'Services', href: '/dashboard/services', icon: Scissors },
        { label: 'Staff', href: '/dashboard/staff', icon: Users },
        { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
    {
      label: 'Business',
      items: [
        { label: 'Business Profile', href: '/dashboard/business', icon: Store },
      ],
    },
    {
      label: 'Settings',
      items: [
        { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
        { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ],
  staff: [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'My schedule', href: '/dashboard/schedule', icon: CalendarCheck },
        { label: 'Appointments', href: '/dashboard/appointments', icon: Users },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Availability', href: '/dashboard/availability', icon: Clock },
        { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
      ],
    },
  ],
  super_admin: [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Businesses', href: '/dashboard/businesses', icon: Building2 },
        { label: 'Users', href: '/dashboard/users', icon: Users },
      ],
    },
    {
      label: 'Platform',
      items: [
        { label: 'Subscriptions', href: '/dashboard/subscriptions', icon: CreditCard },
        { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
        { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ],
};

export const roleLabels: Record<UserRole, string> = {
  customer: 'Customer',
  business_owner: 'Business Owner',
  staff: 'Staff',
  super_admin: 'Super Admin',
};
