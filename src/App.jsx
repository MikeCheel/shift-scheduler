import React, { useState, useEffect } from 'react';

const ShiftScheduler = () => {
  const [employees, setEmployees] = useState([
    'Member A', 'Member B', 'Member C', 'Member D', 
    'Member E', 'Member F', 'Wildcard'
  ]);
  const [schedule, setSchedule] = useState([]);
  const [currentDay, setCurrentDay] = useState(1);

  const generateSchedule = () => {
    // Filter out empty names and get active employees
    const activeEmployees = employees.filter(emp => emp.trim() !== '');
    
    // Need at least 2 people total to create a schedule
    if (activeEmployees.length < 2) {
      alert('Please enter at least 2 member names to generate a schedule.');
      return;
    }
    
    // Determine if we have a wildcard (need at least 3 total members for wildcard)
    const hasWildcard = activeEmployees.length >= 3;
    const wildcard = hasWildcard ? activeEmployees[activeEmployees.length - 1] : null;
    const regularEmployees = hasWildcard ? activeEmployees.slice(0, -1) : activeEmployees;
    
    // For 2 total members, both are regular (no wildcard)
    // For 3+ members, last one is wildcard
    if (!hasWildcard && regularEmployees.length === 2) {
      // With only 2 people total, they'll alternate but no wildcard relief
      console.log('Creating schedule with 2 members - no wildcard available for relief');
    }
    
    const schedule = [];
    
    // Track shift counts for each regular employee
    const shiftCounts = {};
    regularEmployees.forEach(emp => shiftCounts[emp] = 0);
    
    // Track pairings with rounds - each person must pair with everyone before repeating
    const pairingRounds = [];
    let currentRound = new Set();
    pairingRounds.push(currentRound);
    
    // Track who worked last shift to avoid consecutive shifts
    let lastShiftWorkers = new Set();
    
    // Helper function to create a pairing key
    const getPairingKey = (person1, person2) => {
      return [person1, person2].sort().join('-');
    };
    
    // Helper function to check if a pairing has been used in current round
    const isPairingUsedInCurrentRound = (person1, person2) => {
      const key = getPairingKey(person1, person2);
      return currentRound.has(key);
    };
    
    // Helper function to check if an employee has paired with everyone in current round
    const hasEmployeePairedWithEveryone = (employee, availableEmployees) => {
      const otherEmployees = availableEmployees.filter(emp => emp !== employee);
      for (const other of otherEmployees) {
        const key = getPairingKey(employee, other);
        if (!currentRound.has(key)) {
          return false;
        }
      }
      return true;
    };
    
    // Helper function to start a new round when current round is complete
    const startNewRoundIfNeeded = () => {
      // Check if current round is complete (everyone has paired with everyone they can)
      const totalPossiblePairings = (regularEmployees.length * (regularEmployees.length - 1)) / 2;
      if (currentRound.size >= totalPossiblePairings * 0.8) { // Allow some flexibility
        currentRound = new Set();
        pairingRounds.push(currentRound);
      }
    };
    
    // Helper function to find best pairing for balance and round-robin
    const findBestPairForBalance = (availableEmployees) => {
      let bestPair = null;
      let bestBalanceScore = Infinity;
      
      // Get current shift counts and find employees with minimum shifts
      const shiftValues = Object.values(shiftCounts);
      const minShifts = Math.min(...shiftValues);
      const maxShifts = Math.max(...shiftValues);
      const currentImbalance = maxShifts - minShifts;
      
      // Find employees with minimum shifts who are available
      const minShiftEmployees = availableEmployees.filter(emp => shiftCounts[emp] === minShifts);
      const wildcardAvailable = hasWildcard && wildcard && !lastShiftWorkers.has(wildcard);
      
      // Special case: With only 2 regular members, wildcard should be used frequently for relief
      if (regularEmployees.length === 2 && hasWildcard) {
        const wildcardUsageCount = schedule.filter(s => s.isWildcardUsed).length;
        const totalShifts = schedule.length;
        const wildcardUsageRate = totalShifts > 0 ? wildcardUsageCount / totalShifts : 0;
        
        // With only 2 regulars, aim for ~40% wildcard usage to prevent same pair every time
        if (wildcardAvailable && wildcardUsageRate < 0.4 && totalShifts > 0) {
          // Use wildcard with the member who has more shifts
          const member1Shifts = shiftCounts[regularEmployees[0]] || 0;
          const member2Shifts = shiftCounts[regularEmployees[1]] || 0;
          const memberWithMoreShifts = member1Shifts >= member2Shifts ? regularEmployees[0] : regularEmployees[1];
          
          if (availableEmployees.includes(memberWithMoreShifts) && !isPairingUsedInCurrentRound(memberWithMoreShifts, wildcard)) {
            return [memberWithMoreShifts, wildcard];
          }
          
          // If preferred member not available, try the other
          const otherMember = memberWithMoreShifts === regularEmployees[0] ? regularEmployees[1] : regularEmployees[0];
          if (availableEmployees.includes(otherMember) && !isPairingUsedInCurrentRound(otherMember, wildcard)) {
            return [otherMember, wildcard];
          }
        }
      }
      
      // Count current pairing frequencies to ensure round-robin fairness
      const pairCounts = {};
      schedule.forEach(shift => {
        const key = shift.shift.sort().join('-');
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      });
      
      // Find the minimum and maximum pairing frequencies
      const pairFrequencies = Object.values(pairCounts);
      const minPairFreq = pairFrequencies.length > 0 ? Math.min(...pairFrequencies) : 0;
      const maxPairFreq = pairFrequencies.length > 0 ? Math.max(...pairFrequencies) : 0;
      const pairImbalance = maxPairFreq - minPairFreq;
      
      // PRIORITY 1: Use wildcard strategically when imbalance is getting large
      const totalShifts = schedule.length;
      const wildcardUsageCount = schedule.filter(s => s.isWildcardUsed).length;
      
      // Use wildcard more aggressively when there's significant imbalance
      const shouldUseWildcardForBalance = hasWildcard && wildcardAvailable && 
                                         (currentImbalance >= 1 || pairImbalance >= 2);
      
      if (shouldUseWildcardForBalance) {
        // Prefer to pair wildcard with employees who have the most shifts
        const maxShiftEmployees = availableEmployees.filter(emp => shiftCounts[emp] === maxShifts);
        const candidateEmployees = maxShiftEmployees.length > 0 ? maxShiftEmployees : 
                                  availableEmployees.filter(emp => shiftCounts[emp] >= minShifts + 1);
        
        for (const emp of candidateEmployees) {
          if (!isPairingUsedInCurrentRound(emp, wildcard)) {
            // Calculate balance improvement with wildcard pairing
            const tempCounts = { ...shiftCounts };
            tempCounts[emp]++;
            const newMax = Math.max(...Object.values(tempCounts));
            const newMin = Math.min(...Object.values(tempCounts));
            const newImbalance = newMax - newMin;
            
            // Strongly prefer wildcard if it reduces imbalance
            if (newImbalance < currentImbalance) {
              return [emp, wildcard];
            }
          }
        }
      }
      
      // PRIORITY 2: Regular pairings with strong balance consideration
      for (let i = 0; i < availableEmployees.length - 1; i++) {
        for (let j = i + 1; j < availableEmployees.length; j++) {
          const person1 = availableEmployees[i];
          const person2 = availableEmployees[j];
          const pairKey = [person1, person2].sort().join('-');
          const currentPairCount = pairCounts[pairKey] || 0;
          
          if (!isPairingUsedInCurrentRound(person1, person2)) {
            // Calculate balance after this regular pairing
            const tempCounts = { ...shiftCounts };
            tempCounts[person1]++;
            tempCounts[person2]++;
            const newMax = Math.max(...Object.values(tempCounts));
            const newMin = Math.min(...Object.values(tempCounts));
            const newImbalance = newMax - newMin;
            
            // Score based on multiple factors (lower is better)
            let score = newImbalance * 3; // Balance is very important
            score += currentPairCount * 2; // Heavily penalize overused pairings
            score += (shiftCounts[person1] + shiftCounts[person2]) * 0.1; // Small penalty for high-shift employees
            
            // Strong bonus for employees with minimum shifts
            if (shiftCounts[person1] === minShifts) score -= 2;
            if (shiftCounts[person2] === minShifts) score -= 2;
            
            // Bonus for maintaining or improving balance
            if (newImbalance <= currentImbalance) score -= 1;
            
            if (score < bestBalanceScore) {
              bestBalanceScore = score;
              bestPair = [person1, person2];
            }
          }
        }
      }
      
      // PRIORITY 3: Fallback wildcard usage if no good regular pairs
      if (hasWildcard && wildcardAvailable && (bestPair === null || bestBalanceScore > 5)) {
        for (const emp of availableEmployees) {
          if (!isPairingUsedInCurrentRound(emp, wildcard)) {
            const tempCounts = { ...shiftCounts };
            tempCounts[emp]++;
            const newMax = Math.max(...Object.values(tempCounts));
            const newMin = Math.min(...Object.values(tempCounts));
            const wildcardScore = newMax - newMin;
            
            if (bestPair === null || wildcardScore < bestBalanceScore) {
              return [emp, wildcard];
            }
          }
        }
      }
      
      return bestPair;
    };
    
    // Generate the schedule
    let day = 1;
    let maxDays = 50;
    let stuckCounter = 0;
    
    while (day <= maxDays && stuckCounter < 5) {
      const availableRegular = regularEmployees.filter(emp => !lastShiftWorkers.has(emp));
      const wildcardAvailable = hasWildcard && wildcard && !lastShiftWorkers.has(wildcard);
      
      if (availableRegular.length < 1) {
        lastShiftWorkers.clear();
        stuckCounter++;
        continue;
      }
      
      let pair = null;
      
      // Find the best pairing
      if (availableRegular.length >= 2 || (availableRegular.length >= 1 && wildcardAvailable)) {
        pair = findBestPairForBalance(availableRegular);
      }
      
      // If no pair found, start a new round
      if (!pair) {
        startNewRoundIfNeeded();
        pair = findBestPairForBalance(availableRegular);
      }
      
      // If still no pair, reset consecutive constraint temporarily
      if (!pair && stuckCounter < 3) {
        const allRegular = regularEmployees;
        pair = findBestPairForBalance(allRegular);
      }
      
      if (pair) {
        schedule.push({
          day: day,
          shift: pair,
          isWildcardUsed: hasWildcard && pair.includes(wildcard),
          round: pairingRounds.length
        });
        
        // Add pairing to current round
        const pairingKey = getPairingKey(pair[0], pair[1]);
        currentRound.add(pairingKey);
        
        // Update shift counts for regular employees only
        pair.forEach(person => {
          if (person !== wildcard && regularEmployees.includes(person)) {
            shiftCounts[person]++;
          }
        });
        
        lastShiftWorkers = new Set(pair);
        day++;
        stuckCounter = 0;
        
        // Check if we should start a new round
        startNewRoundIfNeeded();
      } else {
        stuckCounter++;
        if (stuckCounter >= 3) {
          lastShiftWorkers.clear();
        }
      }
    }
    
    // FINAL BALANCING PHASE: Use wildcard to even out any remaining imbalance
    if (hasWildcard && schedule.length > 0) {
      const finalShiftCounts = {};
      regularEmployees.forEach(emp => finalShiftCounts[emp] = 0);
      
      // Count final shift totals for regular employees
      schedule.forEach(shift => {
        shift.shift.forEach(person => {
          if (person !== wildcard && regularEmployees.includes(person)) {
            finalShiftCounts[person]++;
          }
        });
      });
      
      const finalShiftValues = Object.values(finalShiftCounts);
      const finalMinShifts = Math.min(...finalShiftValues);
      const finalMaxShifts = Math.max(...finalShiftValues);
      const finalImbalance = finalMaxShifts - finalMinShifts;
      
      // If there's still imbalance, add wildcard shifts for employees with fewer shifts
      if (finalImbalance > 0) {
        const employeesWithMinShifts = regularEmployees.filter(emp => finalShiftCounts[emp] === finalMinShifts);
        
        // Add shifts with wildcard for employees who need to catch up
        employeesWithMinShifts.forEach(emp => {
          if (finalShiftCounts[emp] < finalMaxShifts) {
            day++;
            schedule.push({
              day: day,
              shift: [emp, wildcard],
              isWildcardUsed: true,
              round: pairingRounds.length,
              isBalancingShift: true // Mark as a final balancing shift
            });
          }
        });
      }
    }
    
    setSchedule(schedule);
  };
  
  const handleEmployeeNameChange = (index, newName) => {
    const newEmployees = [...employees];
    newEmployees[index] = newName;
    setEmployees(newEmployees);
  };
  
  const getPairingStats = () => {
    const pairCounts = {};
    schedule.forEach(shift => {
      const key = shift.shift.sort().join(' & ');
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    });
    return pairCounts;
  };
  
  const getEmployeeStats = () => {
    const employeeStats = {};
    const activeEmployees = employees.filter(emp => emp.trim() !== '');
    const hasWildcard = activeEmployees.length >= 3;
    const wildcard = hasWildcard ? activeEmployees[activeEmployees.length - 1] : null;
    const regularEmployees = hasWildcard ? activeEmployees.slice(0, -1) : activeEmployees;
    
    activeEmployees.forEach(emp => {
      employeeStats[emp] = {
        totalShifts: 0,
        consecutiveShifts: 0,
        maxConsecutive: 0,
        isRegular: regularEmployees.includes(emp)
      };
    });
    
    schedule.forEach((shift, index) => {
      shift.shift.forEach(emp => {
        // FIXED: Only count shifts for regular employees in the balance calculation
        // Wildcard appearances are tracked but don't count toward "shift balance"
        if (regularEmployees.includes(emp)) {
          employeeStats[emp].totalShifts++;
        } else if (emp === wildcard) {
          // Track wildcard appearances separately for display
          employeeStats[emp].totalShifts++;
        }
        
        // Check for consecutive shifts (applies to all including wildcard)
        if (index > 0 && schedule[index - 1].shift.includes(emp)) {
          employeeStats[emp].consecutiveShifts++;
        } else {
          employeeStats[emp].maxConsecutive = Math.max(
            employeeStats[emp].maxConsecutive, 
            employeeStats[emp].consecutiveShifts
          );
          employeeStats[emp].consecutiveShifts = 1;
        }
      });
    });
    
    // Final update for max consecutive
    activeEmployees.forEach(emp => {
      employeeStats[emp].maxConsecutive = Math.max(
        employeeStats[emp].maxConsecutive, 
        employeeStats[emp].consecutiveShifts
      );
    });
    
    // Calculate shift balance metrics ONLY for regular employees
    const regularShifts = regularEmployees.map(emp => employeeStats[emp].totalShifts);
    const minShifts = Math.min(...regularShifts);
    const maxShifts = Math.max(...regularShifts);
    const shiftRange = maxShifts - minShifts;
    
    return { employeeStats, shiftBalance: { min: minShifts, max: maxShifts, range: shiftRange } };
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6', 
      padding: '2rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '1.5rem',
        color: '#1f2937'
      }}>
        <h1 style={{ 
          fontSize: '1.875rem', 
          fontWeight: 'bold', 
          color: '#1f2937', 
          marginBottom: '1.5rem', 
          textAlign: 'center' 
        }}>
          Shift Rotation Scheduler
        </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Member Names</h2>
          {employees.map((emp, index) => (
            <div key={index} className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {index === 6 ? 'Wildcard Member:' : `Member ${index + 1}:`}
              </label>
              <input
                type="text"
                value={emp}
                onChange={(e) => handleEmployeeNameChange(index, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Schedule Rules</h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• Each shift has exactly 2 people</li>
            <li>• No person works consecutive days</li>
            <li>• Complete round-robin: everyone pairs with everyone before repeating</li>
            <li>• Wildcard gives regular members breaks when needed</li>
            <li>• Focus on completing pairing rounds efficiently</li>
          </ul>
          
          <button
            onClick={generateSchedule}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Generate Schedule
          </button>
        </div>
      </div>

      {schedule.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
            <h2 className="text-xl font-semibold p-4 bg-gray-50 border-b">Generated Schedule</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Shift</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Member 1</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Member 2</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Wildcard Used</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Running Counts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {schedule.map((shift, index) => {
                    const activeEmployees = employees.filter(emp => emp.trim() !== '');
                    const hasWildcard = activeEmployees.length >= 3;
                    const wildcard = hasWildcard ? activeEmployees[activeEmployees.length - 1] : null;
                    const regularEmployees = hasWildcard ? activeEmployees.slice(0, -1) : activeEmployees;
                    const runningCounts = {};
                    activeEmployees.forEach(emp => runningCounts[emp] = 0);
                    
                    // Count shifts up to and including current shift
                    schedule.slice(0, index + 1).forEach(s => {
                      s.shift.forEach(emp => {
                        if (runningCounts.hasOwnProperty(emp)) {
                          runningCounts[emp]++;
                        }
                      });
                    });
                    
                    const regularCounts = regularEmployees.map(emp => runningCounts[emp]);
                    const wildcardCount = hasWildcard && wildcard ? runningCounts[wildcard] : 0;
                    
                    return (
                      <tr key={index} className={shift.isWildcardUsed ? 'bg-yellow-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          Shift {shift.day}
                          {shift.isBalancingShift && <span className="ml-1 text-xs text-blue-600">(balance)</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{shift.shift[0]}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{shift.shift[1]}</td>
                        <td className="px-4 py-3 text-sm">
                          {shift.isWildcardUsed ? 
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Yes</span> : 
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">No</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div className="space-y-1">
                            <div>{regularEmployees.map((emp, i) => `${emp}: ${regularCounts[i]}`).join(' | ')}</div>
                            {hasWildcard && wildcardCount > 0 && <div className="text-yellow-600">{wildcard}: {wildcardCount}</div>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Member Statistics</h3>
              <div className="space-y-2">
                {Object.entries(getEmployeeStats().employeeStats).map(([emp, stats]) => (
                  <div key={emp} className={`flex justify-between text-sm ${stats.isRegular ? '' : 'bg-yellow-50 p-1 rounded'}`}>
                    <span className="font-medium">{emp}:</span>
                    <span>
                      {stats.totalShifts} shifts
                      {!stats.isRegular && <span className="text-yellow-600 ml-1">(helper)</span>}
                      <span className="text-gray-500 ml-2">(max consecutive: {stats.maxConsecutive})</span>
                    </span>
                  </div>
                ))}
                <div className="mt-4 p-2 bg-blue-50 rounded text-sm">
                  <div className="font-medium mb-1">Regular Member Balance:</div>
                  <div>Min shifts: {getEmployeeStats().shiftBalance.min}</div>
                  <div>Max shifts: {getEmployeeStats().shiftBalance.max}</div>
                  <div className={`${getEmployeeStats().shiftBalance.range <= 1 ? 'text-green-600' : 'text-orange-600'}`}>
                    Difference: {getEmployeeStats().shiftBalance.range} 
                    {getEmployeeStats().shiftBalance.range <= 1 ? ' ✓ Well balanced!' : ' - Could be more balanced'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    * Wildcard gives breaks - appears only when needed for scheduling
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Pairing Frequency</h3>
              <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                {Object.entries(getPairingStats()).map(([pair, count]) => (
                  <div key={pair} className="flex justify-between">
                    <span>{pair}:</span>
                    <span>{count} times</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default ShiftScheduler;