import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useBudget } from '../../contexts/BudgetContext';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/formatCurrency';

export default function MainBalanceChart() {
  const { totalIncome, totalSpent } = useBudget();
  const moneyLeft = Math.max(0, totalIncome - totalSpent);
  
  const data = [
    { name: 'Total Spent', value: Math.min(totalSpent, totalIncome), color: '#e7b956' }, // Gold (Accent)
    { name: 'Remaining', value: Math.max(0, totalIncome - totalSpent), color: '#2e5b45' }, // Forest Green
  ];

  // If no income and no spent, show empty state
  const isEmpty = totalIncome === 0 && totalSpent === 0;
  
  if (isEmpty) {
    data[0] = { name: 'No Data', value: 1, color: '#38342e' };
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length && !isEmpty) {
      return (
        <div className="bg-[#18181b] border border-zinc-800 p-3 rounded-lg shadow-xl">
          <p className="text-sm text-text-muted">{payload[0].name}</p>
          <p className="font-semibold text-text" style={{ color: payload[0].payload.color }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col justify-center items-center min-h-[400px] relative">
      <h2 className="text-xl font-semibold text-text absolute top-6 left-6">Balance Overview</h2>
      
      <div className="w-full h-[300px] mt-8">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={110}
              paddingAngle={0}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
              cornerRadius={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {!isEmpty && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-4">
          <p className="text-sm text-text-muted">Remaining</p>
          <p className="text-2xl font-bold text-text">{formatCurrency(moneyLeft)}</p>
        </div>
      )}
      {isEmpty && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-4">
          <p className="text-sm text-text-muted">Setup income</p>
          <p className="text-lg font-bold text-text">No Data</p>
        </div>
      )}
    </Card>
  );
}
