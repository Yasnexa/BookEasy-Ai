'use client';

import { useState, useMemo } from 'react';
import { Users, Search, Ban, Check } from 'lucide-react';
import { PageHeader, PageContainer, EmptyState } from '@/components/dashboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { roleLabels } from '@/lib/nav-config';
import type { UserRole } from '@/lib/types';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended';
  business?: string;
  joined: string;
}

const mockUsers: AdminUser[] = [
  { id: 'u1', full_name: 'Sarah Johnson', email: 'customer@bookeasy.ai', role: 'customer', status: 'active', joined: '2024-02-01' },
  { id: 'u2', full_name: 'Alex Morgan', email: 'owner@bookeasy.ai', role: 'business_owner', status: 'active', business: 'Luxe Hair Studio', joined: '2024-01-15' },
  { id: 'u3', full_name: 'Maria Rodriguez', email: 'staff@bookeasy.ai', role: 'staff', status: 'active', business: 'Luxe Hair Studio', joined: '2024-01-16' },
  { id: 'u4', full_name: 'Emily Davis', email: 'emily@example.com', role: 'customer', status: 'active', joined: '2024-02-15' },
  { id: 'u5', full_name: 'James Chen', email: 'james@luxehair.com', role: 'staff', status: 'active', business: 'Luxe Hair Studio', joined: '2024-01-16' },
  { id: 'u6', full_name: 'Tony Russo', email: 'tony@gentlemanbarber.com', role: 'staff', status: 'suspended', business: 'The Gentleman Barber', joined: '2024-02-21' },
  { id: 'u7', full_name: 'Aisha Patel', email: 'aisha@bloombeauty.com', role: 'staff', status: 'active', business: 'Bloom Beauty Lounge', joined: '2024-03-11' },
  { id: 'u8', full_name: 'Michael Brown', email: 'michael@example.com', role: 'customer', status: 'active', joined: '2024-03-01' },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [users, setUsers] = useState(mockUsers);

  const filtered = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [users, search, roleFilter]);

  const toggleStatus = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u)));
  };

  return (
    <PageContainer>
      <PageHeader title="Users" description="Manage all customers, business owners, and staff." />

      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search users…" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as 'all' | UserRole)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="business_owner">Business owners</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="super_admin">Super admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No users found" description="Try adjusting your filters." />
          ) : (
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {u.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="font-medium">{u.full_name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{roleLabels[u.role]}</Badge></TableCell>
                      <TableCell className="text-sm">{u.business || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.joined}</TableCell>
                      <TableCell>
                        <Badge variant={u.status === 'active' ? 'secondary' : 'outline'} className={u.status === 'active' ? 'text-success' : 'text-destructive'}>
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className={u.status === 'active' ? 'text-destructive' : 'text-success'} onClick={() => toggleStatus(u.id)}>
                          {u.status === 'active' ? <><Ban className="mr-1 h-3.5 w-3.5" /> Suspend</> : <><Check className="mr-1 h-3.5 w-3.5" /> Activate</>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((u) => (
              <div key={u.id} className="rounded-lg border border-border/60 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {u.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-medium">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Badge variant={u.status === 'active' ? 'secondary' : 'outline'} className={u.status === 'active' ? 'text-success' : 'text-destructive'}>
                    {u.status}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary">{roleLabels[u.role]}</Badge>
                  {u.business && <span className="text-xs text-muted-foreground">{u.business}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
