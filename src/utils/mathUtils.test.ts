import { describe, it, expect } from 'vitest';
import { roundTwo, nCr, calculateMaxNetProfit } from './mathUtils';

describe('mathUtils', () => {
    describe('roundTwo', () => {
        it('should round to two decimal places', () => {
            expect(roundTwo(10.1234)).toBe(10.12);
            expect(roundTwo(10.125)).toBe(10.13);
            expect(roundTwo(10.1)).toBe(10.1);
            expect(roundTwo(10)).toBe(10);
        });
    });

    describe('nCr', () => {
        it('should calculate combinations correctly', () => {
            expect(nCr(5, 2)).toBe(10);
            expect(nCr(10, 3)).toBe(120);
            expect(nCr(5, 0)).toBe(1);
            expect(nCr(5, 5)).toBe(1);
            expect(nCr(5, 6)).toBe(0);
        });
    });

    describe('calculateMaxNetProfit', () => {
        it('should calculate profit correctly for a known case', () => {
            // Basic check: startCapital 1000, n=14, k=5, p=3.0
            // This is the default config in the app
            const profit = calculateMaxNetProfit(1000, 14, 5, 3.0);
            expect(profit).toBeGreaterThan(0);
            expect(roundTwo(profit)).toBe(906.58); // Correct value for n=14, k=5, p=3.0
        });
    });
});
