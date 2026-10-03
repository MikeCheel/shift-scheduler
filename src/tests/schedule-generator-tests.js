/**
 * Tests for the Worker Schedule Generator.
 * Run: node src/tests/schedule-generator-tests.js
 */

const {
    generatePairs,
    generateGroups,
    orderShifts,
    buildSchedule,
    generateSchedule,
    generateRotation,
    restFairness,
    compareFairness,
    numberByFirstAppearance,
    arrangeShiftMembers,
    updateShiftDates,
    fillShiftDates,
    formatSchedule,
    getWorkerSummaries,
    getScheduleStats,
    theoreticalMinGap
} = require('../scripts/schedule-generator.js');

let failures = 0;

function check(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
    } else {
        console.error(`  ❌ ${message}`);
        failures++;
    }
}

function testSize(numWorkers) {
    console.log(`\n--- ${numWorkers} workers ---`);
    const schedule = generateSchedule(numWorkers);
    const stats = getScheduleStats(schedule, numWorkers);
    const expectedShifts = numWorkers * (numWorkers - 1) / 2;

    // Rule 1: every pair exactly once, so nobody repeats before all have met.
    check(schedule.length === expectedShifts, `has ${expectedShifts} shifts (got ${schedule.length})`);
    check(stats.isComplete, 'every pair of workers shares exactly one shift');
    check(schedule.every(([a, b]) => a !== b && a >= 1 && b >= 1 && a <= numWorkers && b <= numWorkers),
        'every shift is two different, valid workers');

    // Everyone works the same number of shifts (N-1).
    const counts = Object.values(stats.workerShifts);
    check(counts.every(c => c === numWorkers - 1), `each worker works ${numWorkers - 1} shifts`);

    // Rule 2: never two shifts in a row (impossible for 3-4 workers).
    if (numWorkers >= 5) {
        check(stats.backToBack === 0, `no back-to-back shifts (found ${stats.backToBack})`);
    } else if (numWorkers >= 3) {
        check(stats.backToBack > 0, `back-to-back shifts unavoidable at ${numWorkers} workers (found ${stats.backToBack})`);
    }

    // Rule 3: rest between shifts. The pair order reaches the upper bound with an even
    // team and is at most one short of it with an odd team.
    if (numWorkers >= 5) {
        const bound = stats.minGapUpperBound;
        if (numWorkers % 2 === 0) {
            check(stats.minGap === bound, `minimum rest ${stats.minGap} shifts reaches the bound ${bound}`);
        } else {
            check(stats.minGap >= bound - 1, `minimum rest ${stats.minGap} shifts is within one of the bound ${bound}`);
        }
        check(stats.avgGap >= numWorkers / 2 - 1.5,
            `average rest ${stats.avgGap.toFixed(1)} shifts`);
    }
}

function testSummaries() {
    console.log('\n--- worker summaries ---');
    const schedule = generateSchedule(6);
    const summaries = getWorkerSummaries(schedule, 6);
    check(summaries.length === 6, 'one summary per worker');
    check(summaries.every(s => s.shifts.length === 5 && s.partners.length === 5 && s.gaps.length === 4),
        'each summary has 5 shifts, 5 partners, 4 gaps');
    check(summaries.every(s => {
        const partners = s.partners.flat();
        return partners.length === 5 && new Set(partners).size === 5 && !partners.includes(s.worker);
    }), 'every worker partners with each other worker once');
}

function testLargerShifts() {
    console.log('\n--- more than 2 workers per shift ---');
    for (const [n, k] of [[6, 3], [9, 3], [10, 3], [12, 4], [20, 4], [30, 5], [50, 3]]) {
        const schedule = generateSchedule(n, k);
        const stats = getScheduleStats(schedule, n);
        const label = `${n} workers, ${k} per shift`;
        check(schedule.every(g => g.length === k && new Set(g).size === k && g.every(w => w >= 1 && w <= n)),
            `${label}: every shift has ${k} different valid workers`);
        check(stats.isComplete, `${label}: every pair of workers shares a shift`);
        check(stats.minShifts >= 1, `${label}: every worker works`);
    }
    // Exact fit (a Steiner triple system exists for 9 workers): no pair ever repeats.
    check(getScheduleStats(generateSchedule(9, 3), 9).repeatedPairs === 0, '9 workers in threes: no repeated pairs');
    check(generateSchedule(5, 5).length === 1, 'everyone on one shift gives a single shift');
    for (const bad of [[5, 0], [5, 6], [5, 2.5]]) {
        let threw = false;
        try { generateSchedule(...bad); } catch (e) { threw = true; }
        check(threw, `rejects ${bad[1]} workers per shift with ${bad[0]} workers`);
    }
}

function testOrdering() {
    console.log('\n--- ordering ---');
    // With an even team the bound can't be reached exactly (see theoreticalMinGap), so
    // n/2 - 2 is the best possible; check it is what the order gets.
    check(theoreticalMinGap(10) === 3, 'upper bound for 10 workers in pairs is 3');
    check(theoreticalMinGap(11) === 4, 'upper bound for 11 workers in pairs is 4');
    check(theoreticalMinGap(9, 3) === 1 && theoreticalMinGap(10, 3) === 2, 'upper bound for groups of 3');

    const proven = buildSchedule(10);
    check(proven.minGapProvenBest && getScheduleStats(proven.schedule, 10).minGap === 3,
        '10 workers: minimum rest 3 is reported as the best possible');

    // With no search budget the starting order comes back unchanged and is flagged.
    const pairs = generatePairs(13);
    const fallback = orderShifts(pairs, 13, { nodeBudget: 1, attempts: 1 });
    check(fallback.schedule.length === pairs.length &&
          fallback.schedule.every((pair, i) => pair.join() === pairs[i].join()),
        'search giving up keeps the starting order');
    check(fallback.minGapProvenBest === false, 'search giving up is reported');
    check(getScheduleStats(fallback.schedule, 13).minGap >= theoreticalMinGap(13) - 1,
        'starting pair order is within one of the bound');

    // Never worse than the order passed in.
    for (const [n, k] of [[12, 4], [20, 5], [50, 10]]) {
        const groups = generateGroups(n, k);
        const before = getScheduleStats(groups, n);
        const after = getScheduleStats(orderShifts(groups, n).schedule, n);
        check(after.minGap > before.minGap ||
              (after.minGap === before.minGap && after.backToBack <= before.backToBack),
            `${n} workers, ${k} per shift: order is no worse than generation order`);
    }
}

function testFairness() {
    console.log('\n--- fair rest and numbering ---');
    // 6 workers: everyone gets exactly one long break, with the fewest short breaks
    // possible (7) and no gap longer than 4.
    const six = restFairness(generateSchedule(6), 6);
    check(six.longSpread === 0 && six.maxShort === 2 && six.totalShort === 7 && six.maxGap <= 4,
        `6 workers: long breaks equal, short breaks low (${six.maxShort} max, ${six.totalShort} total, longest gap ${six.maxGap})`);
    for (const n of [8, 10]) {
        check(restFairness(generateSchedule(n), n).longSpread === 0, `${n} workers: everyone gets the same number of long breaks`);
    }

    for (const [n, k] of [[6, 2], [8, 2], [10, 2], [13, 2], [20, 4], [50, 3]]) {
        const label = `${n} workers, ${k} per shift`;
        const before = orderShifts(generateGroups(n, k), n).schedule;
        const after = generateSchedule(n, k);
        const b = restFairness(before, n);
        const a = restFairness(after, n);
        check(getScheduleStats(after, n).minGap === getScheduleStats(before, n).minGap && a.maxGap <= b.maxGap + 1,
            `${label}: minimum rest kept, longest gap grows by at most one`);
        check(compareFairness(a, b) <= 0,
            `${label}: rest shared at least as fairly (long-break spread ${b.longSpread} -> ${a.longSpread})`);
        check(getScheduleStats(after, n).isComplete, `${label}: still covers every pair`);
    }

    check(generateSchedule(6).slice(0, 3).map(g => g.join('&')).join(' ') === '1&2 3&4 5&6',
        'first shifts follow the worker list');
    check(generateSchedule(9, 3).slice(0, 3).map(g => g.join('&')).join(' ') === '1&2&3 4&5&6 7&8&9',
        'first shifts follow the worker list for groups');
    // 2->1, 4->2, 1->3, 3->4, so the last shift (2 & 1) becomes 1 & 3.
    check(numberByFirstAppearance([[4, 2], [1, 3], [2, 1]]).map(g => g.join()).join(' ') === '1,2 3,4 1,3',
        'renumbering keeps who works together');
}

function testSoloShifts() {
    console.log('\n--- 1 worker per shift ---');
    check(generateSchedule(3, 1).map(g => g.join()).join(' ') === '1 2 3', 'defaults to one round, each worker once');

    const { schedule, minGapProvenBest } = buildSchedule(3, 1, { numShifts: 7 });
    check(schedule.map(g => g.join()).join(' ') === '1 2 3 1 2 3 1', 'rotates through workers in order');
    const stats = getScheduleStats(schedule, 3);
    check(stats.backToBack === 0 && stats.minGap === 2 && stats.minGap === theoreticalMinGap(3, 1) && minGapProvenBest,
        'every worker gets the most rest possible');
    check(stats.minShifts === 2 && stats.maxShifts === 3, 'shifts are shared as evenly as possible');
    check(stats.expectedPairs === 0 && stats.repeatedPairs === 0, 'no pairs are expected');

    for (const [n, shifts] of [[1, 3], [3, 0], [3, 2.5]]) {
        let threw = false;
        try { generateRotation(n, shifts); } catch (e) { threw = true; }
        check(threw, `rejects ${n} workers with ${shifts} shifts`);
    }
}

