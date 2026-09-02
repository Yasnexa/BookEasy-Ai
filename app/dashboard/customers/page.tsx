'use client';

import { useMemo, useState } from 'react';
import { Search, UserCircle, Mail, Phone, Calendar } from 'lucide-react';
import { PageHeader, PageContainer, EmptyState } from '@/components/dashboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockCustomers, mockAppointments } from '@/lib/mock-data';
import { formatAppointmentDate } from '@/lib/format';

export default function CustomersPage() {
  const [search, setSearch] = useState('');

  const customers = useMemo(() => {
    let result = mockCustomers.filter((c) => c.business_id === 'b1');
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => b.total_visits - a.total_visits);
  }, [search]);

  return (
    <PageContainer>
      <PageHeader title="Customers" description="View customer records and booking history." />

      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {customers.length === 0 ? (
            <EmptyState
              icon={UserCircle}
              title="No customers found"
              description="Customers will appear here once they book an appointment."
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Total visits</TableHead>
                      <TableHead>Last visit</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {c.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </div>
                            <span className="font-medium">{c.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="flex items-center gap-1.5 text-sm"><Mail className="h-3 w-3" /> {c.email}</p>
                            {c.phone && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {c.phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{c.total_visits}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.last_visit ? formatAppointmentDate(c.last_visit) : '—'}
                        </TableCell>
                        <TableCell className="max-w-xs text-sm text-muted-foreground">
                          {c.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {customers.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {c.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                      <Badge variant="secondary" className="ml-auto">{c.total_visits} visits</Badge>
                    </div>
                    {c.notes && <p className="mt-2 text-sm text-muted-foreground">{c.notes}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
