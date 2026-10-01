import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site-config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#090c12',
    theme_color: '#090c12',
    icons: [{ src: '/Logo/new_logo.png', sizes: 'any', type: 'image/png' }],
  };
}
