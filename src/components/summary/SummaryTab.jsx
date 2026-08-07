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
      {/* Cinematic hero heading */}
      <div className="relative mb-2">
        <MaskedHeading
          text="Your Financial Picture"
          tag="h1"
          src="/neon-gradient.png"
          reveal="wipe"
          trigger="view"
          duration={1.3}
          fillScale={1.3}
          parallax={30}
          drift={14}
          brightness={1.1}
          saturation={1.2}
          textScale={0.085}
          align="left"
          weight={800}
          tracking={-0.04}
          lineHeight={1.05}
          style={{ paddingBottom: '0.08em' }}
        />
        <p className="text-sm text-zinc-500 mt-3 ml-0.5">
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
