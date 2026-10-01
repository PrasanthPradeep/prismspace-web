/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
export interface LanyardCardData {
  name?: string;
  title?: string;
  tagline?: string;
  tags?: string[];
  handle?: string;
  avatar?: string;
  projectsCount?: number;
  commitsCount?: number;
  streakCount?: number;
}

/**
 * Generates an ultra high-resolution 800x1200 card texture mapped onto the front
 * face of the 3D Lanyard card. All fonts, badges, stats, and tags are large,
 * bold, and instantly readable.
 */
export function generateLanyardTexture({
  name = 'Nobin',
  title = 'PrismSpace User',
  tagline = 'You code it. Now orchestrate.',
  tags = ['AI/ML', 'Cybersecurity', 'Full-stack'],
  handle = 'nobin',
  avatar = '🔥',
  projectsCount = 12,
  commitsCount = 480,
  streakCount = 21,
}: LanyardCardData = {}): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const w = 800;
  const h = 1200;

  // 1. Obsidian Card Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#0c131c');
  bgGrad.addColorStop(0.3, '#080d14');
  bgGrad.addColorStop(0.7, '#05080c');
  bgGrad.addColorStop(1, '#020406');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Top emerald ambient glow
  const topGlow = ctx.createRadialGradient(280, 120, 20, 280, 120, 450);
  topGlow.addColorStop(0, 'rgba(0, 223, 129, 0.22)');
  topGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, w, h);

  // Outer border with subtle glass stroke
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.restore();

  // 2. Top Header Row (y ≈ 50)
  // Left: ● PRISMSPACE badge
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.roundRect(44, 46, 220, 48, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 223, 129, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Mint dot
  ctx.fillStyle = '#00df81';
  ctx.beginPath();
  ctx.arc(68, 70, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = '#00df81';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "SF Pro Display", -apple-system, BlinkMacSystemFont, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('PRISMSPACE', 86, 76);
  ctx.restore();

  // Right: Role pill (e.g. PrismSpace User)
  ctx.save();
  const displayTitle = title || 'PrismSpace User';
  ctx.font = 'bold 16px "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif';
  const roleWidth = ctx.measureText(displayTitle).width;
  const rolePillW = roleWidth + 36;
  const rolePillX = w - 44 - rolePillW;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(rolePillX, 46, rolePillW, 48, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#f1f5f9';
  ctx.textAlign = 'center';
  ctx.fillText(displayTitle, rolePillX + rolePillW / 2, 76);
  ctx.restore();

  // 3. Name & Tagline (Left aligned, large & punchy)
  ctx.save();
  ctx.font = 'bold 56px "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(name || 'Nobin', 46, 160);

  ctx.font = '600 20px "SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
  ctx.fillText(tagline || 'You code it. Now orchestrate.', 46, 196);
  ctx.restore();

  // 4. Center Glowing Avatar Ring
  const avatarCenterX = w / 2;
  const avatarCenterY = 345;
  const avatarRadius = 90;

  // Outer ambient glow
  const ringGlow = ctx.createRadialGradient(avatarCenterX, avatarCenterY, 40, avatarCenterX, avatarCenterY, 160);
  ringGlow.addColorStop(0, 'rgba(0, 223, 129, 0.35)');
  ringGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = ringGlow;
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, 160, 0, Math.PI * 2);
  ctx.fill();

  // Circle background
  ctx.fillStyle = '#060a0f';
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
  ctx.fill();

  // Emerald glowing border
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#00df81';
  ctx.lineWidth = 5;
  ctx.shadowColor = '#00df81';
  ctx.shadowBlur = 24;
  ctx.stroke();
  ctx.restore();

  // Inner avatar emoji or flame
  ctx.save();
  ctx.font = '92px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const displayAvatar = avatar && !avatar.startsWith('http') && !avatar.startsWith('data:') && !avatar.startsWith('modern:')
    ? avatar
    : '🔥';
  ctx.fillText(displayAvatar, avatarCenterX, avatarCenterY + 4);
  ctx.restore();

  // 5. Stats Container (y = 485, h = 125)
  ctx.save();
  const statsY = 485;
  const statsH = 125;
  ctx.fillStyle = 'rgba(15, 22, 32, 0.85)';
  ctx.beginPath();
  ctx.roundRect(44, statsY, w - 88, statsH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 223, 129, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Stat item 1: Projects
  const col1X = 44 + (w - 88) * 0.18;
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#00df81';
  ctx.textAlign = 'center';
  ctx.fillText(String(projectsCount), col1X, statsY + 54);
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('PROJECTS', col1X, statsY + 92);

  // Stat item 2: Commits
  const col2X = w / 2;
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#00df81';
  ctx.fillText(String(commitsCount), col2X, statsY + 54);
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('COMMITS', col2X, statsY + 92);

  // Stat item 3: Streak
  const col3X = w - 44 - (w - 88) * 0.18;
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#00df81';
  ctx.fillText(String(streakCount), col3X, statsY + 54);
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('STREAK', col3X, statsY + 92);
  ctx.restore();

  // 6. Dynamic Tags Row (y = 650)
  ctx.save();
  let tagY = 650;
  let tagX = 44;
  const maxTagRight = w - 44;
  const activeTags = tags && tags.length > 0 ? tags : ['AI/ML', 'Cybersecurity', 'Full-stack'];

  activeTags.forEach((tag, idx) => {
    ctx.font = 'bold 19px "JetBrains Mono", monospace';
    const tagText = tag;
    const textW = ctx.measureText(tagText).width;
    const tagPillW = textW + 36;

    if (tagX + tagPillW > maxTagRight && tagX > 44) {
      tagX = 44;
      tagY += 58;
    }

    const isHighlight = idx === activeTags.length - 1;

    ctx.fillStyle = isHighlight ? 'rgba(0, 223, 129, 0.15)' : 'rgba(20, 28, 40, 0.9)';
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagPillW, 50, 16);
    ctx.fill();
    ctx.strokeStyle = isHighlight ? '#00df81' : 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = isHighlight ? '#00df81' : '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(tagText, tagX + 18, tagY + 32);

    tagX += tagPillW + 14;
  });
  ctx.restore();

  // 7. Links Row (GitHub, Portfolio, Email)
  ctx.save();
  const linksY = Math.max(tagY + 75, 780);
  const linkPillW = (w - 88 - 24) / 3;

  const links = ['GitHub', 'Portfolio', 'Email'];
  links.forEach((lbl, i) => {
    const lx = 44 + i * (linkPillW + 12);
    ctx.fillStyle = 'rgba(24, 32, 46, 0.9)';
    ctx.beginPath();
    ctx.roundRect(lx, linksY, linkPillW, 56, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 18px "SF Pro Display", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, lx + linkPillW / 2, linksY + 35);
  });
  ctx.restore();

  // 8. Footer Container (@handle and ● Online) (y = 1070, h = 80)
  ctx.save();
  const footerY = 1070;
  const footerH = 80;
  ctx.fillStyle = 'rgba(12, 18, 28, 0.95)';
  ctx.beginPath();
  ctx.roundRect(44, footerY, w - 88, footerH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // @handle
  ctx.font = 'bold 24px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(`@${handle || 'nobin'}`, 70, footerY + 48);

  // Online indicator
  const onlineDotX = w - 160;
  ctx.fillStyle = '#00df81';
  ctx.beginPath();
  ctx.arc(onlineDotX, footerY + 40, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = '#00df81';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillStyle = '#00df81';
  ctx.textAlign = 'left';
  ctx.fillText('Online', onlineDotX + 16, footerY + 47);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

