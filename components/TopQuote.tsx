/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const quotes = [
  { quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { quote: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { quote: "The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs" },
  { quote: "If something is important enough, even if the odds are against you, you should still do it.", author: "Elon Musk" },
  { quote: "Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.", author: "Mark Zuckerberg" },
  { quote: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Stay hungry, stay foolish.", author: "Steve Jobs" },
];

export function TopQuote() {
  const [quote, setQuote] = useState(quotes[0]);
  const [showDynamic, setShowDynamic] = useState(true);

  useEffect(() => {
    // Check if dynamic greetings should be shown
    const savedDynamicGreetings = localStorage.getItem('dynamicGreetings') !== 'false';
    setShowDynamic(savedDynamicGreetings);

    if (savedDynamicGreetings) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setQuote(quotes[randomIndex]);
    }
  }, []);

  if (!showDynamic) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-[72px] right-[40px] max-w-[380px] text-right z-[100]"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="editorial-badge mb-2" style={{ marginLeft: 'auto' }}>
          DAILY WISDOM
        </div>
        <p
          className="font-sans text-[15px] font-[600] italic leading-relaxed text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
        >
          &quot;{quote.quote}&quot;
        </p>
        <p
          className="font-mono text-[11px] font-[700] mt-1 uppercase tracking-[0.05em] text-white/60 drop-shadow-sm"
        >
          — {quote.author}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
