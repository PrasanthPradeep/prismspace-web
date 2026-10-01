/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import './ProfileCard.css';

const DEFAULT_INNER_GRADIENT = 'radial-gradient(circle at 50% 8%, rgba(0, 223, 129, 0.12) 0%, rgba(11, 16, 24, 0.94) 65%)';

const DEFAULT_STATS = [
  { label: 'Projects', value: 12 },
  { label: 'Commits', value: 480 },
  { label: 'Streak', value: 21 }
];

const DEFAULT_SKILLS = ['AI/ML', 'Cybersecurity', 'Full-stack'];

const DEFAULT_LINKS = [
  { label: 'GitHub', href: '#' },
  { label: 'Portfolio', href: '#' },
  { label: 'Email', href: '#' }
];

const ANIMATION_CONFIG = {
  INITIAL_DURATION: 1200,
  INITIAL_X_OFFSET: 60,
  INITIAL_Y_OFFSET: 50,
  DEVICE_BETA_OFFSET: 20,
  ENTER_TRANSITION_MS: 180
};

const clamp = (v, min = 0, max = 100) => Math.min(Math.max(v, min), max);
const round = (v, precision = 3) => parseFloat(v.toFixed(precision));
const adjust = (v, fMin, fMax, tMin, tMax) => round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