function testDisplayOrder() {
    console.log('\n--- order of workers within a shift ---');
    for (const [n, k] of [[6, 2], [7, 2], [20, 2], [9, 3], [20, 4]]) {
        const schedule = generateSchedule(n, k);
        const arranged = arrangeShiftMembers(schedule);
        const label = `${n} workers, ${k} per shift`;
        check(arranged.every((group, i) => group.slice().sort((a, b) => a - b).join() === schedule[i].slice().sort((a, b) => a - b).join()),
            `${label}: same workers in every shift`);

        // A first-listed worker is only listed second when another first-listed worker is on the shift.
        const leaders = new Set();
        const seen = new Set();
        let ok = true;
        arranged.forEach(group => {
            if (!seen.has(group[0])) leaders.add(group[0]);
            group.slice(1).forEach(worker => {
                if (leaders.has(worker) && !leaders.has(group[0])) ok = false;
            });
            group.forEach(worker => seen.add(worker));
        });
        check(ok, `${label}: first-listed workers stay first unless they share a shift`);
    }
    // 1 and 3 are first-listed on their first shifts; 2 and 4 are not.
    const arranged = arrangeShiftMembers([[1, 2], [3, 4], [1, 5], [2, 3], [1, 3]]);
    check(arranged[2][0] === 1, 'worker listed first stays first');
    check(arranged[3].join() === '3,2', 'first-listed worker goes ahead of a second-listed one');
    check(arranged[4].join() === '1,3', 'when two first-listed workers meet, the earlier one goes first');
}

function testShiftDates() {
    console.log('\n--- shift dates ---');
    const set = updateShiftDates(['', '', '2027-01-04', ''], 1, '2026-12-30');
    check(set.join() === ',2026-12-30,2027-01-04,', 'setting a date on an undated shift changes only that shift');

    const dated = ['2026-12-28', '2026-12-30', '2026-12-31', '', '2027-01-07'];
    const moved = updateShiftDates(dated, 1, '2027-01-02');
    check(moved.join() === '2026-12-28,2027-01-02,2027-01-03,,2027-01-10',
        'changing a date moves later dates and keeps their distance from it');

    const earlier = updateShiftDates(dated, 1, '2026-12-25');
    check(earlier.join() === '2026-12-28,2026-12-25,2026-12-26,,2027-01-02', 'moving a date earlier works the same way');

    const cleared = updateShiftDates(dated, 1, '');
    check(cleared.join() === '2026-12-28,,2026-12-31,,2027-01-07', 'removing a date clears only that shift');

    check(fillShiftDates(3, '2026-12-31').join() === '2026-12-31,2027-01-01,2027-01-02', 'fill daily');
    check(fillShiftDates(3, '2026-02-17', 7).join() === '2026-02-17,2026-02-24,2026-03-03', 'fill weekly');
    check(fillShiftDates(2, '').join() === ',', 'fill without a start date leaves dates empty');

    check(updateShiftDates(['', ''], 0, 'junk').join() === ',', 'invalid dates are treated as removed');
    check(updateShiftDates(['2026-03-29', '2026-03-30'], 0, '2026-03-28')[1] === '2026-03-29',
        'day arithmetic is not thrown off by daylight saving');

    const text = formatSchedule([[1, 2], [1, 3]], null, 3, ['2026-03-01', '']);
    check(text.includes('Shift 1 (2026-03-01): Worker 1 & Worker 2') && text.includes('Shift 2: Worker 1'),
        'formatted schedule shows dates');
}

function testEdgeCases() {
    console.log('\n--- edge cases ---');
    for (const bad of [1, 0, -3, 2.5, NaN]) {
        let threw = false;
        try { generatePairs(bad); } catch (e) { threw = true; }
        check(threw, `rejects ${bad} workers`);
    }
    check(generateSchedule(2).length === 1, '2 workers produce a single shift');
    let threw = false;
    try { getScheduleStats([]); } catch (e) { threw = true; }
    check(threw, 'stats reject an empty schedule');

    const text = formatSchedule(generateSchedule(3), ['A', 'B', 'C']);
    check(text.includes('Shift 1:') && text.includes('A') && !text.includes('Worker 1'), 'formats with worker names');
}

function run() {
    const arg = parseInt(process.argv[2], 10);
    const sizes = Number.isInteger(arg) ? [arg] : [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 25, 30];
    sizes.forEach(testSize);

    if (!Number.isInteger(arg)) {
        testSummaries();
        testLargerShifts();
        testOrdering();
        testFairness();
        testSoloShifts();
        testDisplayOrder();
        testShiftDates();
        testEdgeCases();
    }

    console.log(failures === 0 ? '\n🎉 ALL TESTS PASSED' : `\n💥 ${failures} CHECK(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
}

run();
