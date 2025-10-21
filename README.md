# Worker Shift Scheduler

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26.svg?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6.svg?logo=css3&logoColor=white)

A modern web application for generating fair and balanced work schedules using round-robin pairing algorithms, featuring the **Circle Algorithm** as the default method. Perfect for businesses, sports teams, and organizations that need to create rotating shift schedules.

## 🚀 Features

- **📅 Two Scheduling Algorithms** - Choose between Standard Round-Robin and **Circle Method** (default)
- **🌙 Dark Mode Support** - Toggle between light and dark themes with system preference detection
- **👥 Custom Worker Names** - Optionally use real worker names instead of generic ones
- **📊 Schedule Statistics** - View comprehensive statistics including unique pairs and shift distribution
- **🖨️ Print Functionality** - Professional print layout optimized for paper
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **⚡ Real-time Updates** - Auto-sync worker count with names for convenience
- **🧪 Comprehensive Test Suite** - Full test coverage with validation for schedule completeness and fairness
- **🔄 Fair BYE Rotation** - Intelligent break assignment for odd numbers of workers using backtracking

## 🎯 Quick Start

### Option 1: Direct Usage
Simply open `index.html` in any modern web browser - no installation required!

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/shift-scheduler-2.git

# Navigate to the project directory
cd shift-scheduler-2

# Open the application
start index.html  # Windows
# or
open index.html   # macOS
# or
xdg-open index.html  # Linux
```

## 📖 Usage Guide

### Basic Usage
1. **Enter Number of Workers**: Input the total number of workers (minimum 2, maximum 50)
2. **Add Worker Names** (Optional): Enter names one per line or comma-separated
3. **Select Algorithm**: Choose between Standard Round-Robin or **Circle Method** (recommended)
4. **Generate Schedule**: Click "Generate Schedule" to create the rotation
5. **Print or Clear**: Use "Print Schedule" or "Clear Schedule" as needed

### Advanced Features

#### Dark Mode
- Click the moon/sun icon in the top-right corner
- Theme preference is saved automatically
- Supports system-level dark mode detection

#### Algorithm Selection
- **Circle Method** (Default & Recommended): More intuitive, produces complete schedules, easier to understand
- **Standard Round-Robin**: Mathematical approach, better for very large teams

#### Worker Names
- Leave empty for generic names (Worker 1, Worker 2, etc.)
- Names automatically sync with worker count
- Supports both newline and comma-separated input

## 🏗️ Project Structure

```
shift-scheduler-2/
├── README.md                 # Project documentation
├── LICENSE                   # MIT License
├── .gitignore               # Git ignore rules
├── package.json             # Project configuration
├── ai-todos.md              # Development tracking
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

The test suite validates:
- Schedule completeness and fairness
- Unique pair generation
- Shift distribution equality
- Algorithm correctness for various team sizes
- Fair BYE rotation for odd numbers
- No consecutive work assignments
- Complete coverage of all possible worker pairs

### Test Commands

```bash
# Run all comprehensive tests
node src/tests/schedule-generator-tests.js

# Test specific number of workers
node src/tests/schedule-generator-tests.js 6

# Run validation test for specific count
node src/tests/schedule-generator-tests.js test 7
```

The test suite includes edge case testing, algorithm comparison, and comprehensive validation to ensure schedule quality and fairness.

## 🔧 Technical Details

### Algorithms Implemented

#### Circle Method (Default)
- Uses physical rotation of worker array
- More intuitive and easier to understand
- Produces complete schedules for all team sizes
- Recommended for most use cases
- Based on the circle method for round-robin tournaments

#### Standard Round-Robin
- Uses mathematical indexing with modulo operations
- More computationally elegant
- Better performance with very large teams

### Fair BYE Rotation System

For odd numbers of workers, the scheduler implements a **Fair BYE Rotation System** that ensures:

- **Equal Breaks**: Each worker gets exactly one break (paired with BYE) during the schedule
- **Fair Distribution**: No worker is paired with BYE again until all workers have had their turn
- **Complete Pairings**: All possible worker pairs are created exactly once
- **Balanced Workload**: Equal distribution of shifts among all workers

**How it works:**
1. When there are odd numbers of workers, one worker gets a break (BYE) each round
2. The system tracks which workers have had breaks using a backtracking algorithm
3. Workers are rotated through BYE assignments in a fair sequence
4. The algorithm ensures all possible pair combinations are created
5. Each worker works the same number of shifts (n-1 for n workers)

**Example with 5 workers:**
- Round 1: Worker 1 gets BYE, others work in pairs
- Round 2: Worker 2 gets BYE, others work in pairs
- Round 3: Worker 3 gets BYE, others work in pairs
- Round 4: Worker 4 gets BYE, others work in pairs
- Round 5: Worker 5 gets BYE, others work in pairs

**Backtracking Algorithm:**
For odd numbers, the system uses a backtracking approach to find valid pairings that haven't been used in previous rounds, ensuring complete coverage of all possible worker combinations.

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

- **Circle Method** implementation for round-robin scheduling
- **Fair BYE Rotation System** for odd number of workers
- Round-robin scheduling based on tournament pairing principles
- Modern UI design inspired by current web standards
- Test-driven development approach for reliability

---

**Made with ❤️ for fair scheduling**