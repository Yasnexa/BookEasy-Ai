'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, MapPin, Star, ChevronRight, Store } from 'lucide-react';
import { PageHeader, PageContainer, EmptyState } from '@/components/dashboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchApprovedBusinesses, fetchServicesByBusiness } from '@/lib/api';
import type { Business, Service } from '@/lib/types';

const categories = ['All', 'Hair Salon', 'Barber', 'Beauty', 'Spa', 'Nails'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [serviceMap, setServiceMap] = useState<Record<string, Service[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const biz = await fetchApprovedBusinesses();
      setBusinesses(biz);

      const servicesByBiz: Record<string, Service[]> = {};
      await Promise.all(
        biz.map(async (b) => {
          servicesByBiz[b.id] = await fetchServicesByBusiness(b.id);
        })
      );
      setServiceMap(servicesByBiz);
      setLoading(false);
    })();
  }, []);

  const results = useMemo(() => {
    let result = businesses;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }
    if (category !== 'All') {
      result = result.filter((b) => b.category === category);
    }
    return result;
  }, [businesses, query, category]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Find a business" description="Browse salons, barbers, and beauty businesses near you." />

      <Card className="mb-6 border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, or service…"
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {results.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No businesses found"
          description={businesses.length === 0 ? "No businesses have been set up yet." : "Try a different search term or category."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((business) => {
            const services = serviceMap[business.id] || [];
            return (
              <Card key={business.id} className="border-border/60 overflow-hidden transition-shadow hover:shadow-md">
                <div className="h-32 bg-gradient-to-br from-primary/15 to-accent/40" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="-mt-12 flex h-16 w-16 items-center justify-center rounded-xl border-4 border-card bg-primary/10 text-2xl font-bold text-primary">
                      {business.name[0]}
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" /> {business.rating}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-semibold">{business.name}</h3>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {business.address}, {business.city}
                  </p>
                  {business.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{business.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {services.slice(0, 3).map((s) => (
                      <Badge key={s.id} variant="outline" className="text-xs">{s.name}</Badge>
                    ))}
                    {services.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{services.length - 3} more</Badge>
                    )}
                  </div>
                  <Button asChild className="mt-4 w-full" size="sm">
                    <Link href={`/${business.slug}`}>
                      View & book <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
