# Prism Dev Browser - Next.js Edition

An AI-powered developer dashboard and browser built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## ✨ Features Overview

- 🕐 **15+ Clock Styles** - Customizable clock with multiple fonts and colors
- 🎨 **Beautiful Themes** - Glass morphism design with 8+ wallpapers
- 🛠️ **23 Developer Tools** - JSON toolkit, regex workbench, crypto utils, and more
- 📝 **Productivity Suite** - Notepad, checklist, habit tracker, focus timer
- 🤖 **6 AI Tools** - Writing assistant, code explainer, language learning
- 🐝 **Hive Backend** - Local Python API powered by MCP (Model Context Protocol) for multi-agent orchestration
- 📊 **System Monitor** - Real-time browser and system information
- ⚙️ **11 Settings Sections** - Comprehensive customization options
- ⚡ **Modern Stack** - Next.js 15, React 19, TypeScript, Tailwind CSS, Python (FastAPI)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Python 3.10+ installed (for the Hive API Backend)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd prismspace-web

# Install frontend dependencies
npm install

# Run the Hive API Backend (in a PowerShell terminal)
.\backend\start.ps1

# Run the Next.js development server (in a separate terminal)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The Hive Backend runs on [http://localhost:8000](http://localhost:8000).

## 📖 Documentation

### Getting Started
- **[USAGE_GUIDE.md](USAGE_GUIDE.md)** - Complete user guide with all features explained
- **[FEATURES.md](FEATURES.md)** - Comprehensive feature list (50+ features)

### For Developers
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Technical architecture and customization guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to Vercel, Netlify, AWS, and more

### Project Overview
- **[COMPLETE_SUMMARY.md](COMPLETE_SUMMARY.md)** - Full project summary and status
- **[CHECKLIST.md](CHECKLIST.md)** - Feature completion checklist (100% complete)

## 🎯 Key Features

### Customizable Clock
- **Formats**: 12-hour or 24-hour display
- **Styles**: 15 different font styles from minimal to decorative
- **Colors**: Unlimited colors with history tracking
- **Persistent**: Settings saved in localStorage

### Developer Tools (23 Tools)

**Development**: Localhost, GitHub, JSON Toolkit, Crypto Utils, Regex Workbench, Markdown Editor, Git Reference, Time & Date, Color Generator

**AI-Powered**: Prompt Synthesizer, Writing Assistant, Language Learning, Code Explainer, Code Translator, Decision Analyzer

**Productivity**: Checklist Manager, Focus Timer, Bookmark Manager, Habit Tracker, Random Picker, Shortcut Reference

**System**: System Info, PrismBrowser Web

### Settings & Customization

**Clock Settings** ⚙️
- Format toggle (12/24 hour)
- Color picker with history
- 15 font styles
- Real-time preview

**Themes** 🎨
- 8 built-in wallpapers
- Custom wallpaper upload
- Theme mode selection

**Quotes & Greetings** 💬
- Toggle top quotes
- Toggle daily greetings

**Extras** ⚡
- Matrix display toggle
- More features coming soon

## 🛠️ Built With

- **[Next.js 15](https://nextjs.org/)** - React framework
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript](https://typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **Custom Fonts** - 10+ typefaces for customization

## 📦 Scripts

```bash
# Backend (PowerShell)
.\backend\start.ps1     # Starts Python virtual environment, installs dependencies, and runs FastAPI server on port 8000

# Frontend Development
npm run dev                  # Start Next.js dev server (http://localhost:3000)

# Frontend Production
npm run build                # Build Next.js app for production
npm start                    # Start production server

# Frontend Linting
npm run lint                 # Check code quality
```

## 🎨 Customization

### Add a New Tool
Edit `components/DevSpace.tsx`:
```typescript
const tools = [
  { 
    icon: '🎯', 
    title: 'My Tool',
    desc: 'Description',
    href: 'https://example.com'
  },
  // ... existing tools
];
```

### Change Background
Replace `public/images/BG.png` with your image or use the settings panel to upload a custom wallpaper.

### Modify Quotes
Edit `public/quotes.json`:
```json
{
  "monday": {
    "primary": "Your custom quote",
    "secondary": "Your custom greeting"
  }
}
```

### Add Custom Font
1. Add font file to `public/fonts/`
2. Add @font-face in `app/globals.css`
3. Add to `tailwind.config.ts`
4. Use with Tailwind class

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Other Platforms
- **Netlify**: Connect GitHub repo
- **Railway**: Import from GitHub
- **AWS Amplify**: Deploy from console
- **DigitalOcean**: Use App Platform

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed instructions.

## 📊 Performance

```
✓ Build successful
Route (app)              Size    First Load JS
┌ ○ /                   13.2 kB    116 KB
└ ○ /_not-found         993 B      103 kB

Status: Production Ready ✅
```

## 📁 Project Structure

```
prismspace-web/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── Clock.tsx
│   ├── DevSpace.tsx
│   ├── SettingsModal.tsx
│   └── ...
├── public/                # Static assets
│   ├── fonts/
│   ├── images/
│   ├── dev-space/
│   └── quotes.json
└── docs/                  # Documentation
```

## 🎓 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://typescriptlang.org/docs/)

## 📝 License

ISC

## 🙏 Acknowledgments

- Original Prism Browser design
- Next.js team for the amazing framework
- All open-source contributors

## 📧 Support

For questions and support:
- Read the [Usage Guide](USAGE_GUIDE.md)
- Check the [Features List](FEATURES.md)
- Review [Documentation](COMPLETE_SUMMARY.md)

---

**Built with ❤️ using Next.js, React, and Tailwind CSS**

*Status: ✅ Production Ready | Build: ✅ Passing | Features: ✅ Complete*
