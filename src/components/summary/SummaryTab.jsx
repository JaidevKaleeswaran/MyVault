import React from 'react';
import FinancialHealthCards from './FinancialHealthCards';
import MainBalanceChart from './MainBalanceChart';
import CategoryCharts from './CategoryCharts';
import NotificationHub from './NotificationHub';
import MaskedHeading from '../ui/MaskedHeading';
import Reveal from '../ui/Reveal';

export default function SummaryTab() {
  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neon">
          Your Financial Picture
        </h1>
        <p className="text-sm text-text-muted mt-2">
          Real-time overview of your income, spending, and financial health.
        </p>
      </div>

      {/* Top Financial Health Scorecard (Net Worth, Cash Flow, Savings Rate, Subscriptions) */}
      <Reveal delay={0.05}>
        <FinancialHealthCards />
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: Main Balance Pie Chart */}
        <Reveal delay={0.15} as="div">
          <MainBalanceChart />
        </Reveal>

        {/* Right column: Multiple smaller pie charts */}
        <Reveal delay={0.2} as="div">
          <CategoryCharts />
        </Reveal>
      </div>

      {/* Bottom section: Notification Hub */}
      <Reveal delay={0.28}>
        <NotificationHub />
      </Reveal>
    </div>
  );
}
