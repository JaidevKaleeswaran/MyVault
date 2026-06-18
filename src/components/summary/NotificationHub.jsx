import React, { useEffect, useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { Card } from '../ui/Card';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

export default function NotificationHub() {
  const { categories, categorySpending } = useBudget();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const newAlerts = [];
    categories.forEach(category => {
      const spent = categorySpending[category.id] || 0;
      const limit = category.limit;
      if (limit === 0) return;

      const percent = (spent / limit) * 100;
      if (percent > 100) {
        newAlerts.push({
          id: category.id,
          type: 'danger',
          category: category.name,
          message: `Over budget! Exceeded by ${formatCurrency(spent - limit)}`,
        });
      } else if (percent === 100) {
        newAlerts.push({
          id: category.id,
          type: 'danger',
          category: category.name,
          message: `Limit reached — entire ${formatCurrency(limit)} budget spent`,
        });
      } else if (percent >= 85) {
        newAlerts.push({
          id: category.id,
          type: 'warning',
          category: category.name,
          message: `Approaching limit (${Math.round(percent)}% used)`,
        });
      }
    });
    setAlerts(newAlerts);
  }, [categories, categorySpending]);

  return (
    <Card className="mt-8 border-yellow-500/20">
      <div className="flex items-center space-x-2 mb-4">
        <h2 className="text-xl font-semibold text-text">Notification Hub</h2>
        <span className="bg-zinc-800 text-xs px-2 py-0.5 rounded-full text-text-muted">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-text-muted text-sm italic">All budgets are looking good!</p>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id}
              className={`flex items-start space-x-3 p-4 rounded-lg border ${
                alert.type === 'danger' 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              }`}
            >
              <div className="mt-0.5">
                {alert.type === 'danger' ? <AlertOctagon size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div>
                <h4 className="font-semibold text-sm">{alert.category}</h4>
                <p className="text-xs mt-0.5 opacity-90">{alert.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
