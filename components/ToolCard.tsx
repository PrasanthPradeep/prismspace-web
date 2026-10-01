/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

interface ToolCardProps {
  icon: string;
  title: string;
  desc: string;
  href?: string;
  action?: string;
  onActionClick?: (action: string) => void;
}

export function ToolCard({ icon, title, desc, href, action, onActionClick }: ToolCardProps) {
  const handleClick = () => {
    if (action && onActionClick) {
      onActionClick(action);
    }
  };

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="glass rounded-2xl p-[30px] transition-all duration-400 cursor-pointer 
                   flex flex-col items-center gap-4 text-center relative overflow-hidden
                   hover:-translate-y-2 hover:bg-white/[0.12] hover:border-white/25
                   hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)]
                   before:absolute before:inset-0 before:bg-gradient-to-br 
                   before:from-white/10 before:to-white/5 before:opacity-0 
                   before:transition-opacity before:duration-300 before:z-[1]
                   hover:before:opacity-100"
      >
        <div className="relative z-[2]">
          <div className="text-[2.5rem] mb-2">{icon}</div>
          <div className="font-sans text-xl font-semibold mb-2 text-white tracking-tight">
            {title}
          </div>
          <div className="font-sans text-sm font-normal opacity-80 leading-relaxed text-white/90">
            {desc}
          </div>
        </div>
      </a>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="glass rounded-2xl p-[30px] transition-all duration-400 cursor-pointer 
                 flex flex-col items-center gap-4 text-center relative overflow-hidden
                 hover:-translate-y-2 hover:bg-white/[0.12] hover:border-white/25
                 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)]
                 before:absolute before:inset-0 before:bg-gradient-to-br 
                 before:from-white/10 before:to-white/5 before:opacity-0 
                 before:transition-opacity before:duration-300 before:z-[1]
                 hover:before:opacity-100"
    >
      <div className="relative z-[2]">
        <div className="text-[2.5rem] mb-2">{icon}</div>
        <div className="font-sans text-xl font-semibold mb-2 text-white tracking-tight">
          {title}
        </div>
        <div className="font-sans text-sm font-normal opacity-80 leading-relaxed text-white/90">
          {desc}
        </div>
      </div>
    </div>
  );
}
