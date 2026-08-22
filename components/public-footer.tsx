import Link from 'next/link';
import { Logo } from '@/components/logo';

const footerLinks = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'AI Assistant', href: '/#ai-assistant' },
    { label: 'Sign in', href: '/login' },
  ],
  Company: [
    { label: 'About', href: '/#' },
    { label: 'Careers', href: '/#' },
    { label: 'Blog', href: '/#' },
    { label: 'Contact', href: '/#' },
  ],
  Legal: [
    { label: 'Privacy', href: '/#' },
    { label: 'Terms', href: '/#' },
    { label: 'Security', href: '/#' },
  ],
};

export function PublicFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              AI-Powered Appointment Management, Made Easy. The modern booking platform for salons, barbers, and beauty businesses.
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold">{title}</h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border/60 pt-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} BookEasy AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
