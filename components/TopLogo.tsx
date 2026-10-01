/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import Image from 'next/image';
import { motion } from 'motion/react';

export function TopLogo() {
  return (
    <motion.div
      className="fixed top-6 left-6 sm:top-[30px] sm:left-[40px] flex items-center z-[100] select-none"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <a
        href="/"
        className="flex items-center group cursor-pointer focus:outline-none"
        title="PrismSpace"
      >
        <Image
          src="/Logo/new_logo_wide.png"
          alt="PrismSpace"
          width={160}
          height={38}
          priority
          className="h-[32px] sm:h-[36px] w-auto object-contain transition-all duration-300 group-hover:scale-105 group-hover:brightness-110 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
        />
      </a>
    </motion.div>
  );
}
