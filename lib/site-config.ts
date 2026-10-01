const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

// prismspace.app is the production origin already used by the app's public
// integrations. Deployments can override it explicitly with NEXT_PUBLIC_SITE_URL.
export const SITE_URL = new URL(
  configuredSiteUrl || 'https://prismspace.app',
).origin;

export const SITE_NAME = 'PrismSpace';
export const SITE_DESCRIPTION =
  'PrismSpace is an AI-powered developer workspace with browser tools, agent orchestration, and focused productivity utilities.';
