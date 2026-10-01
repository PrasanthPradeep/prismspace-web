/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
import Loader from '@/components/kokonutui/loader';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#090c12]/90 backdrop-blur-md">
      <Loader
        size="lg"
        title="Loading PrismSpace..."
        subtitle="Preparing your AI developer environment"
        mintAccent
      />
    </div>
  );
}
