/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Clock } from './Clock';
import { SearchBar } from './SearchBar';
import quotesData from '@/quotes.json';

interface DailyQuotes {
  primary: string;
  secondary: string;
}

const dailyQuotes = quotesData as Record<string, DailyQuotes>;

const fallbackQuotes: Record<string, DailyQuotes> = {
  sunday: { primary: "Rest and recharge, PRISM", secondary: "User, Serene Sunday!" },
  monday: { primary: "Start your week strong, PRISM", secondary: "User, Happy Monday!" },
  tuesday: { primary: "Build momentum today, PRISM", secondary: "User, Terrific Tuesday!" },
  wednesday: { primary: "You're halfway there, PRISM", secondary: "User, Wonderful Wednesday!" },
  thursday: { primary: "Push through with power, PRISM", secondary: "User, Thriving Thursday!" },
  friday: { primary: "Celebrate your success, PRISM", secondary: "User, Happy Friday!" },
  saturday: { primary: "Enjoy your achievements, PRISM", secondary: "User, Spectacular Saturday!" },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export function MainContainer() {
  const [quotes, setQuotes] = useState<DailyQuotes>(fallbackQuotes.friday);
  const [showGreetings, setShowGreetings] = useState(true);

  useEffect(() => {
    const savedShowGreetings = localStorage.getItem('showGreetings') !== 'false';
    setShowGreetings(savedShowGreetings);

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    const currentDay = days[today];

    setQuotes(dailyQuotes[currentDay] || fallbackQuotes[currentDay]);
  }, []);

  /**
   * Agent Swarm submit handler.
   * Opens the AgentSwarm panel and pre-fills the objective from the search bar.
   * Uses a custom event so we don't need to thread props down through page.tsx.
   */
  const handleAgentSubmit = (query: string, model?: string, provider?: string) => {
    window.dispatchEvent(new CustomEvent('prism:open-agent-swarm', { detail: { query, model, provider } }));
  };

  return (
    <div
      className="h-screen flex flex-col items-center justify-center text-center sticky top-0 z-[1]"
    >
      <motion.div
        className="flex flex-col items-center gap-[20px] w-full px-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {showGreetings && (
          <motion.div className="text-center mb-2" variants={staggerItem}>
            <h1 className="sr-only">PrismSpace AI developer workspace</h1>
            <p
              className="font-sans text-[2.4rem] font-[900] tracking-[-0.04em] leading-[1.05] lowercase mb-3 text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.6)]"
            >
              {quotes.primary}
            </p>
            <div className="cutout-box">
              <p className="cutout-text text-[2rem]" style={{ fontWeight: 800 }}>
                {quotes.secondary}
              </p>
            </div>
          </motion.div>
        )}

        <motion.div variants={staggerItem}>
          <Clock />
        </motion.div>

        {/* Search bar placed directly below the clock */}
        <motion.div variants={staggerItem} className="w-full flex justify-center">
          <SearchBar onAgentSubmit={handleAgentSubmit} />
        </motion.div>
      </motion.div>
    </div>
  );
}
