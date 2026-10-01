# Deployment Guide

## Quick Deploy to Vercel (Recommended)

Vercel is made by the creators of Next.js and offers the best experience.

### Method 1: Deploy with Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Method 2: Deploy via GitHub

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Import on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Click "Deploy"

That's it! Vercel will automatically detect Next.js and configure everything.

## Deploy to Netlify

1. **Build Command:** `npm run build`
2. **Publish Directory:** `.next`
3. **Deploy:**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

Or connect your GitHub repo on [netlify.com](https://netlify.com)

## Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Railway auto-detects Next.js
5. Click "Deploy"

## Deploy to AWS Amplify

1. Go to AWS Amplify Console
2. Click "New App" > "Host web app"
3. Connect your GitHub repository
4. Build settings (auto-detected):
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
5. Click "Save and deploy"

## Deploy to DigitalOcean App Platform

1. Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. DigitalOcean auto-detects Next.js
5. Configure:
   - **Build Command:** `npm run build`
   - **Run Command:** `npm start`
6. Click "Create Resources"

## Deploy to Your Own Server

### Using PM2

```bash
# Build the application
npm run build

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "prism-browser" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t prism-browser .
docker run -p 3000:3000 prism-browser
```

### Using Nginx as Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Variables

If you need environment variables:

1. Create `.env.local` (not committed to git):
   ```env
   NEXT_PUBLIC_API_URL=your-api-url
   NEXT_PUBLIC_SITE_URL=https://prismspace.app
   ```

   `NEXT_PUBLIC_SITE_URL` must be the canonical HTTPS origin without a path. It is used to
   generate canonical metadata, Open Graph URLs, `robots.txt`, and `sitemap.xml`.

2. Add to your deployment platform:
   - **Vercel:** Project Settings > Environment Variables
   - **Netlify:** Site Settings > Environment Variables
   - **Railway:** Variables tab
   - **AWS/DigitalOcean:** Environment section in console

Before the first production deploy, verify that `NEXT_PUBLIC_SITE_URL` is set to
`https://prismspace.app` (or the approved canonical domain) for the production environment.

## Custom Domain

### Vercel
1. Go to Project Settings > Domains
2. Add your domain
3. Update DNS records as instructed

### Netlify
1. Go to Domain Settings
2. Add custom domain
3. Update DNS records

### Others
Similar process - check platform documentation

## SSL/HTTPS

All major platforms (Vercel, Netlify, Railway, etc.) provide free SSL certificates automatically.

For self-hosting, use [Let's Encrypt](https://letsencrypt.org/):
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com
```

## Performance Tips

1. **Enable caching** in your hosting platform
2. **Use CDN** for static assets (automatic on Vercel/Netlify)
3. **Optimize images** - Next.js does this automatically
4. **Enable compression** - automatic on most platforms

## Monitoring

### Vercel Analytics
```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## Troubleshooting

### Build fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Port already in use
```bash
# Change port
PORT=3001 npm start
```

### Memory issues
Increase Node.js memory:
```bash
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

## Cost Estimates

- **Vercel:** Free for hobby projects, $20/month for Pro
- **Netlify:** Free for personal projects, $19/month for Pro
- **Railway:** ~$5/month for basic usage
- **DigitalOcean:** ~$5/month for basic droplet
- **AWS Amplify:** Pay as you go, typically $1-10/month for small apps

## Recommended: Vercel

For this project, **Vercel** is recommended because:
- ✅ Made by Next.js creators
- ✅ Zero configuration
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Free for personal projects
- ✅ Excellent performance

Happy deploying! 🚀
