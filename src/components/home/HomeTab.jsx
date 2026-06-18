import React from 'react';
import IncomeSettings from './IncomeSettings';
import CategoryGrid from './CategoryGrid';
import LeftToBudgetBanner from './LeftToBudgetBanner';

export default function HomeTab() {
  return (
    <div className="flex flex-col">
      <LeftToBudgetBanner />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Income/Allowance settings */}
        <div className="lg:col-span-1">
          <IncomeSettings />
        </div>

        {/* Right column: Budget categories grid */}
        <div className="lg:col-span-2">
          <CategoryGrid />
        </div>
      </div>
    </div>
  );
}
