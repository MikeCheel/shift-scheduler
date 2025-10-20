/**
 * Employee Schedule Generator
 * Generates round-robin pairing schedules for any number of employees
 */

function generateSchedule(numEmployees) {
    if (numEmployees < 2) {
        throw new Error("Number of employees must be at least 2");
    }
    
    const isOdd = numEmployees % 2 !== 0;
    
    if (isOdd) {
        return generateScheduleWithFairByeRotation(numEmployees);
    } else {
        return generateScheduleCircleMethod(numEmployees);
    }
}

/**
 * Generates schedule with fair BYE rotation for odd number of employees
 * Ensures each employee gets exactly one break (paired with BYE once)
 * Uses backtracking algorithm to find complete schedule
 */
function generateScheduleWithFairByeRotation(numEmployees) {
    if (numEmployees < 3) {
        throw new Error("Number of employees must be at least 3 for fair BYE rotation");
    }
    
    const employees = Array.from({length: numEmployees}, (_, i) => i + 1);
    const totalRounds = numEmployees;
    const schedule = [];
    
    // Track which employees have been assigned BYE
    const byeAssignments = new Set();
    
    // Generate rounds with backtracking to ensure complete schedule
    for (let round = 0; round < totalRounds; round++) {
        const roundPairs = [];
        const usedEmployees = new Set();
        
        // Determine which employee gets BYE this round (fair rotation)
        let employeeWithBye = null;
        for (let i = 0; i < employees.length; i++) {
            const candidate = employees[(round + i) % employees.length];
            if (!byeAssignments.has(candidate)) {
                employeeWithBye = candidate;
                break;
            }
        }
        
        // If all employees have had BYE, reset and start over
        if (!employeeWithBye) {
            byeAssignments.clear();
            employeeWithBye = employees[round % employees.length];
        }
        
        // Mark this employee as having had BYE
        byeAssignments.add(employeeWithBye);
        usedEmployees.add(employeeWithBye);
        
        // Create pairs using backtracking approach
        const remainingEmployees = employees.filter(emp => !usedEmployees.has(emp));
        const pairs = findValidPairs(remainingEmployees, schedule);
        
        if (pairs) {
            roundPairs.push(...pairs);
        } else {
            // Fallback: use simple pairing if backtracking fails
            for (let i = 0; i < remainingEmployees.length; i += 2) {
                if (i + 1 < remainingEmployees.length) {
                    roundPairs.push([remainingEmployees[i], remainingEmployees[i + 1]]);
                }
            }
        }
        
        schedule.push(roundPairs);
    }
    
    return schedule;
}

/**
 * Helper function to find valid pairs using backtracking
 */
function findValidPairs(employees, schedule) {
    if (employees.length === 0) return [];
    if (employees.length === 1) return null; // Cannot pair single employee
    
    const emp1 = employees[0];
    
    for (let i = 1; i < employees.length; i++) {
        const emp2 = employees[i];
        
        // Check if this pair hasn't been used before
        const pairUsed = schedule.some(round =>
            round.some(pair =>
                (pair[0] === emp1 && pair[1] === emp2) ||
                (pair[0] === emp2 && pair[1] === emp1)
            )
        );
        
        if (!pairUsed) {
            const remaining = employees.filter((_, index) => index !== 0 && index !== i);
            const remainingPairs = findValidPairs(remaining, schedule);
            
            if (remainingPairs !== null) {
                return [[emp1, emp2], ...remainingPairs];
            }
        }
    }
    
    return null;
}

// Alternative implementation using circle rotation (often more readable)
function generateScheduleCircleMethod(numEmployees) {
    if (numEmployees < 2) {
        throw new Error("Number of employees must be at least 2");
    }
    
    let employees = Array.from({length: numEmployees}, (_, i) => i + 1);
    const isOdd = numEmployees % 2 !== 0;
    
    // For odd number, add BYE placeholder to make even pairing
    if (isOdd) {
        employees.push('BYE');
        numEmployees += 1;
    }
    
    const totalRounds = numEmployees - 1;
    const schedule = [];
    
    for (let round = 0; round < totalRounds; round++) {
        const roundPairs = [];
        
        // Create pairs by matching opposite positions in the array
        for (let i = 0; i < numEmployees / 2; i++) {
            roundPairs.push([employees[i], employees[numEmployees - 1 - i]]);
        }
        
        // Remove BYE pairs - employee paired with BYE gets a break
        const filteredPairs = roundPairs.filter(pair => !pair.includes('BYE'));
        schedule.push(filteredPairs);
        
        // Rotate all except first element
        const fixed = employees[0];
        const rotated = [fixed, employees[numEmployees - 1], ...employees.slice(1, numEmployees - 1)];
        employees = rotated;
    }
    
    return schedule;
}

/**
 * Formats and returns a readable schedule
 */
function formatSchedule(schedule, employeeNames = null) {
    if (employeeNames && employeeNames.length !== Math.max(...schedule.flat(2).filter(x => typeof x === 'number'))) {
        console.warn("Employee names count doesn't match schedule");
        employeeNames = null;
    }
    
    const result = [];
    result.push("=== EMPLOYEE SCHEDULE ===");
    result.push("");
    
    schedule.forEach((round, roundIndex) => {
        result.push(`Round ${roundIndex + 1}:`);
        round.forEach((pair, pairIndex) => {
            const pairNames = pair.map(emp => 
                employeeNames ? (emp === 'BYE' ? 'BYE' : employeeNames[emp - 1]) : `Employee ${emp}`
            );
            result.push(`  Shift ${pairIndex + 1}: ${pairNames[0]} & ${pairNames[1]}`);
        });
        result.push('');
    });
    
    return result.join('\n');
}

/**
 * Returns schedule statistics
 */
function getScheduleStats(schedule) {
    const allPairs = new Set();
    const employeeShifts = {};
    
    // Get all employee numbers from schedule
    const allEmployees = [...new Set(schedule.flat(2).filter(x => typeof x === 'number'))];
    allEmployees.forEach(emp => { employeeShifts[emp] = 0; });
    
    // Count pairs and shifts
    schedule.forEach(round => {
        round.forEach(pair => {
            if (!pair.includes('BYE')) {
                const sortedPair = [...pair].sort((a, b) => a - b);
                allPairs.add(`${sortedPair[0]}-${sortedPair[1]}`);
                
                employeeShifts[pair[0]]++;
                employeeShifts[pair[1]]++;
            }
        });
    });
    
    const totalRounds = schedule.length;
    const shiftsPerRound = schedule[0] ? schedule[0].length : 0;
    const totalEmployees = allEmployees.length;
    
    return {
        totalEmployees,
        totalRounds,
        shiftsPerRound,
        totalUniquePairs: allPairs.size,
        expectedPairs: totalEmployees * (totalEmployees - 1) / 2,
        employeeShifts,
        isComplete: allPairs.size === totalEmployees * (totalEmployees - 1) / 2
    };
}

// Export for use in Node.js or browsers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateSchedule,
        generateScheduleCircleMethod,
        formatSchedule,
        getScheduleStats
    };
}