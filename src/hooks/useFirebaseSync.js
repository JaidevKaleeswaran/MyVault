import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useBudget } from '../contexts/BudgetContext';

export function useFirebaseSync() {
  const { user } = useAuth();
  const {
    transactions,
    categories,
    incomeSources,
    cycleStartDate,
    cycleFrequency,
    dispatch
  } = useBudget();

  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimeoutRef = useRef(null);

  // 1. Fetch data when user logs in
  useEffect(() => {
    async function loadData() {
      if (!user || user.isGuest) {
        setIsHydrated(true); // Treat guest/no user as ready immediately
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid, 'budgetData', 'main');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          dispatch({ type: 'SET_FULL_STATE', payload: data });
        }
      } catch (error) {
        console.error("Error loading budget data from Firestore:", error);
      } finally {
        setIsHydrated(true);
      }
    }

    setIsHydrated(false);
    loadData();
  }, [user, dispatch]);

  // 2. Save data whenever budget state changes (debounced)
  useEffect(() => {
    // Don't save if we haven't loaded yet, or if there's no user/guest
    if (!isHydrated || !user || user.isGuest) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save by 1.5 seconds to avoid writing too frequently
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'budgetData', 'main');
        const stateToSave = {
          transactions,
          categories,
          incomeSources,
          cycleStartDate,
          cycleFrequency
        };
        await setDoc(docRef, stateToSave, { merge: true });
        console.log("Budget data synced to Firestore.");
      } catch (error) {
        console.error("Error syncing budget data to Firestore:", error);
      }
    }, 1500);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [
    transactions,
    categories,
    incomeSources,
    cycleStartDate,
    cycleFrequency,
    user,
    isHydrated
  ]);
}
