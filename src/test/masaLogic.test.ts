import { describe, it, expect } from 'vitest';
import { calculateStake, getRescueSuggestion } from '../utils/masaLogic';

describe('Masaniello Logic Tests', () => {
    it('should calculate stake 0 if no wins are needed', () => {
        const stake = calculateStake(1000, 10, 0, 2.0, 1200);
        expect(stake).toBe(0);
    });

    it('should calculate stake 0 if more wins needed than events left', () => {
        const stake = calculateStake(1000, 5, 6, 2.0, 1200);
        expect(stake).toBe(0);
    });

    it('should calculate a positive stake for a standard plan', () => {
        // Example: 1000 capital, 13 events, 3 wins, quota 3.0, target ~1161 (standard start)
        const stake = calculateStake(1000, 13, 3, 3.0, 1161.08);
        expect(stake).toBeGreaterThan(0);
        expect(stake).toBeLessThan(1000);
    });

    it('should handle the "must win all" case correctly', () => {
        // If we need 1 win in 1 event to reach 1000, and quota is 2.0, stake should be 500 if we have 500.
        // Wait, if target is 1000 and we have 500, we need to win 500 * (2.0-1) = 500.
        const stake = calculateStake(500, 1, 1, 2.0, 1000);
        expect(stake).toBeCloseTo(500, 1);
    });

    it('should NOT return stake 0 in the critical situation (User Case)', () => {
        // User saw stake 0 in a situation that should be reachable.
        // Let's simulate a plan that is in loss but still has wins.
        // Capital 1000, 12 events left, 3 wins left, quota 3.0, target 1161.08
        const stake = calculateStake(1000, 12, 3, 3.0, 1161.08);
        expect(stake).toBeGreaterThan(0);
    });

    it('should handle string inputs gracefully', () => {
        // @ts-expect-error
        const stake = calculateStake("1000", "13", "3", "3.0", "1161.08");
        expect(stake).toBeGreaterThan(0);
    });
});

describe('Rescue Suggestion Tests', () => {
    it('should suggest rescue if matches criterion (70% errors)', () => {
        const plan = {
            startCapital: 1000,
            currentCapital: 800,
            quota: 2.0,
            totalEvents: 10,
            expectedWins: 5,
            remainingEvents: 4,
            remainingWins: 3, // Already 4 errors out of 5 allowed. 4/5 = 80%.
            isRescued: false
        };
        const suggestion = getRescueSuggestion(plan);
        expect(suggestion).not.toBeNull();
        expect(suggestion?.eventsToAdd).toBeGreaterThanOrEqual(0);
        expect(suggestion?.winsToAdd).toBeGreaterThanOrEqual(0);
    });

    it('should suggest rescue if wins are exhausted but capital is low', () => {
        const plan = {
            startCapital: 1000,
            currentCapital: 600,
            quota: 2.0,
            totalEvents: 10,
            expectedWins: 3,
            remainingEvents: 5,
            remainingWins: 0,
            isRescued: true
        };
        const suggestion = getRescueSuggestion(plan);
        expect(suggestion).not.toBeNull();
        expect(suggestion?.winsToAdd).toBeGreaterThan(0);
    });

    it('should NOT suggest rescue if plan is healthy', () => {
        const plan = {
            startCapital: 1000,
            currentCapital: 1000,
            quota: 2.0,
            totalEvents: 10,
            expectedWins: 5,
            remainingEvents: 10,
            remainingWins: 5,
            isRescued: false
        };
        const suggestion = getRescueSuggestion(plan);
        expect(suggestion).toBeNull();
    });
});
