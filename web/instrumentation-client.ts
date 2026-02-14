import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.3,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  beforeSend(event) {
    if (event.request?.data) {
      event.request.data = '[Filtered]';
    }
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(b => {
        if (b.data?.body) b.data.body = '[Filtered]';
        if (b.data?.response) b.data.response = '[Filtered]';
        return b;
      });
    }
    return event;
  },
  denyUrls: [/scan-receipt/],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
