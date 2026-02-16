
import { calculateMaxNetProfit } from './src/utils/mathUtils';

// Scenario 1: Standard
console.log('--- Scenario 1: Standard ---');
console.log(calculateMaxNetProfit(100, 3, 2, 2.0));

// Scenario 2: Zero Profit (Quota too low?)
console.log('--- Scenario 2: Quota 1.0 ---');
console.log(calculateMaxNetProfit(100, 3, 2, 1.0));

// Scenario 3: Max Consecutive Losses (m)
console.log('--- Scenario 3: Max Consecutive Losses = 2 ---');
// n=3, k=2, q=2.0, m=2
console.log(calculateMaxNetProfit(100, 3, 2, 2.0, 2));

// Scenario 4: Max Consecutive Losses = 0 (Default?)
console.log('--- Scenario 4: Max Consecutive Losses = 0 ---');
console.log(calculateMaxNetProfit(100, 3, 2, 2.0, 0));

// Scenario 5: Missing params (undefined)
// Note: TS would catch this but runtime might not if passed from 'any'
console.log('--- Scenario 5: Quota undefined (simulated as 0) ---');
console.log(calculateMaxNetProfit(100, 3, 2, 0 as any));
