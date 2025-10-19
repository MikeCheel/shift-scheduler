/**
 * Employee Schedule Generator
 * Generates round-robin pairing schedules for any number of employees
 */

function generateSchedule(numEmployees) {
    if (numEmployees < 2) {
        throw new Error("Number of employees must be at least 2");
    }
    
    const employees = Array.from({length: numEmployees}, (_, i) => i + 1);
    const isOdd = numEmployees % 2 !== 0;
    
    // For odd number, add a "dummy" employee to make even
    if (isOdd) {
        employees.push('BYE'); // BYE represents no shift
        numEmployees += 1;
    }
    
    const totalRounds = numEmployees - 1;
    const shiftsPerRound = numEmployees / 2;
    const schedule = [];
    
    // Generate rounds using standard round-robin algorithm
    for (let round = 0; round < totalRounds; round++) {
        const roundPairs = [];
        
        // First pair: fixed employee with last in rotated list
        roundPairs.push([employees[0], employees[numEmployees - 1]]);
        
        // Remaining pairs
        for (let i = 1; i < shiftsPerRound; i++) {
            const firstIndex = 1 + ((round + i - 1) % (numEmployees - 1));
            const secondIndex = 1 + ((round + numEmployees - 2 - i) % (numEmployees - 1));
            
            roundPairs.push([employees[firstIndex], employees[secondIndex]]);
        }
        
        // Filter out BYE pairs for odd employee count
        if (isOdd) {
            const filteredPairs = roundPairs.filter(pair => 
                !pair.includes('BYE')
            );
            schedule.push(filteredPairs);
        } else {
            schedule.push(roundPairs);
        }
    }
    
    return schedule;
}

// Alternative implementation using circle rotation (often more readable)
function generateScheduleCircleMethod(numEmployees) {
    if (numEmployees < 2) {
        throw new Error("Number of employees must be at least 2");
    }
    
    let employees = Array.from({length: numEmployees}, (_, i) => i + 1);
    const isOdd = numEmployees % 2 !== 0;
    
    // For odd number, add a "BYE" to make even
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
        
        // Filter out BYE pairs for odd employee count and store
        if (isOdd) {
            const filteredPairs = roundPairs.filter(pair => 
                !pair.includes('BYE')
            );
            schedule.push(filteredPairs);
        } else {
            schedule.push(roundPairs);
        }
        
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