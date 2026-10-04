/**
 * Shift Schedule Generator
 *
 * Rules:
 *  1. No two workers share a shift again until every pair has shared one.
 *  2. No worker works two shifts in a row.
 *  3. The more shifts between a worker's own shifts, the better.
 *
 * A "shift" is a group of workers (2 by default). A schedule is a flat, ordered
 * list of shifts. Generation is split into two steps:
 *   - generateGroups: cover every pair of workers (circle method for pairs,
 *                     a greedy cover that avoids repeat pairings for larger groups)
 *   - orderShifts:    reorder those shifts to spread out each worker's shifts
 *
 * With 2 workers per shift every pair meets exactly once. With larger shifts an
 * exact fit isn't always possible, so some pairs may meet again; the greedy cover
 * keeps those repeats as low as it can.
 *
 * With 1 worker per shift there are no pairs, so rule 1 doesn't apply: the
 * schedule is a plain rotation (generateRotation) of a chosen number of shifts.
 *
 * Rest between shifts: for pairs the generated order already reaches the best
 * possible minimum rest with an even number of workers, and is at most one short
 * of it with an odd number. Larger groups rely on a bounded search, so the
 * minimum rest is good but not guaranteed to be the best possible.
 */

/**
 * Every pair of workers exactly once, via the circle method, in an order that
 * already spaces each worker's shifts well.
 *
 * An odd number M of workers rotates; in round r worker r sits out and the others
 * pair up as (r - i, r + i), listed by increasing distance i. A worker's position
 * moves by at most one from round to round, so their shifts are about M/2 apart.
 * With an even team the last worker meets the one sitting out, first in each round.
 *
 * Returns an array of pairs [a, b] (a < b) with workers numbered 1..numWorkers.
 */
function generatePairs(numWorkers) {
    if (!Number.isInteger(numWorkers) || numWorkers < 2) {
        throw new Error("Number of workers must be at least 2");
    }

    const rotating = numWorkers % 2 === 0 ? numWorkers - 1 : numWorkers;
    const half = (rotating - 1) / 2;
    const pairs = [];

    for (let round = 0; round < rotating; round++) {
        if (rotating !== numWorkers) pairs.push([round + 1, numWorkers]);
        for (let i = 1; i <= half; i++) {
            const a = (round - i + rotating) % rotating + 1;
            const b = (round + i) % rotating + 1;
            pairs.push(a < b ? [a, b] : [b, a]);
        }
    }

    return pairs;
}

/**
 * Shifts of `workersPerShift` workers that together cover every pair of workers.
 * Pairs use the circle method (exact). Larger groups are built greedily: each
 * shift is grown one worker at a time, preferring workers who haven't yet met the
 * rest of the group, and repeating until every pair has shared a shift.
 */
function generateGroups(numWorkers, workersPerShift = 2) {
    if (!Number.isInteger(numWorkers) || numWorkers < 2) {
        throw new Error("Number of workers must be at least 2");
    }
    if (!Number.isInteger(workersPerShift) || workersPerShift < 2) {
        throw new Error("Workers per shift must be at least 2");
    }
    if (workersPerShift > numWorkers) {
        throw new Error("Workers per shift can't be more than the number of workers");
    }

    if (workersPerShift === 2) return generatePairs(numWorkers);
    if (workersPerShift === numWorkers) {
        return [Array.from({length: numWorkers}, (_, i) => i + 1)];
    }

    const met = Array.from({length: numWorkers + 1}, () => new Array(numWorkers + 1).fill(false));
    const unmetCount = new Array(numWorkers + 1).fill(numWorkers - 1);
    const shiftCount = new Array(numWorkers + 1).fill(0);
    let remaining = numWorkers * (numWorkers - 1) / 2;
    const groups = [];

    // True when worker x should be chosen over worker y (more unmet pairs, then fewer shifts, then lower number).
    const better = (x, y, key) => {
        if (y === null) return true;
        const kx = key(x);
        const ky = key(y);
        if (kx[0] !== ky[0]) return kx[0] > ky[0];
        if (kx[1] !== ky[1]) return kx[1] > ky[1];
        if (kx[2] !== ky[2]) return kx[2] < ky[2];
        return x < y;
    };

    while (remaining > 0) {
        let seed = null;
        const seedKey = w => [unmetCount[w], 0, shiftCount[w]];
        for (let w = 1; w <= numWorkers; w++) {
            if (better(w, seed, seedKey)) seed = w;
        }

        const group = [seed];
        while (group.length < workersPerShift) {
            let pick = null;
            const key = w => [
                group.filter(g => !met[w][g]).length, // new pairs this worker would add
                unmetCount[w],
                shiftCount[w]
            ];
            for (let w = 1; w <= numWorkers; w++) {
                if (group.includes(w)) continue;
                if (better(w, pick, key)) pick = w;
            }
            group.push(pick);
        }

        for (let i = 0; i < group.length; i++) {
            shiftCount[group[i]]++;
            for (let j = i + 1; j < group.length; j++) {
                const a = group[i];
                const b = group[j];
                if (!met[a][b]) {
                    met[a][b] = met[b][a] = true;
                    unmetCount[a]--;
                    unmetCount[b]--;
                    remaining--;
                }
            }
        }
        groups.push(group.sort((a, b) => a - b));
    }

    return groups;
}

