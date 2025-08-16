import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ShiftScheduler = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [style, setStyle] = useState(() => localStorage.getItem('style') || 'default');
  const [employees, setEmployees] = useState([
    'Member A', 'Member B', 'Member C', 'Member D', 
    'Member E', 'Member F', 'Wildcard'
  ]);
  const [schedule, setSchedule] = useState([]);
  const [currentDay, setCurrentDay] = useState(1);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-style', style);
  }, [theme, style]);

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleStyleChange = (e) => {
    const newStyle = e.target.value;
    setStyle(newStyle);
    localStorage.setItem('style', newStyle);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      // Get the main content area (exclude header controls, credit, footer)
      const element = document.querySelector('.main-card');
      if (!element) {
        alert('Unable to generate PDF. Please ensure a schedule is generated.');
        return;
      }

      // Temporarily hide elements we don't want in PDF
      const elementsToHide = [
        '.header-controls',
        '.print-section',
        '.credit-section',
        '.footer'
      ];
      
      elementsToHide.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'none';
      });

      // Configure html2canvas options to capture the styling
      const canvas = await html2canvas(element, {
        scale: 1.5, // Good quality without being too large
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollX: 0,
        scrollY: 0
      });

      // Restore hidden elements
      elementsToHide.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.style.display = '';
      });

      // Create PDF with better page handling
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions with margins
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      // Calculate image dimensions to fit width
      const imgWidth = availableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/png', 0.95);
      
      // If content fits on one page
      if (imgHeight <= availableHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      } else {
        // Split content across multiple pages
        const pageHeight = availableHeight;
        let yPosition = 0;
        let pageNumber = 0;
        
        while (yPosition < imgHeight) {
          if (pageNumber > 0) {
            pdf.addPage();
          }
          
          // Calculate the portion of the image for this page
          const sourceY = (yPosition / imgHeight) * canvas.height;
          const sourceHeight = Math.min(
            (pageHeight / imgHeight) * canvas.height,
            canvas.height - sourceY
          );
          
          // Create a temporary canvas for this page's content
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext('2d');
          
          // Draw the relevant portion of the original canvas
          pageCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          );
          
          // Add this page's image to PDF
          const pageImgData = pageCanvas.toDataURL('image/png', 0.95);
          const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
          
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageImgHeight);
          
          yPosition += pageHeight;
          pageNumber++;
          
          // Safety check to prevent infinite loop
          if (pageNumber > 50) {
            console.warn('PDF generation stopped at 50 pages to prevent infinite loop');
            break;
          }
        }
      }

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `shift-schedule-${dateStr}.pdf`;

      // Save the PDF
      pdf.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again or use the print button.');
    }
  };

  const getCurrentESTDateTime = () => {
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    };
    return estTime.toLocaleDateString('en-US', options);
  };

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
    <>
      <style>{`
        :root {
          --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --bg-gradient-dark: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
          --card-bg: #ffffff;
          --card-bg-dark: #2d3748;
          --text-color: #2d3748;
          --text-color-dark: #e2e8f0;
          --text-muted: #666666;
          --text-muted-dark: #a0aec0;
          --accent-color: #667eea;
          --accent-hover: #5a67d8;
          --border-color: #e2e8f0;
          --border-color-dark: #4a5568;
          --shadow: rgba(0,0,0,0.1);
          --shadow-dark: rgba(0,0,0,0.3);
          --tier-bg: #f7fafc;
          --tier-bg-dark: #1a202c;
        }

        body {
          background: var(--bg-gradient);
          color: var(--text-color);
          transition: all 0.3s ease;
        }

        body[data-theme="dark"] {
          --card-bg: #2d3748;
          --text-color: #e2e8f0;
          --text-muted: #a0aec0;
          --border-color: #4a5568;
          --shadow: rgba(0,0,0,0.3);
          --tier-bg: #1a202c;
          background: var(--bg-gradient-dark);
          color: var(--text-color-dark);
        }

        body[data-style="glassmorphism"] {
          --card-bg: rgba(255, 255, 255, 0.1);
          --tier-bg: rgba(255, 255, 255, 0.05);
          --border-color: rgba(255, 255, 255, 0.2);
        }

        body[data-style="glassmorphism"][data-theme="dark"] {
          --card-bg: rgba(30, 41, 59, 0.3);
          --tier-bg: rgba(30, 41, 59, 0.2);
          --border-color: rgba(255, 255, 255, 0.1);
        }

        body[data-style="neumorphism"] {
          --card-bg: #e0e5ec;
          --tier-bg: #d1d5db;
          --border-color: transparent;
          --shadow: none;
        }

        body[data-style="neumorphism"][data-theme="dark"] {
          --card-bg: #2d3748;
          --tier-bg: #374151;
          --border-color: transparent;
        }

        .header-controls {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 1rem;
          align-items: center;
          z-index: 10;
          /* Visual indicator that new styles are loaded */
          animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .style-selector {
          background: var(--card-bg);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          color: var(--text-color);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px var(--shadow);
          min-width: 140px;
        }

        .style-selector:hover {
          border-color: var(--accent-color);
          box-shadow: 0 4px 8px var(--shadow);
          transform: translateY(-1px);
        }

        .style-selector:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .style-selector option {
          background: var(--card-bg);
          color: var(--text-color);
          padding: 0.5rem;
        }

        .theme-toggle {
          background: var(--card-bg);
          border: 2px solid var(--border-color);
          border-radius: 50px;
          width: 70px;
          height: 36px;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 3px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px var(--shadow);
          position: relative;
          overflow: hidden;
        }

        .theme-toggle:hover {
          border-color: var(--accent-color);
          box-shadow: 0 4px 8px var(--shadow);
          transform: translateY(-1px);
        }

        .theme-toggle:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px var(--shadow);
        }


        .theme-toggle-slider {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, var(--accent-color), var(--accent-hover));
          border-radius: 50%;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          position: relative;
        }

        .theme-toggle-slider::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .theme-toggle:hover .theme-toggle-slider::before {
          opacity: 1;
        }

        [data-theme="dark"] .theme-toggle-slider {
          transform: translateX(32px);
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
        }


        /* Glassmorphism styles */
        [data-style="glassmorphism"] .style-selector,
        [data-style="glassmorphism"] .theme-toggle {
          background: rgba(255, 255, 255, 0.15) !important;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
        }

        [data-style="glassmorphism"] .style-selector:hover,
        [data-style="glassmorphism"] .theme-toggle:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
        }

        [data-style="glassmorphism"][data-theme="dark"] .style-selector,
        [data-style="glassmorphism"][data-theme="dark"] .theme-toggle {
          background: rgba(30, 41, 59, 0.4) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        }

        [data-style="glassmorphism"][data-theme="dark"] .style-selector:hover,
        [data-style="glassmorphism"][data-theme="dark"] .theme-toggle:hover {
          background: rgba(30, 41, 59, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4) !important;
        }

        /* Neumorphism styles */
        [data-style="neumorphism"] .style-selector,
        [data-style="neumorphism"] .theme-toggle {
          background: #e0e5ec !important;
          box-shadow: 9px 9px 18px #c8cdd4, -9px -9px 18px #f8fdff !important;
          border: none !important;
        }

        [data-style="neumorphism"] .style-selector:hover,
        [data-style="neumorphism"] .theme-toggle:hover {
          box-shadow: 6px 6px 12px #c8cdd4, -6px -6px 12px #f8fdff !important;
          transform: translateY(-2px);
        }

        [data-style="neumorphism"] .style-selector:active,
        [data-style="neumorphism"] .theme-toggle:active {
          box-shadow: inset 4px 4px 8px #c8cdd4, inset -4px -4px 8px #f8fdff !important;
          transform: translateY(0);
        }

        [data-style="neumorphism"][data-theme="dark"] .style-selector,
        [data-style="neumorphism"][data-theme="dark"] .theme-toggle {
          background: #2d3748 !important;
          box-shadow: 9px 9px 18px #1e2730, -9px -9px 18px #3c4760 !important;
        }

        [data-style="neumorphism"][data-theme="dark"] .style-selector:hover,
        [data-style="neumorphism"][data-theme="dark"] .theme-toggle:hover {
          box-shadow: 6px 6px 12px #1e2730, -6px -6px 12px #3c4760 !important;
          transform: translateY(-2px);
        }

        [data-style="neumorphism"][data-theme="dark"] .style-selector:active,
        [data-style="neumorphism"][data-theme="dark"] .theme-toggle:active {
          box-shadow: inset 4px 4px 8px #1e2730, inset -4px -4px 8px #3c4760 !important;
          transform: translateY(0);
        }

        /* Table styles */
        .schedule-table {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
        }

        .schedule-table th {
          background: var(--tier-bg);
          color: var(--text-color);
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.875rem;
          font-weight: 500;
          border-bottom: 1px solid var(--border-color);
        }

        .schedule-table td {
          padding: 0.75rem 1rem;
          color: var(--text-color);
          font-size: 0.875rem;
          border-bottom: 1px solid var(--border-color);
        }

        .schedule-table tr:last-child td {
          border-bottom: none;
        }

        .schedule-table .wildcard-row {
          background: rgba(255, 193, 7, 0.1);
        }

        [data-theme="dark"] .schedule-table .wildcard-row {
          background: rgba(255, 193, 7, 0.2);
        }

        .stats-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          transition: all 0.3s ease;
        }

        .stats-card h3 {
          color: var(--text-color);
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .balance-info {
          background: var(--tier-bg);
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
          margin-top: 1rem;
        }

        .balance-info .font-medium {
          color: var(--text-color);
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .badge-yes {
          background: rgba(34, 197, 94, 0.1);
          color: #059669;
        }

        .badge-no {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        [data-theme="dark"] .badge-yes {
          background: rgba(34, 197, 94, 0.2);
          color: #10b981;
        }

        [data-theme="dark"] .badge-no {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .text-success {
          color: #059669;
        }

        .text-warning {
          color: #d97706;
        }

        [data-theme="dark"] .text-success {
          color: #10b981;
        }

        [data-theme="dark"] .text-warning {
          color: #f59e0b;
        }

        .helper-row {
          background: rgba(255, 193, 7, 0.05);
          padding: 0.25rem;
          border-radius: 4px;
        }

        [data-theme="dark"] .helper-row {
          background: rgba(255, 193, 7, 0.1);
        }

        .text-muted {
          color: var(--text-muted);
        }

        /* Glassmorphism table styles */
        [data-style="glassmorphism"] .schedule-table,
        [data-style="glassmorphism"] .stats-card {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        [data-style="glassmorphism"][data-theme="dark"] .schedule-table,
        [data-style="glassmorphism"][data-theme="dark"] .stats-card {
          background: rgba(30, 41, 59, 0.2) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        [data-style="glassmorphism"] .schedule-table th,
        [data-style="glassmorphism"] .balance-info {
          background: rgba(255, 255, 255, 0.1) !important;
        }

        [data-style="glassmorphism"][data-theme="dark"] .schedule-table th,
        [data-style="glassmorphism"][data-theme="dark"] .balance-info {
          background: rgba(30, 41, 59, 0.3) !important;
        }

        /* Neumorphism table styles */
        [data-style="neumorphism"] .schedule-table,
        [data-style="neumorphism"] .stats-card {
          background: #e0e5ec !important;
          box-shadow: 8px 8px 16px #bebebe, -8px -8px 16px #ffffff !important;
          border: none !important;
        }

        [data-style="neumorphism"][data-theme="dark"] .schedule-table,
        [data-style="neumorphism"][data-theme="dark"] .stats-card {
          background: #2d3748 !important;
          box-shadow: 8px 8px 16px #1a202c, -8px -8px 16px #404c5a !important;
        }

        [data-style="neumorphism"] .schedule-table th,
        [data-style="neumorphism"] .balance-info {
          background: #d1d5db !important;
          box-shadow: inset 3px 3px 6px #bebebe, inset -3px -3px 6px #ffffff !important;
        }

        [data-style="neumorphism"][data-theme="dark"] .schedule-table th,
        [data-style="neumorphism"][data-theme="dark"] .balance-info {
          background: #374151 !important;
          box-shadow: inset 3px 3px 6px #1a202c, inset -3px -3px 6px #4a5568 !important;
        }

        /* Special neumorphism handling for main card */
        body[data-style="neumorphism"] .main-card {
          background: #e0e5ec !important;
          box-shadow: 20px 20px 40px #bebebe, -20px -20px 40px #ffffff !important;
          border: none !important;
        }

        body[data-style="neumorphism"][data-theme="dark"] .main-card {
          background: #2d3748 !important;
          box-shadow: 20px 20px 40px #1a202c, -20px -20px 40px #404c5a !important;
        }

        /* Special glassmorphism handling for main card */
        body[data-style="glassmorphism"] .main-card {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        body[data-style="glassmorphism"][data-theme="dark"] .main-card {
          background: rgba(30, 41, 59, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        /* Print section styles */
        .print-section {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
        }

        .print-section h3 {
          color: var(--text-color);
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .print-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .print-btn {
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 4px var(--shadow);
        }

        .print-btn:hover {
          background: var(--accent-hover);
          box-shadow: 0 4px 8px var(--shadow);
          transform: translateY(-1px);
        }

        .print-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px var(--shadow);
        }

        .print-btn-icon {
          font-size: 1rem;
        }

        /* Enhanced pairing frequency styles */
        .pairing-frequency {
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 0.5rem;
          background: var(--tier-bg);
        }

        /* Glassmorphism print section */
        body[data-style="glassmorphism"] .print-section {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        body[data-style="glassmorphism"][data-theme="dark"] .print-section {
          background: rgba(30, 41, 59, 0.2) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        /* Neumorphism print section */
        body[data-style="neumorphism"] .print-section {
          background: #e0e5ec !important;
          box-shadow: 8px 8px 16px #bebebe, -8px -8px 16px #ffffff !important;
          border: none !important;
        }

        body[data-style="neumorphism"][data-theme="dark"] .print-section {
          background: #2d3748 !important;
          box-shadow: 8px 8px 16px #1a202c, -8px -8px 16px #404c5a !important;
        }

        /* Mobile responsive styles */
        @media (max-width: 768px) {
          /* Main container adjustments */
          .main-container {
            padding: 1rem !important;
          }
          
          .main-card {
            padding: 1rem !important;
            margin: 0 !important;
          }
          
          /* Header controls mobile layout */
          .header-controls {
            position: relative !important;
            top: auto !important;
            right: auto !important;
            display: flex !important;
            justify-content: center !important;
            margin-bottom: 1rem !important;
            gap: 0.75rem !important;
          }
          
          .style-selector {
            min-width: 120px !important;
            font-size: 0.8rem !important;
            padding: 0.6rem 0.8rem !important;
          }
          
          .theme-toggle {
            width: 60px !important;
            height: 32px !important;
          }
          
          .theme-toggle-slider {
            width: 24px !important;
            height: 24px !important;
            font-size: 12px !important;
          }
          
          [data-theme="dark"] .theme-toggle-slider {
            transform: translateX(26px) !important;
          }
          
          /* Title spacing */
          .main-title {
            font-size: 1.5rem !important;
            margin-bottom: 1rem !important;
            text-align: center !important;
          }
          
          /* Grid layouts to single column */
          .member-rules-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          
          .stats-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          
          /* Print buttons mobile layout */
          .print-buttons {
            justify-content: center !important;
          }
          
          .print-btn {
            flex: 1 1 auto !important;
            min-width: 140px !important;
            justify-content: center !important;
          }
          
          /* Schedule table mobile */
          .schedule-table-container {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          
          .schedule-table table {
            min-width: 600px !important;
          }
          
          .schedule-table th,
          .schedule-table td {
            padding: 0.5rem !important;
            font-size: 0.8rem !important;
            white-space: nowrap !important;
          }
          
          /* Form inputs mobile */
          .member-input {
            font-size: 16px !important; /* Prevents zoom on iOS */
          }
          
          /* Button improvements */
          .generate-btn {
            font-size: 1rem !important;
            padding: 0.75rem 1rem !important;
            touch-action: manipulation !important;
          }
          
          /* Stats cards mobile */
          .stats-card {
            padding: 0.75rem !important;
          }
          
          .stats-card h3 {
            font-size: 1rem !important;
            margin-bottom: 0.5rem !important;
          }
          
          /* Member stats mobile layout */
          .member-stat-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.25rem !important;
          }
          
          .balance-info {
            font-size: 0.8rem !important;
            padding: 0.5rem !important;
          }
          
          /* Pairing frequency mobile */
          .pairing-frequency {
            font-size: 0.8rem !important;
            padding: 0.5rem !important;
          }
        }
        
        @media (max-width: 480px) {
          /* Extra small screens */
          .main-container {
            padding: 0.5rem !important;
          }
          
          .header-controls {
            flex-direction: column !important;
            align-items: center !important;
            gap: 0.5rem !important;
          }
          
          .style-selector,
          .theme-toggle {
            width: 100% !important;
            max-width: 200px !important;
          }
          
          .print-buttons {
            flex-direction: column !important;
          }
          
          .print-btn {
            width: 100% !important;
          }
          
          .schedule-table th,
          .schedule-table td {
            padding: 0.4rem !important;
            font-size: 0.75rem !important;
          }
        }

        /* Footer and credit styles */
        .credit-section {
          background: var(--tier-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          margin-top: 2rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .credit-section h4 {
          color: var(--text-color);
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .credit-section p {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin: 0;
        }

        .footer {
          background: var(--card-bg);
          border-top: 1px solid var(--border-color);
          padding: 1rem;
          margin-top: 1rem;
          text-align: center;
          font-size: 0.8rem;
          color: var(--text-muted);
          transition: all 0.3s ease;
        }

        .footer-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: center;
        }

        .claude-credit {
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        .timestamp {
          color: var(--accent-color);
          font-weight: 500;
          font-size: 0.8rem;
        }

        /* Glassmorphism footer styles */
        body[data-style="glassmorphism"] .credit-section,
        body[data-style="glassmorphism"] .footer {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        body[data-style="glassmorphism"][data-theme="dark"] .credit-section,
        body[data-style="glassmorphism"][data-theme="dark"] .footer {
          background: rgba(30, 41, 59, 0.2) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        /* Neumorphism footer styles */
        body[data-style="neumorphism"] .credit-section,
        body[data-style="neumorphism"] .footer {
          background: #e0e5ec !important;
          box-shadow: inset 3px 3px 6px #bebebe, inset -3px -3px 6px #ffffff !important;
          border: none !important;
        }

        body[data-style="neumorphism"][data-theme="dark"] .credit-section,
        body[data-style="neumorphism"][data-theme="dark"] .footer {
          background: #2d3748 !important;
          box-shadow: inset 3px 3px 6px #1a202c, inset -3px -3px 6px #404c5a !important;
        }

        /* Mobile footer styles */
        @media (max-width: 768px) {
          .credit-section,
          .footer {
            margin-left: -1rem;
            margin-right: -1rem;
            border-radius: 0;
            border-left: none;
            border-right: none;
          }

          .footer-content {
            font-size: 0.75rem;
          }

          .timestamp {
            font-size: 0.75rem;
          }
        }

        /* Print media styles - maintain theme styling */
        @media print {
          /* Hide UI elements from print */
          .header-controls,
          .print-section,
          .credit-section,
          .footer {
            display: none !important;
          }
          
          /* Maintain theme colors in print */
          .main-card {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 1rem !important;
          }
          
          .schedule-table,
          .stats-card {
            box-shadow: none !important;
          }
          
          .schedule-table th,
          .schedule-table td {
            border: 1px solid var(--border-color) !important;
          }

          /* Ensure proper page breaks */
          .schedule-table,
          .stats-grid {
            page-break-inside: avoid;
          }

          /* Force backgrounds to print */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
      <div className="main-container" style={{ 
        minHeight: '100vh', 
        padding: '2rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        position: 'relative'
      }}>
        <div className="header-controls">
          <select 
            className="style-selector" 
            value={style} 
            onChange={handleStyleChange}
          >
            <option value="default">Default</option>
            <option value="glassmorphism">Glassmorphism</option>
            <option value="neumorphism">Neumorphism</option>
          </select>
          <button 
            className="theme-toggle" 
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
          >
            <div className="theme-toggle-slider">
              {theme === 'light' ? '☀️' : '🌙'}
            </div>
          </button>
        </div>
        
        <div className="main-card" style={{
          maxWidth: '1200px',
          width: '100%',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px var(--shadow)',
          padding: '1.5rem',
          color: 'var(--text-color)',
          transition: 'all 0.3s ease'
        }}>
        <h1 className="main-title" style={{ 
          fontSize: '1.875rem', 
          fontWeight: 'bold', 
          color: 'var(--text-color)', 
          marginBottom: '1.5rem', 
          textAlign: 'center',
          transition: 'color 0.3s ease'
        }}>
          Shift Rotation Scheduler
        </h1>
      
      <div className="member-rules-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'var(--tier-bg)', padding: '1rem', borderRadius: '0.5rem', transition: 'background-color 0.3s ease' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-color)', transition: 'color 0.3s ease' }}>Member Names</h2>
          {employees.map((emp, index) => (
            <div key={index} style={{ marginBottom: '0.5rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: 'var(--text-color)', 
                marginBottom: '0.25rem',
                transition: 'color 0.3s ease'
              }}>
                {index === 6 ? 'Wildcard Member:' : `Member ${index + 1}:`}
              </label>
              <input
                className="member-input"
                type="text"
                value={emp}
                onChange={(e) => handleEmployeeNameChange(index, e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.5rem', 
                  border: `1px solid var(--border-color)`, 
                  borderRadius: '0.375rem',
                  outline: 'none',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-color)',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
          ))}
        </div>
        
        <div style={{ backgroundColor: 'var(--tier-bg)', padding: '1rem', borderRadius: '0.5rem', transition: 'background-color 0.3s ease' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-color)', transition: 'color 0.3s ease' }}>Schedule Rules</h2>
          <ul style={{ fontSize: '0.875rem', color: 'var(--text-color)', listStyle: 'none', padding: 0, transition: 'color 0.3s ease' }}>
            <li style={{ marginBottom: '0.5rem' }}>• Each shift has exactly 2 people</li>
            <li style={{ marginBottom: '0.5rem' }}>• No person works consecutive days</li>
            <li style={{ marginBottom: '0.5rem' }}>• Complete round-robin: everyone pairs with everyone before repeating</li>
            <li style={{ marginBottom: '0.5rem' }}>• Wildcard gives regular members breaks when needed</li>
            <li style={{ marginBottom: '0.5rem' }}>• Focus on completing pairing rounds efficiently</li>
          </ul>
          
          <button
            className="generate-btn"
            onClick={generateSchedule}
            style={{ 
              marginTop: '1rem', 
              width: '100%', 
              backgroundColor: 'var(--accent-color)', 
              color: 'white', 
              padding: '0.5rem 1rem', 
              borderRadius: '0.375rem',
              border: 'none',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'var(--accent-hover)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'var(--accent-color)'}
          >
            Generate Schedule
          </button>
        </div>
      </div>

      {schedule.length > 0 && (
        <>
          <div className="print-section">
            <h3>Print & Export</h3>
            <div className="print-buttons">
              <button className="print-btn" onClick={handlePrint}>
                <span className="print-btn-icon">🖨️</span>
                Print Schedule
              </button>
              <button className="print-btn" onClick={handleDownloadPDF}>
                <span className="print-btn-icon">📄</span>
                Download PDF
              </button>
            </div>
          </div>

          <div className="schedule-table">
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-color)', margin: 0 }}>Generated Schedule</h2>
            </div>
            <div className="schedule-table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th className="schedule-table">Shift</th>
                    <th className="schedule-table">Member 1</th>
                    <th className="schedule-table">Member 2</th>
                    <th className="schedule-table">Wildcard Used</th>
                    <th className="schedule-table">Running Counts</th>
                  </tr>
                </thead>
                <tbody>
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
                      <tr key={index} className={shift.isWildcardUsed ? 'wildcard-row' : ''}>
                        <td className="schedule-table" style={{ fontWeight: '500' }}>
                          Shift {shift.day}
                          {shift.isBalancingShift && <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem', color: 'var(--accent-color)' }}>(balance)</span>}
                        </td>
                        <td className="schedule-table">{shift.shift[0]}</td>
                        <td className="schedule-table">{shift.shift[1]}</td>
                        <td className="schedule-table">
                          {shift.isWildcardUsed ? 
                            <span className="badge badge-yes">Yes</span> : 
                            <span className="badge badge-no">No</span>
                          }
                        </td>
                        <td className="schedule-table" style={{ fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div>{regularEmployees.map((emp, i) => `${emp}: ${regularCounts[i]}`).join(' | ')}</div>
                            {hasWildcard && wildcardCount > 0 && <div style={{ color: 'var(--accent-color)' }}>{wildcard}: {wildcardCount}</div>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="stats-card">
              <h3>Member Statistics</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(getEmployeeStats().employeeStats).map(([emp, stats]) => (
                  <div key={emp} className={`member-stat-row ${stats.isRegular ? '' : 'helper-row'}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: '500', color: 'var(--text-color)' }}>{emp}:</span>
                    <span style={{ color: 'var(--text-color)' }}>
                      {stats.totalShifts} shifts
                      {!stats.isRegular && <span style={{ color: 'var(--accent-color)', marginLeft: '0.25rem' }}>(helper)</span>}
                      <span className="text-muted" style={{ marginLeft: '0.5rem' }}>(max consecutive: {stats.maxConsecutive})</span>
                    </span>
                  </div>
                ))}
                <div className="balance-info">
                  <div className="font-medium">Regular Member Balance:</div>
                  <div style={{ color: 'var(--text-color)' }}>Min shifts: {getEmployeeStats().shiftBalance.min}</div>
                  <div style={{ color: 'var(--text-color)' }}>Max shifts: {getEmployeeStats().shiftBalance.max}</div>
                  <div className={getEmployeeStats().shiftBalance.range <= 1 ? 'text-success' : 'text-warning'}>
                    Difference: {getEmployeeStats().shiftBalance.range} 
                    {getEmployeeStats().shiftBalance.range <= 1 ? ' ✓ Well balanced!' : ' - Could be more balanced'}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    * Wildcard gives breaks - appears only when needed for scheduling
                  </div>
                </div>
              </div>
            </div>
            
            <div className="stats-card">
              <h3>Pairing Frequency</h3>
              <div className="pairing-frequency">
                {Object.entries(getPairingStats()).map(([pair, count]) => (
                  <div key={pair} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-color)', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                    <span>{pair}:</span>
                    <span>{count} times</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

          {/* Credit Section */}
          <div className="credit-section">
            <h4>Created by Mike Cheel</h4>
            <p>Shift Rotation Scheduler - Designed for fair and efficient team scheduling</p>
          </div>

          {/* Footer */}
          <div className="footer">
            <div className="footer-content">
              <div className="timestamp">
                Last updated: {getCurrentESTDateTime()}
              </div>
              <div className="claude-credit">
                🤖 Generated with <a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent-color)', textDecoration: 'none'}}>Claude Code</a>
              </div>
              <div className="claude-credit">
                Co-Authored-By: Claude &lt;noreply@anthropic.com&gt;
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShiftScheduler;