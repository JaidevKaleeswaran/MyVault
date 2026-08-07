import React from 'react';
import IncomeSettings from './IncomeSettings';
import CategoryGrid from './CategoryGrid';
import LeftToBudgetBanner from './LeftToBudgetBanner';
import Reveal from '../ui/Reveal';

export default function HomeTab() {
  return (
    <div className="flex flex-col">
      {/* Banner fades in first */}
      <Reveal delay={0} y={20}>
        <LeftToBudgetBanner />
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-0">
        {/* Left column: Income settings stagger slightly after banner */}
        <Reveal delay={0.1} y={28} as="div" className="lg:col-span-1">
          <IncomeSettings />
        </Reveal>

        {/* Right column: Category grid stagger last */}
        <Reveal delay={0.2} y={28} as="div" className="lg:col-span-2">
          <CategoryGrid />
        </Reveal>
      </div>
    </div>
  );
}
