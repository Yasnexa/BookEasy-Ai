import type { Metadata } from 'next';
import { fetchBusinessBySlug } from '@/lib/api';
import { BusinessWebsite } from '@/components/public/business-website';

type BusinessRouteProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: BusinessRouteProps): Promise<Metadata> {
  const business = await fetchBusinessBySlug(params.slug);

  if (!business) {
    return { title: 'Business not found | BookEasy AI' };
  }

  const description =
    business.description ||
    `Book an appointment at ${business.name}, a ${business.category} business in ${business.city}.`;

  return {
    title: `${business.name} | Book an Appointment`,
    description,
    openGraph: {
      title: `${business.name} | Book an Appointment`,
      description,
      images: business.cover_url ? [{ url: business.cover_url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${business.name} | Book an Appointment`,
      description,
      images: business.cover_url ? [{ url: business.cover_url }] : undefined,
    },
  };
}

export default function PublicBusinessPage({ params }: BusinessRouteProps) {
  return <BusinessWebsite slug={params.slug} />;
}
