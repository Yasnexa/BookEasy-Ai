import { NextRequest, NextResponse } from 'next/server';

const ROOT_HOSTS = new Set(['bookeasy.ai', 'www.bookeasy.ai', 'localhost', '127.0.0.1']);

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const baseHost = hostname.endsWith('.bookeasy.ai') ? 'bookeasy.ai' : null;

  if (!baseHost || ROOT_HOSTS.has(hostname)) {
    return NextResponse.next();
  }

  const slug = hostname.slice(0, -`.${baseHost}`.length);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug === 'www') {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname;
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/${slug}${pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
