import React from 'react';
import FinancialHealthCards from './FinancialHealthCards';
import MainBalanceChart from './MainBalanceChart';
import CategoryCharts from './CategoryCharts';
import NotificationHub from './NotificationHub';

export default function SummaryTab() {
  return (
    <div className="flex flex-col space-y-6">
      {/* Top Financial Health Scorecard (Net Worth, Cash Flow, Savings Rate, Subscriptions) */}
      <FinancialHealthCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: Main Balance Pie Chart */}
        <div>
          <MainBalanceChart />
        </div>

        {/* Right column: Multiple smaller pie charts */}
        <div>
          <CategoryCharts />
        </div>
      </div>

      {/* Bottom section: Notification Hub */}
      <div>
        <NotificationHub />
      </div>
    </div>
  );
}
