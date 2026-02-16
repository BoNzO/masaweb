
import { calculateMaxNetProfit } from './src/utils/mathUtils';

// Mock simple case: 100 capital, 3 events, 2 wins, quota 2.0
// Masaniello classic: 2/3 wins @ 2.0
// 2 wins of 3 events.
const profit = calculateMaxNetProfit(100, 3, 2, 2.0);
console.log(`Profit (100, 3, 2, 2.0): ${profit}`);

// User case from screenshot? 
// 23 events, 5 wins, quota 3.0?
// Need to match the screenshot or a realistic scenario.
const profitUser = calculateMaxNetProfit(100, 23, 5, 3.0);
console.log(`Profit (100, 23, 5, 3.0): ${profitUser}`);

// Check for 0 result
const profitZero = calculateMaxNetProfit(100, 10, 0, 1.5);
console.log(`Profit (100, 10, 0, 1.5): ${profitZero}`);