/**
 * Upper bound on the smallest number of shifts between one worker's shifts. It is
 * a ceiling, not a promise: an ordering that reaches it may not exist.
 *
 * Within any m = floor(numWorkers / workersPerShift) consecutive shifts nobody can
 * work twice when the gap is m - 1, which is as many as fit. When the shifts divide
 * the team exactly, every window of m shifts then holds the whole team, and sliding
 * the window forces shift i + m to repeat shift i's workers, so the bound drops by one.
 * Solo shifts may repeat, so that drop doesn't apply to them.
 */
function theoreticalMinGap(numWorkers, workersPerShift = 2) {
    if (workersPerShift === 1) return Math.max(0, numWorkers - 1);
    const perRound = Math.floor(numWorkers / workersPerShift);
    const exactFit = numWorkers % workersPerShift === 0 && workersPerShift < numWorkers;
    return Math.max(0, perRound - 1 - (exactFit ? 1 : 0));
}

/**
 * How well an order spaces each worker's shifts: the smallest gap (Infinity if
 * nobody repeats) and the number of back-to-back shifts.
 */
function spacingOf(schedule, numWorkers) {
    const lastShift = new Array(numWorkers + 1).fill(null);
    let minGap = Infinity;
    let backToBack = 0;
    schedule.forEach((group, slot) => {
        for (const worker of group) {
            if (lastShift[worker] !== null) {
                const gap = slot - lastShift[worker] - 1;
                minGap = Math.min(minGap, gap);
                if (gap === 0) backToBack++;
            }
            lastShift[worker] = slot;
        }
    });
    return { minGap, backToBack };
}

/**
 * Greedy order with no backtracking: each slot takes the shift whose workers have
 * rested longest. It never fails, and keeps back-to-back shifts down when they
 * can't be avoided entirely.
 */
function restedFirstOrder(groups, numWorkers) {
    const lastShift = new Array(numWorkers + 1).fill(-Infinity);
    const used = new Array(groups.length).fill(false);
    const order = [];
    for (let slot = 0; slot < groups.length; slot++) {
        let best = -1;
        let bestWorst = -Infinity;
        let bestSum = -Infinity;
        groups.forEach((group, i) => {
            if (used[i]) return;
            let worst = Infinity;
            let sum = 0;
            for (const worker of group) {
                const rest = Math.min(slot - lastShift[worker] - 1, groups.length);
                worst = Math.min(worst, rest);
                sum += rest;
            }
            if (worst > bestWorst || (worst === bestWorst && sum > bestSum)) {
                best = i;
                bestWorst = worst;
                bestSum = sum;
            }
        });
        used[best] = true;
        groups[best].forEach(worker => { lastShift[worker] = slot; });
        order.push([...groups[best]]);
    }
    return order;
}

/**
 * How fairly a schedule shares out rest. The ideal gap is what a worker would get
 * with perfectly even spacing (shifts / shifts per worker - 1). A "short" break is
 * more than half a shift below it and a "long" break more than half a shift above.
 * Returns, in order of importance (see FAIRNESS_ORDER):
 *   backToBack  - gaps of 0
 *   longSpread  - most long breaks any worker gets minus the fewest
 *   maxShort    - most short breaks any one worker gets
 *   totalShort  - short breaks across the team
 *   shortSpread - most short breaks any worker gets minus the fewest
 *   maxGap      - longest gap anyone gets
 *   deviation   - total distance of every gap from the ideal (lower = more regular)
 */
