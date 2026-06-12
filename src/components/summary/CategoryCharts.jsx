import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useBudget } from '../../contexts/BudgetContext';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/formatCurrency';

export default function CategoryCharts() {
  const { categories, categorySpending } = useBudget();

  if (categories.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center min-h-[400px]">
        <p className="text-text-muted">No budget categories defined.</p>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#18181b] border border-zinc-800 p-2 rounded-lg shadow-xl text-sm">
          <p className="text-text-muted">{payload[0].name}</p>
          <p className="font-semibold" style={{ color: payload[0].payload.color }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full min-h-[400px]">
      <h2 className="text-xl font-semibold text-text mb-6">Category Budgets</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {categories.map(category => {
          const spent = categorySpending[category.id] || 0;
          const remaining = Math.max(0, category.limit - spent);
          const percentUsed = (spent / category.limit) * 100;
          
          let spentColor = category.color; // Normal
          if (percentUsed >= 100) spentColor = '#ef4444'; // Red if exceeded
          else if (percentUsed >= 80) spentColor = '#facc15'; // Yellow if warning

          const data = [
            { name: 'Spent', value: spent, color: spentColor },
            { name: 'Remaining', value: remaining, color: '#27272a' }, // Dark gray for unused
          ];

          // If totally empty, avoid rechart rendering bug
          if (spent === 0 && remaining === 0) {
             data[0] = { name: 'Empty', value: 1, color: '#27272a' };
          }

          return (
            <div key={category.id} className="flex flex-col items-center">
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm font-medium mt-2 text-center text-text truncate w-full px-2" title={category.name}>
                {category.name}
              </p>
              <p className="text-xs text-text-muted text-center mt-1">
                {Math.round(percentUsed)}% Used
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
