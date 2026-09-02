'use client';

import { useState, useMemo } from 'react';
import { Building2, Search, Check, Ban, Clock, Eye } from 'lucide-react';
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
import { mockBusinesses } from '@/lib/mock-data';
import type { BusinessStatus } from '@/lib/types';

const statusConfig: Record<BusinessStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning' },
  approved: { label: 'Approved', className: 'bg-success/10 text-success' },
  suspended: { label: 'Suspended', className: 'bg-destructive/10 text-destructive' },
  deactivated: { label: 'Deactivated', className: 'bg-muted text-muted-foreground' },
};

export default function BusinessesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BusinessStatus>('all');
  const [businesses, setBusinesses] = useState(mockBusinesses);

  const filtered = useMemo(() => {
    let result = businesses;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }
    return result;
  }, [businesses, search, statusFilter]);

  const updateStatus = (id: string, status: BusinessStatus) => {
    setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  };

  return (
    <PageContainer>
      <PageHeader title="Businesses" description="Manage all businesses on the platform." />

      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search businesses…" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | BusinessStatus)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Building2} title="No businesses found" description="Try adjusting your filters." />
          ) : (
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{b.category}</TableCell>
                      <TableCell>{b.city}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{b.subscription_plan}</Badge></TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[b.status].className}`}>
                          {statusConfig[b.status].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {b.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, 'approved')}>
                              <Check className="mr-1 h-3.5 w-3.5" /> Approve
                            </Button>
                          )}
                          {b.status === 'approved' && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus(b.id, 'suspended')}>
                              <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                            </Button>
                          )}
                          {b.status === 'suspended' && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, 'approved')}>
                              <Check className="mr-1 h-3.5 w-3.5" /> Reactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((b) => (
              <div key={b.id} className="rounded-lg border border-border/60 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.category} · {b.city}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[b.status].className}`}>
                    {statusConfig[b.status].label}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  {b.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, 'approved')}>Approve</Button>
                  )}
                  {b.status === 'approved' && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus(b.id, 'suspended')}>Suspend</Button>
                  )}
                  {b.status === 'suspended' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, 'approved')}>Reactivate</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