function restFairness(schedule, numWorkers) {
    return summarizeRest(workerRest(schedule, numWorkers, restCounter(schedule, numWorkers)));
}

function workerRest(schedule, numWorkers, counts) {
    const positions = Array.from({length: numWorkers}, () => []);
    schedule.forEach((group, slot) => group.forEach(worker => positions[worker - 1].push(slot)));
    return positions.map(counts);
}

/**
 * Returns a function giving one worker's rest counts from their sorted slots.
 * Gaps below `floor` or above `cap` are counted as outOfRange.
 */
function restCounter(schedule, numWorkers, floor = 0, cap = Infinity) {
    const filled = schedule.reduce((sum, group) => sum + group.length, 0);
    const ideal = filled ? schedule.length * numWorkers / filled - 1 : 0;
    return positions => {
        let outOfRange = 0, backToBack = 0, short = 0, long = 0, deviation = 0, maxGap = 0;
        for (let i = 1; i < positions.length; i++) {
            const gap = positions[i] - positions[i - 1] - 1;
            if (gap < floor || gap > cap) outOfRange++;
            if (gap === 0) backToBack++;
            if (gap < ideal - 0.5) short++;
            if (gap > ideal + 0.5) long++;
            deviation += Math.abs(gap - ideal);
            maxGap = Math.max(maxGap, gap);
        }
        return { outOfRange, backToBack, short, long, deviation, maxGap };
    };
}

/** Team totals from per-worker rest counts. */
function summarizeRest(workers) {
    const result = { outOfRange: 0, backToBack: 0, longSpread: 0, maxShort: 0, totalShort: 0, shortSpread: 0, maxGap: 0, deviation: 0 };
    let minShort = Infinity, minLong = Infinity, maxLong = 0;
    for (const rest of workers) {
        result.outOfRange += rest.outOfRange;
        result.backToBack += rest.backToBack;
        result.maxShort = Math.max(result.maxShort, rest.short);
        result.totalShort += rest.short;
        result.maxGap = Math.max(result.maxGap, rest.maxGap);
        result.deviation += rest.deviation;
        minShort = Math.min(minShort, rest.short);
        minLong = Math.min(minLong, rest.long);
        maxLong = Math.max(maxLong, rest.long);
    }
    result.longSpread = workers.length ? maxLong - minLong : 0;
    result.shortSpread = workers.length ? result.maxShort - minShort : 0;
    return result;
}

// Fairness goals in order of importance; an earlier goal always wins over later ones.
// outOfRange (gaps outside the limits balanceRest must keep) is only ever non-zero
// while searching.
const FAIRNESS_ORDER = ['outOfRange', 'backToBack', 'longSpread', 'maxShort', 'totalShort', 'shortSpread', 'maxGap', 'deviation'];

/** Negative when rest summary a is fairer than b, positive when less fair, 0 when equal. */
function compareFairness(a, b) {
    for (const key of FAIRNESS_ORDER) {
        const diff = a[key] - b[key];
        if (Math.abs(diff) > 1e-9) return diff;
    }
    return 0;
}

/**
 * Reorders shifts so rest is shared out as fairly as possible (see restFairness for
 * the goals, most important first). Two limits always hold: no gap drops below the
 * schedule's current minimum, and no gap grows more than one shift beyond its
 * current longest.
 *
 * Schedules of up to 120 shifts first get a depth-first search that abandons any
 * partial schedule that provably can't beat the best so far. Every schedule then
 * gets a local search that swaps pairs of shifts. Both are deterministic and only
 * keep improvements, so the result is never less fair than the input.
 */
