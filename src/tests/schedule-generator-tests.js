/**
 * Test script for Worker Schedule Generator
 */

const {
    generateSchedule,
    generateScheduleCircleMethod,
    formatSchedule,
    getScheduleStats
} = require('../scripts/schedule-generator.js');

/**
 * Comprehensive test function
 */
function testSchedule(numWorkers, useCircleMethod = false) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`TESTING WITH ${numWorkers} WORKERS`);
    console.log(`${'='.repeat(50)}`);
    
    try {
        const schedule = useCircleMethod
            ? generateScheduleCircleMethod(numWorkers)
            : generateSchedule(numWorkers);
        
        // Display the schedule
        const workerNames = Array.from({length: numWorkers}, (_, i) =>
            String.fromCharCode(65 + i) // A, B, C, ...
        );
        
        console.log(formatSchedule(schedule, workerNames));
        
        // Verify the schedule
        verifySchedule(schedule, numWorkers);
        
    } catch (error) {
        console.error(`❌ Error with ${numWorkers} workers:`, error.message);
    }
}

/**
 * Verify schedule meets all requirements
 */
function verifySchedule(schedule, originalWorkerCount) {
    console.log("\n--- VERIFICATION ---");
    
    const allPairs = new Set();
    const workerShifts = {};
    const allWorkers = new Set();
    
    // Initialize shift counts
    for (let i = 1; i <= originalWorkerCount; i++) {
        workerShifts[i] = 0;
        allWorkers.add(i);
    }
    
    let isValid = true;
    
    // Check each round
    schedule.forEach((round, roundIndex) => {
        const workersInRound = new Set();
        
        round.forEach(pair => {
            // Count shifts for real workers (not BYE)
            if (!pair.includes('BYE')) {
                workerShifts[pair[0]]++;
                workerShifts[pair[1]]++;
                
                // Track workers in this round
                workersInRound.add(pair[0]);
                workersInRound.add(pair[1]);
                
                // Check for duplicate pairs
                const sortedPair = [...pair].sort((a, b) => a - b);
                const pairKey = `${sortedPair[0]}-${sortedPair[1]}`;
                
                if (allPairs.has(pairKey)) {
                    console.error(`❌ Duplicate pair ${pairKey} in round ${roundIndex + 1}`);
                    isValid = false;
                }
                allPairs.add(pairKey);
            }
        });
        
        // For odd worker count, rounds may have different sizes
        if (originalWorkerCount % 2 === 0) {
            // Even count: all workers should appear exactly once per round
            if (workersInRound.size !== originalWorkerCount) {
                console.error(`❌ Round ${roundIndex + 1} doesn't include all workers`);
                isValid = false;
            }
        }
    });
    
    // Check if all workers have fair distribution of shifts
    const shiftCounts = Object.values(workerShifts);
    const minShifts = Math.min(...shiftCounts);
    const maxShifts = Math.max(...shiftCounts);
    
    if (maxShifts - minShifts > 1) {
        console.error(`❌ Unfair shift distribution: min=${minShifts}, max=${maxShifts}`);
        isValid = false;
    } else {
        console.log(`✅ Fair shift distribution: min=${minShifts}, max=${maxShifts}`);
    }
    
    // Check if we have all possible pairs
    const expectedPairs = originalWorkerCount * (originalWorkerCount - 1) / 2;
    if (allPairs.size === expectedPairs) {
        console.log(`✅ All ${expectedPairs} possible pairs are unique and complete`);
    } else {
        console.error(`❌ Missing pairs: expected ${expectedPairs}, got ${allPairs.size}`);
        isValid = false;
    }
    
    // Check no worker works consecutive rounds without break (for even counts)
    if (originalWorkerCount % 2 === 0) {
        const consecutiveWork = checkConsecutiveWork(schedule, originalWorkerCount);
        if (consecutiveWork.length > 0) {
            console.error(`❌ Workers working consecutive rounds:`, consecutiveWork);
            isValid = false;
        } else {
            console.log(`✅ No workers work consecutive rounds`);
        }
    }
    
    console.log(isValid ? "🎉 SCHEDULE VALIDATION PASSED" : "❌ SCHEDULE VALIDATION FAILED");
    return isValid;
}

