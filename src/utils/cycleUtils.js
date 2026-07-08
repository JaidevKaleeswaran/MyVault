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

function parseLocalDate(dateStr) {
  if (!dateStr) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getCycleWindow(cycleStartDateStr, cycleFrequency) {
  const start = parseLocalDate(cycleStartDateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + frequencyToDays(cycleFrequency));
  return { start, end };
}

export function isWithinCycle(transactionDateStr, cycleWindow) {
  const txDate = parseLocalDate(transactionDateStr);
  return txDate >= cycleWindow.start && txDate < cycleWindow.end;
}

export function getNextCycleStart(currentStartStr, frequency) {
  const currentStart = parseLocalDate(currentStartStr);
  const nextStart = new Date(currentStart);
  nextStart.setDate(nextStart.getDate() + frequencyToDays(frequency));
  
  const yyyy = nextStart.getFullYear();
  const mm = String(nextStart.getMonth() + 1).padStart(2, '0');
  const dd = String(nextStart.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