function balanceRest(schedule, numWorkers, options = {}) {
    const total = schedule.length;
    const floor = spacingOf(schedule, numWorkers).minGap;
    let best = schedule.map(group => [...group]);
    if (total < 3 || floor === Infinity) return best;

    const cap = restFairness(schedule, numWorkers).maxGap + 1;
    if (total <= (options.exactLimit || 120)) {
        const budget = options.exactBudget || (total <= 45 ? 1500000 : 300000);
        best = exactBalance(best, numWorkers, floor, cap, budget) || best;
    }
    const iterations = options.iterations || Math.min(80000, Math.max(30000, total * 60));
    return swapBalance(best, numWorkers, floor, cap, iterations);
}

/**
 * Builds the schedule one shift at a time (keeping every gap within [floor, cap]),
 * trying the shifts that look fairest first. A branch is abandoned once a lower
 * bound on its leading goals is already worse than the best complete schedule.
 * Returns a fairer ordering than `groups`, or null if none was found in budget.
 */
function exactBalance(groups, numWorkers, floor, cap, nodeBudget) {
    const total = groups.length;
    const filled = groups.reduce((sum, group) => sum + group.length, 0);
    const ideal = total * numWorkers / filled - 1;
    const remaining = new Array(numWorkers + 1).fill(0);
    groups.forEach(group => group.forEach(worker => { remaining[worker]++; }));
    const lastShift = new Array(numWorkers + 1).fill(-1);
    const short = new Array(numWorkers + 1).fill(0);
    const long = new Array(numWorkers + 1).fill(0);
    const used = new Array(total).fill(false);
    const order = [];
    let backToBack = 0;
    let best = restFairness(groups, numWorkers);
    let found = null;
    let nodes = 0;

    // Lower bounds for the leading goals; later goals aren't bounded.
    function cannotWin() {
        let maxLong = 0, leastPossibleLong = Infinity, maxShort = 0, totalShort = 0;
        for (let worker = 1; worker <= numWorkers; worker++) {
            const gapsLeft = lastShift[worker] < 0 ? Math.max(0, remaining[worker] - 1) : remaining[worker];
            maxLong = Math.max(maxLong, long[worker]);
            leastPossibleLong = Math.min(leastPossibleLong, long[worker] + gapsLeft);
            maxShort = Math.max(maxShort, short[worker]);
            totalShort += short[worker];
        }
        const bound = { backToBack, longSpread: Math.max(0, maxLong - leastPossibleLong), maxShort, totalShort };
        for (const key of ['backToBack', 'longSpread', 'maxShort', 'totalShort']) {
            if (bound[key] !== best[key]) return bound[key] > best[key];
        }
        return false;
    }

    function place(slot) {
        if (slot === total) {
            const result = restFairness(order, numWorkers);
            if (compareFairness(result, best) < 0) {
                best = result;
                found = order.map(group => [...group]);
            }
            return;
        }
        if (++nodes > nodeBudget || cannotWin()) return;
        for (let worker = 1; worker <= numWorkers; worker++) {
            if (remaining[worker] > 0 && lastShift[worker] >= 0 && slot - lastShift[worker] - 1 > cap) return;
        }

        const candidates = [];
        for (let i = 0; i < total; i++) {
            if (used[i]) continue;
            let ok = true;
            let score = 0; // lower looks fairer: near-ideal gaps, long/short breaks to those with fewest
            for (const worker of groups[i]) {
                if (lastShift[worker] < 0) {
                    score -= 0.5;
                    continue;
                }
                const gap = slot - lastShift[worker] - 1;
                if (gap < floor || gap > cap) { ok = false; break; }
                score += Math.abs(gap - ideal);
                if (gap > ideal + 0.5) score += 2 * long[worker];
                if (gap < ideal - 0.5) score += 2 * short[worker];
            }
            if (ok) candidates.push({ index: i, score });
        }
        candidates.sort((x, y) => (x.score - y.score) || (x.index - y.index));

        for (const { index } of candidates) {
            const members = groups[index];
            const previous = members.map(worker => [lastShift[worker], short[worker], long[worker]]);
            const previousBackToBack = backToBack;
            for (const worker of members) {
                if (lastShift[worker] >= 0) {
                    const gap = slot - lastShift[worker] - 1;
                    if (gap === 0) backToBack++;
                    if (gap < ideal - 0.5) short[worker]++;
                    if (gap > ideal + 0.5) long[worker]++;
                }
                lastShift[worker] = slot;
                remaining[worker]--;
            }
            used[index] = true;
            order.push(members);

            place(slot + 1);

            order.pop();
            used[index] = false;
            backToBack = previousBackToBack;
            members.forEach((worker, i) => {
                [lastShift[worker], short[worker], long[worker]] = previous[i];
                remaining[worker]++;
            });
            if (nodes > nodeBudget) return;
        }
    }

    place(0);
    return found;
}

