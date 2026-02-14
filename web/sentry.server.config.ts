import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.3,
  enabled: !!process.env.SENTRY_DSN,
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