const ProfileCardComponent = ({
  avatarUrl = '',
  iconUrl = '',
  grainUrl = '',
  innerGradient,
  behindGlowEnabled = true,
  behindGlowColor,
  behindGlowSize,
  className = '',
  enableTilt = true,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  miniAvatarUrl,
  name = 'Nobin',
  title = 'PrismSpace User',
  tagline = 'You code it. Now orchestrate.',
  stats = DEFAULT_STATS,
  skills = DEFAULT_SKILLS,
  links = DEFAULT_LINKS,
  handle = 'nobin',
  status = 'Online',
  showUserInfo = true,
  showContactButton = false,
  contactText = 'Contact',
  onContactClick = undefined
}) => {
  const wrapRef = useRef(null);
  const shellRef = useRef(null);
  const avatarRingRef = useRef(null);

  const enterTimerRef = useRef(null);
  const leaveRafRef = useRef(null);

  // ─── 3D Tilt Engine ───
  const tiltEngine = useMemo(() => {
    if (!enableTilt) return null;

    let rafId = null;
    let running = false;
    let lastTs = 0;

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const DEFAULT_TAU = 0.14;
    const INITIAL_TAU = 0.55;
    let initialUntil = 0;

    const setVarsFromXY = (x, y) => {
      const shell = shellRef.current;
      const wrap = wrapRef.current;
      if (!shell || !wrap) return;

      const width = shell.clientWidth || 1;
      const height = shell.clientHeight || 1;

      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);

      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const properties = {
        '--pointer-x': `${percentX}%`,
        '--pointer-y': `${percentY}%`,
        '--background-x': `${adjust(percentX, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(percentY, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${percentY / 100}`,
        '--pointer-from-left': `${percentX / 100}`,
        '--rotate-x': `${round(-(centerX / 6))}deg`,
        '--rotate-y': `${round(centerY / 5)}deg`
      };

      for (const [k, v] of Object.entries(properties)) wrap.style.setProperty(k, v);
    };

    const step = ts => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
      const k = 1 - Math.exp(-dt / tau);

      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;

      setVarsFromXY(currentX, currentY);

      const stillFar = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;

      if (stillFar || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setImmediate(x, y) {
        currentX = x;
        currentY = y;
        setVarsFromXY(currentX, currentY);
      },
      setTarget(x, y) {
        targetX = x;
        targetY = y;
        start();
      },
      toCenter() {
        const shell = shellRef.current;
        if (!shell) return;
        this.setTarget(shell.clientWidth / 2, shell.clientHeight / 2);
      },
      beginInitial(durationMs) {
        initialUntil = performance.now() + durationMs;
        start();
      },
      getCurrent() {
        return { x: currentX, y: currentY, tx: targetX, ty: targetY };
      },
      cancel() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        running = false;
        lastTs = 0;
      }
    };
  }, [enableTilt]);

  const getOffsets = (evt, el) => {
    const rect = el.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const handlePointerMove = useCallback(
    event => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;
      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerEnter = useCallback(
    event => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      shell.classList.add('active');
      shell.classList.add('entering');
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = window.setTimeout(() => {
        shell.classList.remove('entering');
      }, ANIMATION_CONFIG.ENTER_TRANSITION_MS);

      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerLeave = useCallback(() => {
    const shell = shellRef.current;
    if (!shell || !tiltEngine) return;

    tiltEngine.toCenter();

    const checkSettle = () => {
      const { x, y, tx, ty } = tiltEngine.getCurrent();
      const settled = Math.hypot(tx - x, ty - y) < 0.6;
      if (settled) {
        shell.classList.remove('active');
        leaveRafRef.current = null;
      } else {
        leaveRafRef.current = requestAnimationFrame(checkSettle);
      }
    };
    if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
    leaveRafRef.current = requestAnimationFrame(checkSettle);
  }, [tiltEngine]);

  const handleDeviceOrientation = useCallback(
    event => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      const { beta, gamma } = event;
      if (beta == null || gamma == null) return;

      const centerX = shell.clientWidth / 2;
      const centerY = shell.clientHeight / 2;
      const x = clamp(centerX + gamma * mobileTiltSensitivity, 0, shell.clientWidth);
      const y = clamp(
        centerY + (beta - ANIMATION_CONFIG.DEVICE_BETA_OFFSET) * mobileTiltSensitivity,
        0,
        shell.clientHeight
      );

      tiltEngine.setTarget(x, y);
    },
    [tiltEngine, mobileTiltSensitivity]
  );

  useEffect(() => {
    if (!enableTilt || !tiltEngine) return;

    const shell = shellRef.current;
    if (!shell) return;

    const pointerMoveHandler = handlePointerMove;
    const pointerEnterHandler = handlePointerEnter;
    const pointerLeaveHandler = handlePointerLeave;
    const deviceOrientationHandler = handleDeviceOrientation;

    shell.addEventListener('pointerenter', pointerEnterHandler);
    shell.addEventListener('pointermove', pointerMoveHandler);
    shell.addEventListener('pointerleave', pointerLeaveHandler);

    const handleClick = () => {
      if (!enableMobileTilt || location.protocol !== 'https:') return;
      const anyMotion = window.DeviceMotionEvent;
      if (anyMotion && typeof anyMotion.requestPermission === 'function') {
        anyMotion
          .requestPermission()
          .then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', deviceOrientationHandler);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', deviceOrientationHandler);
      }
    };
    shell.addEventListener('click', handleClick);

    const initialX = shell.clientWidth / 2;
    const initialY = shell.clientHeight / 2;
    tiltEngine.setImmediate(initialX, initialY);
    tiltEngine.toCenter();
    tiltEngine.beginInitial(ANIMATION_CONFIG.INITIAL_DURATION);

    return () => {
      shell.removeEventListener('pointerenter', pointerEnterHandler);
      shell.removeEventListener('pointermove', pointerMoveHandler);
      shell.removeEventListener('pointerleave', pointerLeaveHandler);
      shell.removeEventListener('click', handleClick);
      window.removeEventListener('deviceorientation', deviceOrientationHandler);
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
      tiltEngine.cancel();
      shell.classList.remove('entering');
    };
  }, [
    enableTilt,
    enableMobileTilt,
    tiltEngine,
    handlePointerMove,
    handlePointerEnter,
    handlePointerLeave,
    handleDeviceOrientation
  ]);

  // ─── Avatar Particle Burst ───
  const triggerParticleBurst = useCallback((e) => {
    const ring = avatarRingRef.current;
    if (!ring) return;

    const rect = ring.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      p.className = 'pc-particle';
      document.body.appendChild(p);

      const angle = (i / 12) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
      const dist = 38 + Math.random() * 32;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;

      p.style.left = `${originX}px`;
      p.style.top = `${originY}px`;
      p.style.transform = `translate(-50%, -50%) scale(${1 + Math.random() * 0.5})`;
      p.style.opacity = '1';
      p.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';

      requestAnimationFrame(() => {
        p.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0.2)`;
        p.style.opacity = '0';
      });

      setTimeout(() => {
        p.remove();
      }, 650);
    }
  }, []);

  const cardStyle = useMemo(
    () => ({
      '--icon': iconUrl ? `url(${iconUrl})` : 'none',
      '--grain': grainUrl ? `url(${grainUrl})` : 'none',
      '--inner-gradient': innerGradient ?? DEFAULT_INNER_GRADIENT,
      '--behind-glow-color': behindGlowColor ?? 'rgba(0, 223, 129, 0.22)',
      '--behind-glow-size': behindGlowSize ?? '55%'
    }),
    [iconUrl, grainUrl, innerGradient, behindGlowColor, behindGlowSize]
  );

  return (
    <div ref={wrapRef} className={`pc-card-wrapper ${className}`.trim()} style={cardStyle}>
      {behindGlowEnabled && <div className="pc-behind" />}
      <div ref={shellRef} className="pc-card-shell">
        <section className="pc-card">
          <div className="pc-inside">
            {/* Specular sheen & edge highlights */}
            <div className="pc-sheen" />
            <div className="pc-specular-edge" />

            {/* 1. Header: Badge & Role */}
            <div className="pc-header-row">
              <div className="pc-badge">
                <span className="pc-badge-dot" />
                <span className="pc-badge-text">PRISMSPACE</span>
              </div>
              {title && (
                <div className="pc-role-chip">
                  <span>{title}</span>
                </div>
              )}
            </div>

            {/* 2. Identity: Name & Tagline */}
            <div className="pc-identity">
              <h2 className="pc-name">{name || 'Nobin'}</h2>
              {tagline && <p className="pc-tagline">{tagline}</p>}
            </div>

            {/* 3. Centerpiece: Avatar Ring with Conic Gradient & Glow */}
            <div className="pc-avatar-stage">
              <div
                ref={avatarRingRef}
                className="pc-avatar-ring"
                onClick={triggerParticleBurst}
                role="button"
                tabIndex={0}
                title="Click for particle effect"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerParticleBurst(e);
                  }
                }}
              >
                <div className="pc-avatar-inner">
                  {avatarUrl && avatarUrl !== '🔥' ? (
                    <Image
                      className="pc-avatar-img"
                      src={avatarUrl}
                      alt={`${name || 'User'} avatar`}
                      width={96}
                      height={96}
                      unoptimized
                      loading="lazy"
                      onError={e => {
                        const t = e.target;
                        t.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="pc-avatar-emoji">🔥</span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Stats Row */}
            {stats && stats.length > 0 && (
              <div className="pc-stats-row" aria-label="Developer Statistics">
                {stats.map((stat, i) => (
                  <div key={i} className="pc-stat-item">
                    <span className="pc-stat-value">{stat.value}</span>
                    <span className="pc-stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 5. Skill Chips */}
            {skills && skills.length > 0 && (
              <div className="pc-skills-row" aria-label="Skills">
                {skills.map((skill, i) => (
                  <span key={i} className="pc-skill-chip">{skill}</span>
                ))}
              </div>
            )}

            {/* 6. Links Row */}
            {links && links.length > 0 && (
              <div className="pc-links-row" aria-label="Social Links">
                {links.map((link, i) => {
                  const label = typeof link === 'string' ? link : link.label;
                  const href = typeof link === 'string' ? '#' : (link.href || '#');
                  return (
                    <a
                      key={i}
                      href={href}
                      className="pc-link-btn"
                      onClick={(e) => {
                        if (href === '#') e.preventDefault();
                        onContactClick?.(label);
                      }}
                    >
                      <span>{label}</span>
                      <span className="pc-underline-sweep" />
                    </a>
                  );
                })}
              </div>
            )}

            {/* 7. Footer: Handle & Status Bar */}
            {showUserInfo && (
              <div className="pc-footer-bar">
                <span className="pc-handle">@{handle || 'nobin'}</span>
                <div className="pc-status">
                  <span className="pc-status-dot" />
                  <span>{status}</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const ProfileCard = React.memo(ProfileCardComponent);
export default ProfileCard;