/**
 * Local search: swap two shifts and keep the swap when the schedule is at least as
 * fair. Early on it sometimes keeps a worse swap (even one breaking the gap limits)
 * to get out of dead ends; the fairest schedule within the limits is returned.
 */
function swapBalance(schedule, numWorkers, floor, cap, iterations) {
    const total = schedule.length;
    const order = schedule.map(group => [...group]);
    const counts = restCounter(schedule, numWorkers, floor, cap);
    const positions = Array.from({length: numWorkers + 1}, () => []);
    order.forEach((group, slot) => group.forEach(worker => positions[worker].push(slot)));
    const rest = positions.map(slots => counts(slots));
    const summary = () => summarizeRest(rest.slice(1));

    const random = seededRandom(1);
    let current = summary();
    let bestSummary = current;
    let best = order.map(group => [...group]);

    for (let step = 0; step < iterations; step++) {
        const i = Math.floor(random() * total);
        const j = Math.floor(random() * total);
        if (i === j || order[i].some(worker => order[j].includes(worker))) continue;

        const touched = [...order[i], ...order[j]];
        const saved = touched.map(worker => [positions[worker], rest[worker]]);
        for (const worker of touched) {
            const from = order[i].includes(worker) ? i : j;
            const to = from === i ? j : i;
            positions[worker] = positions[worker].map(slot => slot === from ? to : slot).sort((a, b) => a - b);
            rest[worker] = counts(positions[worker]);
        }

        const next = summary();
        const explore = 0.1 * (1 - step / iterations); // chance of keeping a worse swap
        if (compareFairness(next, current) <= 0 || random() < explore) {
            [order[i], order[j]] = [order[j], order[i]];
            current = next;
            if (compareFairness(current, bestSummary) < 0) {
                bestSummary = current;
                best = order.map(group => [...group]);
            }
        } else {
            touched.forEach((worker, k) => { [positions[worker], rest[worker]] = saved[k]; });
        }
    }
    return best;
}

/**
 * Renumbers workers in the order they first appear, so the opening shifts read
 * 1 & 2, 3 & 4, ... The schedule itself (who works with whom, and when) is unchanged.
 */
function numberByFirstAppearance(schedule) {
    const newNumber = new Map();
    for (const group of schedule) {
        [...group].sort((a, b) => a - b).forEach(worker => {
            if (!newNumber.has(worker)) newNumber.set(worker, newNumber.size + 1);
        });
    }
    return schedule.map(group => group.map(worker => newNumber.get(worker)).sort((a, b) => a - b));
}

