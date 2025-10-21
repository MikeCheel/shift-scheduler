/**
 * Worker Schedule Generator
 * Generates round-robin pairing schedules for any number of workers
 */

function generateSchedule(numWorkers) {
    if (numWorkers < 2) {
        throw new Error("Number of workers must be at least 2");
    }
    
    const isOdd = numWorkers % 2 !== 0;
    
    if (isOdd) {
        return generateScheduleWithFairByeRotation(numWorkers);
    } else {
        return generateScheduleCircleMethod(numWorkers);
    }
}

/**
 * Generates schedule with fair BYE rotation for odd number of workers
 * Ensures each worker gets exactly one break (paired with BYE once)
 * Uses backtracking algorithm to find complete schedule
 */
function generateScheduleWithFairByeRotation(numWorkers) {
    if (numWorkers < 3) {
        throw new Error("Number of workers must be at least 3 for fair BYE rotation");
    }
    
    const workers = Array.from({length: numWorkers}, (_, i) => i + 1);
    const totalRounds = numWorkers;
    const schedule = [];
    
    // Track which workers have been assigned BYE
    const byeAssignments = new Set();
    
    // Generate rounds with backtracking to ensure complete schedule
    for (let round = 0; round < totalRounds; round++) {
        const roundPairs = [];
        const usedWorkers = new Set();
        
        // Determine which worker gets BYE this round (fair rotation)
        let workerWithBye = null;
        for (let i = 0; i < workers.length; i++) {
            const candidate = workers[(round + i) % workers.length];
            if (!byeAssignments.has(candidate)) {
                workerWithBye = candidate;
                break;
            }
        }
        
        // If all workers have had BYE, reset and start over
        if (!workerWithBye) {
            byeAssignments.clear();
            workerWithBye = workers[round % workers.length];
        }
        
        // Mark this worker as having had BYE
        byeAssignments.add(workerWithBye);
        usedWorkers.add(workerWithBye);
        
        // Create pairs using backtracking approach
        const remainingWorkers = workers.filter(worker => !usedWorkers.has(worker));
        const pairs = findValidPairs(remainingWorkers, schedule);
        
        if (pairs) {
            roundPairs.push(...pairs);
        } else {
            // Fallback: use simple pairing if backtracking fails
            for (let i = 0; i < remainingWorkers.length; i += 2) {
                if (i + 1 < remainingWorkers.length) {
                    roundPairs.push([remainingWorkers[i], remainingWorkers[i + 1]]);
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
function findValidPairs(workers, schedule) {
    if (workers.length === 0) return [];
    if (workers.length === 1) return null; // Cannot pair single worker
    
    const worker1 = workers[0];
    
    for (let i = 1; i < workers.length; i++) {
        const worker2 = workers[i];
        
        // Check if this pair hasn't been used before
        const pairUsed = schedule.some(round =>
            round.some(pair =>
                (pair[0] === worker1 && pair[1] === worker2) ||
                (pair[0] === worker2 && pair[1] === worker1)
            )
        );
        
        if (!pairUsed) {
            const remaining = workers.filter((_, index) => index !== 0 && index !== i);
            const remainingPairs = findValidPairs(remaining, schedule);
            
            if (remainingPairs !== null) {
                return [[worker1, worker2], ...remainingPairs];
            }
        }
    }
    
    return null;
}

// Alternative implementation using circle rotation (often more readable)
function generateScheduleCircleMethod(numWorkers) {
    if (numWorkers < 2) {
        throw new Error("Number of workers must be at least 2");
    }
    
    let workers = Array.from({length: numWorkers}, (_, i) => i + 1);
    const isOdd = numWorkers % 2 !== 0;
    
    // For odd number, add BYE placeholder to make even pairing
    if (isOdd) {
        workers.push('BYE');
        numWorkers += 1;
    }
    
    const totalRounds = numWorkers - 1;
    const schedule = [];
    
    for (let round = 0; round < totalRounds; round++) {
        const roundPairs = [];
        
        // Create pairs by matching opposite positions in the array
        for (let i = 0; i < numWorkers / 2; i++) {
            roundPairs.push([workers[i], workers[numWorkers - 1 - i]]);
        }
        
        // Remove BYE pairs - worker paired with BYE gets a break
        const filteredPairs = roundPairs.filter(pair => !pair.includes('BYE'));
        schedule.push(filteredPairs);
        
        // Rotate all except first element
        const fixed = workers[0];
        const rotated = [fixed, workers[numWorkers - 1], ...workers.slice(1, numWorkers - 1)];
        workers = rotated;
    }
    
    return schedule;
}

/**
 * Formats and returns a readable schedule
 */
function formatSchedule(schedule, workerNames = null) {
    if (workerNames && workerNames.length !== Math.max(...schedule.flat(2).filter(x => typeof x === 'number'))) {
        console.warn("Worker names count doesn't match schedule");
        workerNames = null;
    }
    
    const result = [];
    result.push("=== WORKER SCHEDULE ===");
    result.push("");
    
    schedule.forEach((round, roundIndex) => {
        result.push(`Round ${roundIndex + 1}:`);
        round.forEach((pair, pairIndex) => {
            const pairNames = pair.map(worker =>
                workerNames ? (worker === 'BYE' ? 'BYE' : workerNames[worker - 1]) : `Worker ${worker}`
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
    const workerShifts = {};
    
    // Get all worker numbers from schedule
    const allWorkers = [...new Set(schedule.flat(2).filter(x => typeof x === 'number'))];
    allWorkers.forEach(worker => { workerShifts[worker] = 0; });
    
    // Count pairs and shifts
    schedule.forEach(round => {
        round.forEach(pair => {
            if (!pair.includes('BYE')) {
                const sortedPair = [...pair].sort((a, b) => a - b);
                allPairs.add(`${sortedPair[0]}-${sortedPair[1]}`);
                
                workerShifts[pair[0]]++;
                workerShifts[pair[1]]++;
            }
        });
    });
    
    const totalRounds = schedule.length;
    const shiftsPerRound = schedule[0] ? schedule[0].length : 0;
    const totalWorkers = allWorkers.length;
    
    return {
        totalWorkers,
        totalRounds,
        shiftsPerRound,
        totalUniquePairs: allPairs.size,
        expectedPairs: totalWorkers * (totalWorkers - 1) / 2,
        workerShifts,
        isComplete: allPairs.size === totalWorkers * (totalWorkers - 1) / 2
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