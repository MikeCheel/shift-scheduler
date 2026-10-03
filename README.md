# Worker Shift Scheduler

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26.svg?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6.svg?logo=css3&logoColor=white)

A web application that generates two-person shift schedules where every pair of workers shares exactly one shift, nobody works two shifts in a row, and each worker gets as much rest as possible between their shifts.

**▶ [Open the Shift Scheduler](https://mikecheel.github.io/shift-scheduler/)** — runs in your browser, nothing to install.

## 🚀 Features

- **📅 Fair pairing** - Every pair of workers shares exactly one shift (circle method)
- **😴 Rest between shifts** - No back-to-back shifts for 5+ workers; each worker's shifts are spread out (as far apart as possible for an even number of workers in pairs, within one shift of that for an odd number)
- **🌙 Dark Mode Support** - Toggle between light and dark themes with system preference detection
- **👥 Custom Worker Names** - Optionally use real worker names instead of generic ones
- **📊 Schedule Statistics** - Unique pairs, back-to-back count, minimum and average rest, plus a per-worker table
- **💾 Save & Open** - Save schedules in the browser, or download them as a file and open the file again on any device
- **🗓️ Date & Description** - Optionally label a schedule; the label shows on screen, in print and in the saved list
- **👥 Workers per shift** - Two by default; choose any size up to the team size
- **🖨️ Print Functionality** - Professional print layout optimized for paper
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **⚡ Real-time Updates** - Auto-sync worker count with names for convenience
- **🧪 Comprehensive Test Suite** - Full test coverage with validation for schedule completeness and fairness

## 🎯 Quick Start

### Option 1: Direct Usage
Simply open `index.html` in any modern web browser - no installation required!

### Option 2: Local Development
```bash
# Clone the repository
git clone <your-repository-url>

# Navigate to the project directory
cd shift-scheduler

# Open the application
start index.html  # Windows
# or
open index.html   # macOS
# or
xdg-open index.html  # Linux
```

## 📖 Usage Guide

### Basic Usage
1. **Enter Number of Workers**: Input the total number of workers (minimum 2, maximum 50), and optionally how many work each shift (default 2)
2. **Add Worker Names** (Optional): Enter names one per line or comma-separated
3. **Generate Schedule**: Click "Generate Schedule" to create the rotation
4. **Print or Clear**: Use "Print Schedule" or "Clear Schedule" as needed

### Advanced Features

#### Dark Mode
- Click the moon/sun icon in the top-right corner
- Theme preference is saved automatically
- Supports system-level dark mode detection

#### Worker Names
- Leave empty for generic names (Worker 1, Worker 2, etc.)
- Names automatically sync with worker count
- Supports both newline and comma-separated input

## 🏗️ Project Structure

```
shift-scheduler/
├── README.md                 # Project documentation
├── LICENSE                   # MIT License
├── .gitignore               # Git ignore rules
├── package.json             # Project configuration
├── index.html               # Main application file
└── src/
    ├── scripts/
    │   └── schedule-generator.js    # Core scheduling algorithms
    └── tests/
        └── schedule-generator-tests.js  # Comprehensive test suite
```

## 🧪 Running Tests

```bash
# Run the comprehensive test suite
node src/tests/schedule-generator-tests.js
```

The test suite validates, for team sizes 3-30:
- Every pair of workers appears exactly once
- Every worker works the same number of shifts
- No back-to-back shifts (5+ workers; unavoidable at 3-4)
- Minimum and average rest between a worker's shifts

```bash
node src/tests/schedule-generator-tests.js      # all checks
node src/tests/schedule-generator-tests.js 7    # one team size
```

## 🔧 Technical Details

### How it works

Generation has two steps (see `src/scripts/schedule-generator.js`):

1. **Pairing** - the circle method produces every pair exactly once. An odd number of workers rotates; each round one of them sits out and the rest pair up by distance from them, so each worker's position barely moves between rounds and their shifts end up about N/2 apart. With an even team the extra worker partners whoever sits out.
2. **Ordering** - the shifts are then reordered if that spaces them out more. A depth-first search tries for a minimum number of shifts between a worker's shifts, starting at an upper bound and stepping down, with a few attempts and a step budget per target. It keeps the starting order unless it finds a better one.

3. **Fairness** - shifts are then reordered so rest is shared out evenly. The minimum rest never drops and no gap grows more than one shift past the longest one. In order of importance: no extra back-to-back shifts, the same number of long breaks for everyone, few short breaks (first for the worker with the most, then overall), short breaks spread evenly, no oversized gaps, then breaks close to the ideal spacing. Schedules up to 120 shifts get a budgeted exhaustive search; every schedule then gets a local search. Perfect fairness is often impossible (for example with 6 workers in pairs); the search finds the fairest order it can within about a second.
4. **Numbering** - workers are numbered in the order they first appear, so the opening shifts follow the worker list (1 & 2, 3 & 4, ...).

The upper bound is about N/2 - 1 shifts (N/k - 1 for groups of k), one less when the groups split the team exactly. It is a ceiling, not a promise. For pairs the starting order already reaches it with an even team and is at most one short with an odd team. The search sometimes closes that last step.

With 3 or 4 workers in pairs, back-to-back shifts cannot be avoided; the stats panel says so.

**1 worker per shift:** there are no pairs, so workers simply take turns in order (1, 2, 3, 1, 2, 3, ...), which gives everyone the most rest possible. Choose the number of shifts, or leave it empty for one round. The pairing statistics are hidden in this mode.

**More than 2 workers per shift:** a shift is a group, and every pair of workers must still share a shift at least once. Exact fits are rare, so groups are built greedily to cover all pairs with as few repeats as possible, and the stats panel reports repeated pairs. Back-to-back shifts are still avoided where possible, but with large shifts relative to the team they can't always be.

### Saving

Saved schedules live in your browser's local storage, so they stay on that device. Use Download File / Open File… to move one to another device or keep a backup.

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Circle Method** for round-robin pairing
- Round-robin scheduling based on tournament pairing principles
- Modern UI design inspired by current web standards
- Test-driven development approach for reliability

---

**Made with ❤️ for fair scheduling**