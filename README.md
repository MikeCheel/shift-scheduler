# Shift Scheduler

![License](https://img.shields.io/badge/license-MIT-blue.svg)

Make a fair work schedule in seconds. Tell it how many workers you have and it builds an ordered list of shifts where:

- every pair of workers shares a shift, once
- nobody works two shifts in a row (where the numbers allow it)
- each worker gets as much rest as possible between shifts

**[Open the Shift Scheduler](https://mikecheel.github.io/shift-scheduler/)**. It runs in your browser and there is nothing to install.

## How to use it

1. Enter the **number of workers** (2 to 50).
2. Optional: change **workers per shift** (the default is 2).
3. Optional: type **worker names**, one per line or separated by commas. Leave this empty to use Worker 1, Worker 2, and so on.
4. Optional: add a **date** and **description** to label the schedule.
5. Click **Generate Schedule**.

You then get:

- **Shifts in order**: each shift and who works it. You can set a date on any shift, or use **Fill Dates** to date them all at once.
- **Shifts by worker**: for each worker, their shift numbers and a bar showing their rest. Blue is a shift worked, grey is shifts off (the number is how many), and red is a back-to-back shift.
- **Schedule Statistics**: unique pairs, back-to-back shifts, and the minimum and average rest.

### Buttons

| Button | What it does |
| --- | --- |
| Generate Schedule | Builds the schedule |
| Clear Schedule | Clears the results on screen |
| Save in Browser | Keeps the schedule in this browser; open or delete it later from **Saved Schedules** |
| Print Schedule | Prints a clean, paper-friendly copy |
| Download File / Open File… | Saves a schedule to a file, or opens one, so you can move it to another device |
| Sun/moon icon (top right) | Switches between light and dark mode |

Saved schedules stay on the device and browser where you saved them. Use **Download File** to back one up or move it.

## Good to know

- **3 or 4 workers in pairs:** back-to-back shifts can't be avoided. The statistics panel tells you when this happens.
- **1 worker per shift:** there are no pairs, so workers simply take turns. You can choose how many shifts to make.
- **More than 2 workers per shift:** every pair still shares a shift at least once, but some pairs may share more than once. The statistics panel shows how many.

## Run it yourself

Download or clone the project and open `index.html` in a browser. No build step or install is needed.

```bash
git clone https://github.com/MikeCheel/shift-scheduler.git
cd shift-scheduler
```

### Run the tests

You need [Node.js](https://nodejs.org/).

```bash
npm test                                        # all checks
node src/tests/schedule-generator-tests.js 7    # one team size
```

The tests check team sizes 3 to 30. They confirm every pair meets once, everyone works the same number of shifts, and rest between shifts is as good as it can be.

## Project layout

```
index.html                              The whole app (page, styles, and interface code)
src/scripts/schedule-generator.js       The scheduling logic
src/tests/schedule-generator-tests.js   Tests for the scheduling logic
```

## How the schedule is built

1. **Pairing:** the circle method, a standard round-robin technique, makes every pair meet once. The rounds are arranged so each worker's shifts land far apart.
2. **Ordering:** the shifts are reordered to push a worker's shifts further apart where possible.
3. **Fairness:** a final search evens out rest so no worker gets noticeably more or less than the others. Perfect fairness is sometimes impossible, for example with 6 workers in pairs, so it finds the fairest order it can in about a second.
4. **Numbering:** workers are numbered in order of first appearance, so the first shifts follow your worker list (1 & 2, 3 & 4, ...).

More detail is in the comments at the top of [schedule-generator.js](src/scripts/schedule-generator.js).

## Browser support

Current versions of Chrome, Firefox, Safari and Edge.

## Contributing

Fork the repository, make your change on a branch, run the tests, and open a pull request.

## License

MIT. See [LICENSE](LICENSE).
