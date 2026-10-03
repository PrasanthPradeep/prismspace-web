import { NextRequest, NextResponse } from 'next/server';

/**
 * Attach a safe correlation id to every request and emit one structured access
 * event for API/health traffic. Query strings are deliberately excluded so
 * credentials and user input do not end up in logs.
 */
export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set('x-request-id', requestId);

  if (request.nextUrl.pathname.startsWith('/api/') || request.nextUrl.pathname === '/health') {
    console.info(JSON.stringify({
      event: 'http_request_received',
      request_id: requestId,
      method: request.method,
      path: request.nextUrl.pathname,
    }));
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/health'],
};
