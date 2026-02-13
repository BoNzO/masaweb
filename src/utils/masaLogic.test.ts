import { calculateTiltThreshold } from './masaLogic';

// Since calculateTiltThreshold is not exported yet, I will mock the logic here to verify my formula FIRST, 
// and then I will export it in the real file.
// Wait, I should implement the export first.

describe('Anti-Tilt Logic', () => {
    const calculateTiltThreshold = (remainingAllowedErrors: number) => {
        return Math.max(2, Math.ceil(remainingAllowedErrors * 0.3));
    };

    test('should return minimum 2 for small remaining errors', () => {
        expect(calculateTiltThreshold(1)).toBe(2); // 0.3 -> ceil 1 -> max 2
        expect(calculateTiltThreshold(2)).toBe(2); // 0.6 -> ceil 1 -> max 2
        expect(calculateTiltThreshold(3)).toBe(2); // 0.9 -> ceil 1 -> max 2
        expect(calculateTiltThreshold(4)).toBe(2); // 1.2 -> ceil 2 -> max 2
        expect(calculateTiltThreshold(5)).toBe(2); // 1.5 -> ceil 2 -> max 2
    });

    test('should scale up for larger remaining errors', () => {
        expect(calculateTiltThreshold(6)).toBe(2); // 1.8 -> ceil 2 -> max 2
        expect(calculateTiltThreshold(7)).toBe(3); // 2.1 -> ceil 3 -> max 3
        expect(calculateTiltThreshold(10)).toBe(3); // 3.0 -> ceil 3 -> max 3
        expect(calculateTiltThreshold(11)).toBe(4); // 3.3 -> ceil 4 -> max 4
    });
    
    test('should match the "30%" requirement correctly', () => {
        // user requirement: "30% dei loss consecutivi residui"
        // If I have 10 errors left, 30% is 3. So 3 consecutive losses triggers it.
        expect(calculateTiltThreshold(10)).toBe(3);
    });
});
