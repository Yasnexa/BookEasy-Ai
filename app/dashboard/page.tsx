'use client';

import { useAuth } from '@/lib/auth-context';
import { BusinessDashboard } from '@/components/dashboard/business-dashboard';
import { CustomerDashboard } from '@/components/dashboard/customer-dashboard';
import { StaffDashboard } from '@/components/dashboard/staff-dashboard';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case 'business_owner':
      return <BusinessDashboard />;
    case 'customer':
      return <CustomerDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'super_admin':
      return <AdminDashboard />;
    default:
      return <CustomerDashboard />;
  }
}
