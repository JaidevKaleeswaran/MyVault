import { useEffect } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { getCycleWindow, getNextCycleStart } from '../utils/cycleUtils';
import toast from 'react-hot-toast';

export function useCycleCheck() {
  const { categories, categorySpending, cycleStartDate, cycleFrequency, dispatch } = useBudget();

  useEffect(() => {
    if (!cycleStartDate) return; // Wait until cycle is configured

    const cycleWindow = getCycleWindow(cycleStartDate, cycleFrequency);
    const now = new Date();

    // Check if we have passed the end of the current cycle window
    if (now >= cycleWindow.end) {
      let nextCategories = [...categories];
      let savingsAmountToAdd = 0;
      let hasChanges = false;

      // Find savings category, or mark that we need to create one
      let savingsCategory = nextCategories.find(c => c.name.toLowerCase() === 'savings');

      categories.forEach(category => {
        if (category.endOfCycleAction === 'none' || category.limit === 0) return;

        const spent = categorySpending[category.id] || 0;
        const unspent = category.limit - spent;

        if (unspent > 0) {
          hasChanges = true;
          if (category.endOfCycleAction === 'rollover') {
            // Increase the limit by the unspent amount
            const catIndex = nextCategories.findIndex(c => c.id === category.id);
            nextCategories[catIndex] = {
              ...nextCategories[catIndex],
              limit: nextCategories[catIndex].limit + unspent
            };
          } else if (category.endOfCycleAction === 'sweep') {
            savingsAmountToAdd += unspent;
          }
        }
      });

      if (savingsAmountToAdd > 0) {
        hasChanges = true;
        if (savingsCategory) {
          const savingsIndex = nextCategories.findIndex(c => c.id === savingsCategory.id);
          nextCategories[savingsIndex] = {
            ...nextCategories[savingsIndex],
            limit: nextCategories[savingsIndex].limit + savingsAmountToAdd
          };
        } else {
          // Create savings category automatically
          const newSavings = {
            id: `sav-${Date.now()}`,
            name: 'Savings',
            limit: savingsAmountToAdd,
            color: '#3b82f6',
            endOfCycleAction: 'rollover' // typically rolls over
          };
          nextCategories.push(newSavings);
        }
      }

      if (hasChanges) {
        dispatch({ type: 'REPLACE_CATEGORIES', payload: nextCategories });
        toast.success(`Cycle ended! Applied rollovers and sweeps.`);
      }

      // Advance cycle anchor to the next period
      dispatch({
        type: 'SET_CYCLE_CONFIG',
        payload: { cycleStartDate: getNextCycleStart(cycleStartDate, cycleFrequency) }
      });
    }
  }, [cycleStartDate, cycleFrequency, categories, categorySpending, dispatch]);
}