/** Small seeded random number generator (mulberry32) so schedules are reproducible. */
function seededRandom(seed) {
    return () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Reorders shifts to raise the minimum gap between a worker's shifts. The starting
 * point is the better of the given order and a rested-first greedy order (larger
 * minimum gap, then fewer back-to-back shifts), and it is kept unless the search
 * finds a larger minimum gap, so the result is never worse than the input.
 *
 * Each target gap, from the theoretical best down, gets a few search attempts with
 * a node budget each. Returns { schedule, minGapProvenBest }: minGapProvenBest is
 * true when no better minimum gap is possible for these shifts (the target above it
 * was searched exhaustively, or the bound was reached), and false when the search
 * gave up on a better one.
 */
function orderShifts(groups, numWorkers, options = {}) {
    const nodeBudget = options.nodeBudget || 5000;
    const attempts = options.attempts || 3;
    const workersPerShift = groups.length ? groups[0].length : 2;
    const given = groups.map(group => [...group]);
    const greedy = restedFirstOrder(groups, numWorkers);
    const givenSpacing = spacingOf(given, numWorkers);
    const greedySpacing = spacingOf(greedy, numWorkers);
    const greedyBetter = greedySpacing.minGap > givenSpacing.minGap ||
        (greedySpacing.minGap === givenSpacing.minGap && greedySpacing.backToBack < givenSpacing.backToBack);
    const baseline = greedyBetter ? greedy : given;
    const baselineGap = Math.max(givenSpacing.minGap, greedySpacing.minGap);
    const bound = theoreticalMinGap(numWorkers, workersPerShift);

    if (baselineGap >= bound) return { schedule: baseline, minGapProvenBest: true };

    // Whether the target just above the current one was ruled out (nothing is above the bound).
    let aboveImpossible = true;

    for (let target = bound; target > baselineGap; target--) {
        let impossible = false;
        for (let attempt = 0; attempt < attempts && !impossible; attempt++) {
            const result = searchOrder(groups, numWorkers, target, nodeBudget, attempt);
            if (result === 'impossible') {
                impossible = true;
            } else if (result !== 'budget') {
                return { schedule: result, minGapProvenBest: aboveImpossible };
            }
        }
        aboveImpossible = impossible;
    }

    return { schedule: baseline, minGapProvenBest: aboveImpossible };
}

/**
 * Depth-first search for an ordering where every worker has at least `minGap`
 * shifts between their own. Shifts whose workers have the most shifts still to
 * place go first, then the longest-rested; attempt 0 breaks ties by index and later
 * attempts break them randomly. A branch is cut as soon as some worker's remaining
 * shifts can no longer fit, spaced `minGap` apart, in the slots left.
 *
 * Returns the ordering, 'impossible' if the whole search space was ruled out, or
 * 'budget' if it gave up after `nodeBudget` steps.
 */
function searchOrder(groups, numWorkers, minGap, nodeBudget, attempt = 0) {
    const total = groups.length;
    const lastShift = new Array(numWorkers + 1).fill(-Infinity);
    const remaining = new Array(numWorkers + 1).fill(0);
    groups.forEach(group => group.forEach(worker => { remaining[worker]++; }));
    const random = seededRandom(attempt);
    const tieBreak = groups.map((_, i) => attempt === 0 ? i : random());
    const used = new Array(total).fill(false);
    const order = [];
    let nodes = 0;

    function place(slot) {
        if (slot === total) return true;
        if (++nodes > nodeBudget) return false;

        for (let worker = 1; worker <= numWorkers; worker++) {
            if (remaining[worker] === 0) continue;
            const earliest = Math.max(slot, lastShift[worker] + minGap + 1);
            if (earliest + (remaining[worker] - 1) * (minGap + 1) >= total) return false;
        }

        const candidates = [];
        for (let i = 0; i < total; i++) {
            if (used[i]) continue;
            let worst = Infinity;
            let urgency = 0;
            for (const worker of groups[i]) {
                const rest = slot - lastShift[worker] - 1;
                if (rest < worst) worst = rest;
                urgency += remaining[worker];
            }
            if (worst < minGap) continue;
            candidates.push({ index: i, worst, urgency });
        }

        candidates.sort((x, y) =>
            (y.urgency - x.urgency) || (y.worst - x.worst) || (tieBreak[x.index] - tieBreak[y.index]));

        for (const { index } of candidates) {
            const members = groups[index];
            const previous = members.map(worker => lastShift[worker]);

            used[index] = true;
            members.forEach(worker => { lastShift[worker] = slot; remaining[worker]--; });
            order.push(members);

            if (place(slot + 1)) return true;

            order.pop();
            used[index] = false;
            members.forEach((worker, i) => { lastShift[worker] = previous[i]; remaining[worker]++; });

            if (nodes > nodeBudget) return false;
        }
        return false;
    }

    if (place(0)) return order.map(group => [...group]);
    return nodes > nodeBudget ? 'budget' : 'impossible';
}

/**
 * Solo shifts: workers take turns in order (1, 2, ..., numWorkers, 1, 2, ...), so
 * everyone gets numWorkers - 1 shifts of rest, the most possible. Defaults to one
 * round, each worker once.
 */
function generateRotation(numWorkers, numShifts = numWorkers) {
    if (!Number.isInteger(numWorkers) || numWorkers < 2) {
        throw new Error("Number of workers must be at least 2");
    }
    if (!Number.isInteger(numShifts) || numShifts < 1) {
        throw new Error("Number of shifts must be at least 1");
    }
    return Array.from({length: numShifts}, (_, i) => [i % numWorkers + 1]);
}

/**
 * Generates the full schedule and reports how good its ordering is.
 * Returns { schedule, minGapProvenBest } (see orderShifts). `options.numShifts`
 * sets the length of a 1-per-shift rotation and is ignored otherwise.
 */
function buildSchedule(numWorkers, workersPerShift = 2, options = {}) {
    const result = planSchedule(numWorkers, workersPerShift, options);
    if (!result.minGapProvenBest) {
        console.warn(`Schedule search gave up before proving the best spacing for ${numWorkers} workers, ${workersPerShift} per shift.`);
    }
    return result;
}

/**
 * Generates the full schedule: a flat, ordered list of shifts (arrays of workers).
 */
function generateSchedule(numWorkers, workersPerShift = 2, options = {}) {
    return planSchedule(numWorkers, workersPerShift, options).schedule;
}

/**
 * Cover the pairs, order the shifts for the largest minimum gap, share rest out
 * fairly, then number workers in order of first appearance.
 */
function planSchedule(numWorkers, workersPerShift, options) {
    if (workersPerShift === 1) {
        return { schedule: generateRotation(numWorkers, options.numShifts), minGapProvenBest: true };
    }
    const ordered = orderShifts(generateGroups(numWorkers, workersPerShift), numWorkers);
    const balanced = balanceRest(ordered.schedule, numWorkers);
    return { schedule: numberByFirstAppearance(balanced), minGapProvenBest: ordered.minGapProvenBest };
}

/**
 * Orders the workers within each shift for display, so a worker who is listed
 * first on their first shift stays listed first on later shifts.
 *
 * Shifts are read in order. On their first shift a worker becomes a "leader" if
 * they're listed first, and a "follower" otherwise. Each shift lists leaders first
 * (earliest leader wins if two meet), then followers, then newcomers. Putting
 * followers ahead of newcomers keeps the number of leaders, and so the number of
 * shifts where two leaders meet and one has to be listed second, as low as possible.
 *
 * Returns a new schedule; the shifts and their order are unchanged.
 */
function arrangeShiftMembers(schedule) {
    const leaderSince = new Map(); // worker -> index of the shift where they became a leader
    const seen = new Set();

    return schedule.map((group, index) => {
        const rank = worker => leaderSince.has(worker) ? 0 : seen.has(worker) ? 1 : 2;
        const arranged = [...group].sort((a, b) =>
            (rank(a) - rank(b)) ||
            ((leaderSince.get(a) ?? 0) - (leaderSince.get(b) ?? 0)) ||
            (a - b));

        if (!seen.has(arranged[0])) leaderSince.set(arranged[0], index);
        arranged.forEach(worker => seen.add(worker));
        return arranged;
    });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' -> whole days since 1970-01-01 (UTC, so no daylight-saving drift), or null. */
function dateToDays(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    const date = new Date(0);
    date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Math.round(date.getTime() / DAY_MS);
}

/** Whole days since 1970-01-01 -> 'YYYY-MM-DD' ('' outside years 1-9999). */
function daysToDate(days) {
    const date = new Date(days * DAY_MS);
    const year = date.getUTCFullYear();
    if (year < 1 || year > 9999) return '';
    const pad = (n, width) => String(n).padStart(width, '0');
    return `${pad(year, 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
}

/**
 * Sets the date of shift `index` and carries the change to the shifts after it.
 * Returns a new array of dates ('YYYY-MM-DD' or '' per shift).
 *
 *  - Changing a date moves every later shift that has a date by the same number
 *    of days, so each keeps its distance from the changed shift. Shifts without a
 *    date stay without one.
 *  - Setting a date on a shift that had none, or removing one ('' or invalid),
 *    changes only that shift.
 */
function updateShiftDates(shiftDates, index, value) {
    const dates = [...shiftDates];
    const oldDays = dateToDays(dates[index]);
    const newDays = dateToDays(value);
    dates[index] = newDays === null ? '' : daysToDate(newDays);
    if (oldDays === null || !dates[index]) return dates;

    const delta = newDays - oldDays;
    for (let i = index + 1; i < dates.length; i++) {
        const days = dateToDays(dates[i]);
        if (days !== null) dates[i] = daysToDate(days + delta);
    }
    return dates;
}

/**
 * Dates for `count` shifts: the first on `start` ('YYYY-MM-DD'), each later one
 * `stepDays` days after the one before. Returns all '' if `start` isn't a date.
 */
function fillShiftDates(count, start, stepDays = 1) {
    const startDays = dateToDays(start);
    return Array.from({ length: count }, (_, i) =>
        startDays === null ? '' : daysToDate(startDays + i * stepDays));
}

/**
 * Formats a schedule as readable text. `shiftDates` optionally gives a
 * 'YYYY-MM-DD' date (or '') for each shift.
 */
function formatSchedule(schedule, workerNames = null, numWorkers = null, shiftDates = null) {
    const count = numWorkers || new Set(schedule.flat()).size;
    if (workerNames && workerNames.length !== count) {
        console.warn("Worker names count doesn't match schedule");
        workerNames = null;
    }

    const nameOf = worker => workerNames ? workerNames[worker - 1] : `Worker ${worker}`;
    const lines = ["=== WORKER SCHEDULE ===", ""];
    arrangeShiftMembers(schedule).forEach((group, index) => {
        const date = shiftDates && shiftDates[index] ? ` (${shiftDates[index]})` : '';
        lines.push(`Shift ${index + 1}${date}: ${group.map(nameOf).join(' & ')}`);
    });
    return lines.join('\n');
}

/**
 * Per-worker view: their shift numbers (1-based), co-workers and rest gaps.
 */
function getWorkerSummaries(schedule, numWorkers) {
    const summaries = [];
    for (let worker = 1; worker <= numWorkers; worker++) {
        const shifts = [];
        const partners = [];
        schedule.forEach((group, index) => {
            if (group.includes(worker)) {
                shifts.push(index + 1);
                partners.push(group.filter(other => other !== worker));
            }
        });
        const gaps = shifts.slice(1).map((shift, i) => shift - shifts[i] - 1);
        summaries.push({ worker, shifts, partners, gaps });
    }
    return summaries;
}

/**
 * Returns schedule statistics, including how well the ordering rules are met.
 */
function getScheduleStats(schedule, numWorkers = null) {
    if (!Array.isArray(schedule) || schedule.length === 0) {
        throw new Error("Schedule is empty");
    }
    const totalWorkers = numWorkers || new Set(schedule.flat()).size;
    const workersPerShift = schedule[0].length;
    // Solo shifts have no pairs to cover.
    const expectedPairs = workersPerShift === 1 ? 0 : totalWorkers * (totalWorkers - 1) / 2;

    const pairCounts = new Map();
    const workerShifts = {};
    for (let w = 1; w <= totalWorkers; w++) workerShifts[w] = 0;

    schedule.forEach(group => {
        group.forEach(worker => { workerShifts[worker]++; });
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const key = [group[i], group[j]].sort((a, b) => a - b).join('-');
                pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
            }
        }
    });

    const repeatedPairs = [...pairCounts.values()].filter(count => count > 1).length;
    const shiftCounts = Object.values(workerShifts);

    const allGaps = getWorkerSummaries(schedule, totalWorkers).flatMap(s => s.gaps);
    const backToBack = allGaps.filter(gap => gap === 0).length;
    const minGap = allGaps.length ? Math.min(...allGaps) : null;
    const avgGap = allGaps.length
        ? allGaps.reduce((sum, gap) => sum + gap, 0) / allGaps.length
        : null;

    return {
        totalWorkers,
        workersPerShift,
        totalShifts: schedule.length,
        totalUniquePairs: pairCounts.size,
        expectedPairs,
        repeatedPairs,
        workerShifts,
        minShifts: Math.min(...shiftCounts),
        maxShifts: Math.max(...shiftCounts),
        isComplete: pairCounts.size === expectedPairs,
        backToBack,
        minGap,
        avgGap,
        // A ceiling on minGap; it is often out of reach, so don't present it as a target.
        minGapUpperBound: theoreticalMinGap(totalWorkers, workersPerShift)
    };
}

// Export for use in Node.js or browsers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generatePairs,
        generateGroups,
        orderShifts,
        buildSchedule,
        generateSchedule,
        generateRotation,
        balanceRest,
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
    };
}
