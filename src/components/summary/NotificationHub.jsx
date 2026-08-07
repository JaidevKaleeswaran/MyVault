import React, { useEffect, useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { Card } from '../ui/Card';
import {
  AlertTriangle, AlertOctagon, Bell, TrendingDown,
  CreditCard, Wallet, RefreshCw, Eye
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

function AlertCard({ alert }) {
  const configs = {
    danger: {
      bg: 'bg-red-500/10 border-red-500/25',
      text: 'text-red-400',
      icon: AlertOctagon,
      badge: 'bg-red-500/20 text-red-300',
    },
    warning: {
      bg: 'bg-yellow-500/10 border-yellow-500/25',
      text: 'text-yellow-400',
      icon: AlertTriangle,
      badge: 'bg-yellow-500/20 text-yellow-300',
    },
    info: {
      bg: 'bg-blue-500/10 border-blue-500/20',
      text: 'text-blue-400',
      icon: Bell,
      badge: 'bg-blue-500/20 text-blue-300',
    },
    subscription: {
      bg: 'bg-purple-500/10 border-purple-500/20',
      text: 'text-purple-400',
      icon: CreditCard,
      badge: 'bg-purple-500/20 text-purple-300',
    },
    unallocated: {
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      text: 'text-emerald-400',
      icon: Wallet,
      badge: 'bg-emerald-500/20 text-emerald-300',
    },
    large: {
      bg: 'bg-orange-500/10 border-orange-500/20',
      text: 'text-orange-400',
      icon: TrendingDown,
      badge: 'bg-orange-500/20 text-orange-300',
    },
  };

  const cfg = configs[alert.type] || configs.info;
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start space-x-3 p-4 rounded-xl border transition-all hover:scale-[1.01] ${cfg.bg}`}>
      <div className={`mt-0.5 shrink-0 ${cfg.text}`}>
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={`font-semibold text-sm ${cfg.text}`}>{alert.category || alert.title}</h4>
          {alert.tag && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
              {alert.tag}
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5 opacity-80 text-zinc-300">{alert.message}</p>
        {alert.cta && (
          <p className={`text-[11px] mt-1.5 font-medium flex items-center gap-1 ${cfg.text}`}>
            <Eye size={11} /> {alert.cta}
          </p>
        )}
      </div>
    </div>
  );
}

export default function NotificationHub() {
  const { categories, categorySpending, transactions, totalIncome, leftToBudget } = useBudget();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const newAlerts = [];

    // ── 1. Over-budget & approaching-limit alerts ────────────────────────────
    categories.forEach(category => {
      const spent = categorySpending[category.id] || 0;
      const limit = category.limit;
      if (limit === 0) return;

      const percent = (spent / limit) * 100;
      if (percent > 100) {
        newAlerts.push({
          id: `over_${category.id}`,
          type: 'danger',
          category: category.name,
          tag: 'Over Budget',
          message: `Exceeded limit by ${formatCurrency(spent - limit)} — you've spent ${formatCurrency(spent)} of ${formatCurrency(limit)}.`,
          cta: 'Review spending in this category',
        });
      } else if (percent === 100) {
        newAlerts.push({
          id: `limit_${category.id}`,
          type: 'danger',
          category: category.name,
          tag: 'Limit Reached',
          message: `Entire ${formatCurrency(limit)} expenditure limit has been spent.`,
          cta: 'No remaining budget in this category',
        });
      } else if (percent >= 85) {
        newAlerts.push({
          id: `warn_${category.id}`,
          type: 'warning',
          category: category.name,
          tag: `${Math.round(percent)}% Used`,
          message: `Approaching your ${formatCurrency(limit)} limit — only ${formatCurrency(limit - spent)} remaining.`,
          cta: 'Consider pausing non-essential spending here',
        });
      }
    });

    // ── 2. Large single-expense alert (> 25% of category limit) ─────────────
    transactions.forEach(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      if (!cat || !cat.limit) return;
      if (Number(tx.amount) > cat.limit * 0.25) {
        newAlerts.push({
          id: `large_${tx.id}`,
          type: 'large',
          category: cat.name,
          tag: 'Large Expense',
          message: `"${tx.description}" — ${formatCurrency(tx.amount)} is more than 25% of your ${cat.name} limit (${formatCurrency(cat.limit)}).`,
          cta: 'Was this expected?',
        });
      }
    });

    // ── 3. Subscription detected ─────────────────────────────────────────────
    const subKeywords = /netflix|spotify|equinox|gym|icloud|apple|hulu|disney|prime|amazon prime|utility|internet|wifi|youtube|hbo|paramount|subscription/i;
    const detectedSubs = transactions.filter(tx => tx.recurring || tx.isSubscription || subKeywords.test(tx.description || ''));
    const subTotal = detectedSubs.reduce((s, t) => s + Number(t.amount), 0);
    if (detectedSubs.length > 0) {
      newAlerts.push({
        id: 'subs_overview',
        type: 'subscription',
        title: 'Subscriptions Detected',
        tag: `${detectedSubs.length} Services`,
        message: `You have ${detectedSubs.length} active subscription${detectedSubs.length > 1 ? 's' : ''} totalling ${formatCurrency(subTotal)}/cycle.`,
        cta: 'Review your subscription list',
      });
    }

    // ── 4. Unallocated income ────────────────────────────────────────────────
    if (totalIncome > 0 && leftToBudget > totalIncome * 0.05) {
      newAlerts.push({
        id: 'unallocated',
        type: 'unallocated',
        title: 'Unallocated Income',
        tag: 'Budget Gap',
        message: `${formatCurrency(leftToBudget)} of your income has no category assigned — it won't be tracked or protected.`,
        cta: 'Add a Savings or Emergency Fund category',
      });
    }

    // ── 5. Zero-spend category mid-cycle (if > 7 days into cycle) ──────────
    // Only trigger if we have some transactions to establish that the cycle is underway
    if (transactions.length > 0) {
      categories.forEach(category => {
        const spent = categorySpending[category.id] || 0;
        if (spent === 0 && category.limit > 0) {
          newAlerts.push({
            id: `zero_${category.id}`,
            type: 'info',
            category: category.name,
            tag: 'No Activity',
            message: `No expenses recorded yet for ${category.name} (limit: ${formatCurrency(category.limit)}).`,
            cta: 'Is this category still needed?',
          });
        }
      });
    }

    // Sort: danger first, then warning, then others
    const priority = { danger: 0, warning: 1, large: 2, subscription: 3, unallocated: 4, info: 5 };
    newAlerts.sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));

    setAlerts(newAlerts);
  }, [categories, categorySpending, transactions, totalIncome, leftToBudget]);

  const dangerCount = alerts.filter(a => a.type === 'danger').length;
  const warningCount = alerts.filter(a => a.type === 'warning' || a.type === 'large').length;

  return (
    <Card className="mt-8 border-yellow-500/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${dangerCount > 0 ? 'bg-red-500/15 text-red-400' : warningCount > 0 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
            <Bell size={18} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neon">Notification Hub</h2>
            <p className="text-xs text-text-muted mt-0.5">Budget alerts, anomalies & insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dangerCount > 0 && (
            <span className="bg-red-500/20 text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-500/30 flex items-center gap-1">
              <AlertOctagon size={11} /> {dangerCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-yellow-500/30 flex items-center gap-1">
              <AlertTriangle size={11} /> {warningCount} Warning
            </span>
          )}
          {alerts.length === 0 && (
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30">
              All Clear ✓
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell size={22} className="text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-400">All budgets look healthy!</p>
            <p className="text-xs mt-1">No alerts or anomalies detected for this cycle.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        )}
      </div>

      {alerts.length > 0 && (
        <p className="text-[11px] text-text-muted mt-4 text-center">
          {alerts.length} alert{alerts.length > 1 ? 's' : ''} · Auto-updated as you log expenses
        </p>
      )}
    </Card>
  );
}
