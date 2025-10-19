/**
 * Test script for Employee Schedule Generator
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
function testSchedule(numEmployees, useCircleMethod = false) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`TESTING WITH ${numEmployees} EMPLOYEES`);
    console.log(`${'='.repeat(50)}`);
    
    try {
        const schedule = useCircleMethod 
            ? generateScheduleCircleMethod(numEmployees)
            : generateSchedule(numEmployees);
        
        // Display the schedule
        const employeeNames = Array.from({length: numEmployees}, (_, i) => 
            String.fromCharCode(65 + i) // A, B, C, ...
        );
        
        console.log(formatSchedule(schedule, employeeNames));
        
        // Verify the schedule
        verifySchedule(schedule, numEmployees);
        
    } catch (error) {
        console.error(`❌ Error with ${numEmployees} employees:`, error.message);
    }
}

/**
 * Verify schedule meets all requirements
 */
function verifySchedule(schedule, originalEmployeeCount) {
    console.log("\n--- VERIFICATION ---");
    
    const allPairs = new Set();
    const employeeShifts = {};
    const allEmployees = new Set();
    
    // Initialize shift counts
    for (let i = 1; i <= originalEmployeeCount; i++) {
        employeeShifts[i] = 0;
        allEmployees.add(i);
    }
    
    let isValid = true;
    
    // Check each round
    schedule.forEach((round, roundIndex) => {
        const employeesInRound = new Set();
        
        round.forEach(pair => {
            // Count shifts for real employees (not BYE)
            if (!pair.includes('BYE')) {
                employeeShifts[pair[0]]++;
                employeeShifts[pair[1]]++;
                
                // Track employees in this round
                employeesInRound.add(pair[0]);
                employeesInRound.add(pair[1]);
                
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
        
        // For odd employee count, rounds may have different sizes
        if (originalEmployeeCount % 2 === 0) {
            // Even count: all employees should appear exactly once per round
            if (employeesInRound.size !== originalEmployeeCount) {
                console.error(`❌ Round ${roundIndex + 1} doesn't include all employees`);
                isValid = false;
            }
        }
    });
    
    // Check if all employees have fair distribution of shifts
    const shiftCounts = Object.values(employeeShifts);
    const minShifts = Math.min(...shiftCounts);
    const maxShifts = Math.max(...shiftCounts);
    
    if (maxShifts - minShifts > 1) {
        console.error(`❌ Unfair shift distribution: min=${minShifts}, max=${maxShifts}`);
        isValid = false;
    } else {
        console.log(`✅ Fair shift distribution: min=${minShifts}, max=${maxShifts}`);
    }
    
    // Check if we have all possible pairs
    const expectedPairs = originalEmployeeCount * (originalEmployeeCount - 1) / 2;
    if (allPairs.size === expectedPairs) {
        console.log(`✅ All ${expectedPairs} possible pairs are unique and complete`);
    } else {
        console.error(`❌ Missing pairs: expected ${expectedPairs}, got ${allPairs.size}`);
        isValid = false;
    }
    
    // Check no employee works consecutive rounds without break (for even counts)
    if (originalEmployeeCount % 2 === 0) {
        const consecutiveWork = checkConsecutiveWork(schedule, originalEmployeeCount);
        if (consecutiveWork.length > 0) {
            console.error(`❌ Employees working consecutive rounds:`, consecutiveWork);
            isValid = false;
        } else {
            console.log(`✅ No employees work consecutive rounds`);
        }
    }
    
    console.log(isValid ? "🎉 SCHEDULE VALIDATION PASSED" : "❌ SCHEDULE VALIDATION FAILED");
    return isValid;
}

/**
 * Check if any employees work consecutive rounds
 */
function checkConsecutiveWork(schedule, employeeCount) {
    const lastRoundWorked = {};
    const consecutiveWorkers = [];
    
    for (let i = 1; i <= employeeCount; i++) {
        lastRoundWorked[i] = -2; // Initialize to ensure first round doesn't flag
    }
    
    schedule.forEach((round, roundIndex) => {
        const roundEmployees = new Set(round.flat().filter(emp => typeof emp === 'number'));
        
        roundEmployees.forEach(emp => {
            if (lastRoundWorked[emp] === roundIndex - 1) {
                consecutiveWorkers.push({ employee: emp, rounds: [lastRoundWorked[emp], roundIndex] });
            }
            lastRoundWorked[emp] = roundIndex;
        });
    });
    
    return consecutiveWorkers;
}

/**
 * Run comprehensive tests
 */
function runAllTests() {
    console.log("EMPLOYEE SCHEDULE GENERATOR - COMPREHENSIVE TESTS");
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
    
    // Test single employee (should error)
    try {
        generateSchedule(1);
        console.error("❌ Expected error for 1 employee");
    } catch (e) {
        console.log("✅ Correctly handled 1 employee:", e.message);
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
function quickTest(numEmployees, useNames = true) {
    const schedule = generateSchedule(numEmployees);
    let employeeNames = null;
    
    if (useNames) {
        employeeNames = Array.from({length: numEmployees}, (_, i) => 
            String.fromCharCode(65 + i)
        );
    }
    
    console.log(formatSchedule(schedule, employeeNames));
    
    const stats = getScheduleStats(schedule);
    console.log("\n--- STATISTICS ---");
    console.log(`Employees: ${stats.totalEmployees}`);
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
            console.log("Usage: node test-schedule.js [employee_count|test]");
            console.log("Examples:");
            console.log("  node test-schedule.js          # Run all tests");
            console.log("  node test-schedule.js 6        # Generate schedule for 6 employees");
            console.log("  node test-schedule.js test 7   # Test with 7 employees");
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