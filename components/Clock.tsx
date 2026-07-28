'use client';

import { useEffect, useState } from 'react';

export type ClockStyle = 'default' | 'minimal' | 'serif' | 'handwritten' | 'minimal-light' | 
  'serif-condensed' | 'bitcount' | 'corpta' | 'fenotype' | 'nclkemgor' | 
  'westiva' | 'ammonite' | 'crude' | 'zombiess' | 'xolonium' | 'nemoy';

export const clockStyleClasses: Record<ClockStyle, string> = {
  default: 'font-montserrat font-black',
  minimal: 'font-sans font-light tracking-[0.1em]',
  serif: 'font-serif font-normal tracking-tight',
  handwritten: 'font-permanentMarker font-normal rotate-[-1deg] tracking-wide',
  'minimal-light': 'font-permanentMarker font-normal text-white/95 tracking-[0.1em]',
  'serif-condensed': 'font-gennaro font-normal tracking-tight',
  bitcount: 'font-bitcount font-medium tracking-[0.2em]',
  corpta: 'font-corpta font-normal tracking-wide',
  fenotype: 'font-fenotype font-light tracking-[0.1em]',
  nclkemgor: 'font-nclkemgor font-normal tracking-wide',
  westiva: 'font-westiva font-normal tracking-wider',
  ammonite: 'font-ammonite font-normal tracking-wide',
  crude: 'font-crude font-normal tracking-[0.1em]',
  zombiess: 'font-zombiess font-normal tracking-wide',
  xolonium: 'font-xolonium font-normal tracking-wide',
  nemoy: 'font-nemoy font-normal tracking-wide'
};

export function Clock() {
  const [time, setTime] = useState('');
  const [clockFormat, setClockFormat] = useState<'12' | '24'>('24');
  const [clockStyle, setClockStyle] = useState<ClockStyle>('default');
  const [clockColor, setClockColor] = useState('#ffffff');

  useEffect(() => {
    // Load preferences from localStorage
    const savedFormat = (localStorage.getItem('clockFormat') || '24') as '12' | '24';
    const savedStyle = (localStorage.getItem('clockStyle') || 'default') as ClockStyle;
    const savedColor = localStorage.getItem('clockColor') || '#ffffff';
    
    setClockFormat(savedFormat);
    setClockStyle(savedStyle);
    setClockColor(savedColor);

    // Update time
    const updateTime = () => {
      const now = new Date();
      let timeString: string;
      
      if (savedFormat === '12') {
        const hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const displayHours = hours % 12 || 12;
        timeString = `${displayHours}:${minutes}`;
      } else {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeString = `${hours}:${minutes}`;
      }
      
      setTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const styleClass = clockStyleClasses[clockStyle];

  return (
    <div 
      className={`text-[12rem] cursor-pointer transition-all duration-300 leading-none tracking-tight
                  text-shadow-md hover:scale-105 hover:text-shadow-lg ${styleClass}`}
      style={{ color: clockColor }}
    >
      {time || '00:00'}
    </div>
  );
}