/**
 * Check if any workers work consecutive rounds
 */
function checkConsecutiveWork(schedule, workerCount) {
    const lastRoundWorked = {};
    const consecutiveWorkers = [];
    
    for (let i = 1; i <= workerCount; i++) {
        lastRoundWorked[i] = -2; // Initialize to ensure first round doesn't flag
    }
    
    schedule.forEach((round, roundIndex) => {
        const roundWorkers = new Set(round.flat().filter(worker => typeof worker === 'number'));
        
        roundWorkers.forEach(worker => {
            if (lastRoundWorked[worker] === roundIndex - 1) {
                consecutiveWorkers.push({ worker: worker, rounds: [lastRoundWorked[worker], roundIndex] });
            }
            lastRoundWorked[worker] = roundIndex;
        });
    });
    
    return consecutiveWorkers;
}

/**
 * Run comprehensive tests
 */
function runAllTests() {
    console.log("WORKER SCHEDULE GENERATOR - COMPREHENSIVE TESTS");
    console.log("=".repeat(60));
    
    // Test even numbers
    [2, 4, 6, 8].forEach(count => {
        testSchedule(count);
    });
    
    // Test odd numbers
    [3, 5, 7].forEach(count => {
        testSchedule(count);
    });
    
    // Test edge cases
    console.log(`\n${'='.repeat(50)}`);
    console.log("EDGE CASE TESTS");
    console.log(`${'='.repeat(50)}`);
    
    // Test single worker (should error)
    try {
        generateSchedule(1);
        console.error("❌ Expected error for 1 worker");
    } catch (e) {
        console.log("✅ Correctly handled 1 worker:", e.message);
    }
    
    // Test very small odd number
    testSchedule(3, true); // Use circle method
    
    // Compare both algorithms
    console.log(`\n${'='.repeat(50)}`);
    console.log("ALGORITHM COMPARISON");
    console.log(`${'='.repeat(50)}`);
    
    const testCount = 6;
    const schedule1 = generateSchedule(testCount);
    const schedule2 = generateScheduleCircleMethod(testCount);
    
    console.log(`Standard method rounds: ${schedule1.length}`);
    console.log(`Circle method rounds: ${schedule2.length}`);
    
    const stats1 = getScheduleStats(schedule1);
    const stats2 = getScheduleStats(schedule2);
    
    console.log(`Standard method complete: ${stats1.isComplete}`);
    console.log(`Circle method complete: ${stats2.isComplete}`);
}

/**
 * Quick test for specific count
 */
function quickTest(numWorkers, useNames = true) {
    const schedule = generateSchedule(numWorkers);
    let workerNames = null;
    
    if (useNames) {
        workerNames = Array.from({length: numWorkers}, (_, i) =>
            String.fromCharCode(65 + i)
        );
    }
    
    console.log(formatSchedule(schedule, workerNames));
    
    const stats = getScheduleStats(schedule);
    console.log("\n--- STATISTICS ---");
    console.log(`Workers: ${stats.totalWorkers}`);
    console.log(`Rounds: ${stats.totalRounds}`);
    console.log(`Shifts per round: ${stats.shiftsPerRound}`);
    console.log(`Unique pairs: ${stats.totalUniquePairs}/${stats.expectedPairs}`);
    console.log(`Schedule complete: ${stats.isComplete ? '✅' : '❌'}`);
}

// Run tests if this file is executed directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // No arguments - run comprehensive tests
        runAllTests();
    } else if (args[0] === 'test') {
        // Run specific test
        const count = parseInt(args[1]) || 6;
        testSchedule(count);
    } else {
        // Quick generate for specific count
        const count = parseInt(args[0]);
        if (isNaN(count) || count < 2) {
            console.log("Usage: node test-schedule.js [worker_count|test]");
            console.log("Examples:");
            console.log("  node test-schedule.js          # Run all tests");
            console.log("  node test-schedule.js 6        # Generate schedule for 6 workers");
            console.log("  node test-schedule.js test 7   # Test with 7 workers");
        } else {
            quickTest(count);
        }
    }
}

module.exports = {
    testSchedule,
    verifySchedule,
    runAllTests,
    quickTest
};