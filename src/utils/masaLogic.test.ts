import { describe, test, expect } from 'vitest';
import { calculateTiltThreshold } from './masaLogic';

describe('Anti-Tilt Logic', () => {
    // Adapter to test with simple remainingErrors count
    const getThreshold = (remainingErrors: number) => {
        // totalEvents: 100, expectedWins: 90 => totalErrors: 10
        // If remainingErrors: 10 => remainingEvents: 100, remainingWins: 90
        // If remainingErrors: 5 => remainingEvents: 95, remainingWins: 90
        return calculateTiltThreshold(100, 90, 90 + remainingErrors, 90);
    };

    test('should return minimum 2 for small remaining errors', () => {
        expect(getThreshold(1)).toBe(2); // 0.3 -> ceil 1 -> max 2
        expect(getThreshold(2)).toBe(2); // 0.6 -> ceil 1 -> max 2
        expect(getThreshold(3)).toBe(2); // 0.9 -> ceil 1 -> max 2
        expect(getThreshold(4)).toBe(2); // 1.2 -> ceil 2 -> max 2
        expect(getThreshold(5)).toBe(2); // 1.5 -> ceil 2 -> max 2
    });

    test('should scale up for larger remaining errors', () => {
        expect(getThreshold(7)).toBe(3); // 2.1 -> ceil 3 -> max 3
        expect(getThreshold(10)).toBe(3); // 3.0 -> ceil 3 -> max 3
        expect(getThreshold(20)).toBe(6); // 6.0 -> ceil 6 -> max 6
        expect(getThreshold(30)).toBe(9); // 9.0 -> ceil 9 -> max 9
    });

    test('should match the "30%" requirement correctly', () => {
        // If I have 10 errors left, 30% is 3.
        expect(getThreshold(10)).toBe(3);
    });
});
