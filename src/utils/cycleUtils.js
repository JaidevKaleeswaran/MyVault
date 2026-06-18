export function frequencyToDays(frequency) {
  switch (frequency) {
    case 'weekly':
      return 7;
    case 'bi-weekly':
      return 14;
    case 'monthly':
      return 30; // Approximation for monthly cycle
    case 'one-time':
      return 0; // Does not have a cycle
    default:
      return 30;
  }
}

export function normalizeToMasterCycle(amount, sourceFreq, masterFreq) {
  if (sourceFreq === 'one-time') return amount; // One-time amounts are just added as-is for the active cycle

  const sourceDays = frequencyToDays(sourceFreq);
  const masterDays = frequencyToDays(masterFreq);

  if (sourceDays === 0) return amount; // Safety

  // e.g., weekly (7) to monthly (30) => amount * (30/7)
  return amount * (masterDays / sourceDays);
}

export function getCycleWindow(cycleStartDateStr, cycleFrequency) {
  if (!cycleStartDateStr) {
    // Fallback: window covers from the beginning of today for the given frequency
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    const end = new Date(now);
    end.setDate(end.getDate() + frequencyToDays(cycleFrequency));
    return { start, end };
  }

  const start = new Date(cycleStartDateStr);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(end.getDate() + frequencyToDays(cycleFrequency));
  
  return { start, end };
}

export function isWithinCycle(transactionDateStr, cycleWindow) {
  const txDate = new Date(transactionDateStr);
  return txDate >= cycleWindow.start && txDate < cycleWindow.end;
}

export function getNextCycleStart(currentStartStr, frequency) {
  const currentStart = currentStartStr ? new Date(currentStartStr) : new Date();
  currentStart.setHours(0, 0, 0, 0);
  
  const nextStart = new Date(currentStart);
  nextStart.setDate(nextStart.getDate() + frequencyToDays(frequency));
  return nextStart.toISOString();
}
