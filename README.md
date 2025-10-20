# Employee Shift Scheduler

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26.svg?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6.svg?logo=css3&logoColor=white)

A modern web application for generating fair and balanced work schedules using round-robin pairing algorithms, featuring the **Circle Algorithm** as the default method. Perfect for businesses, sports teams, and organizations that need to create rotating shift schedules.

## 🚀 Features

- **📅 Two Scheduling Algorithms** - Choose between Standard Round-Robin and **Circle Algorithm** (default)
- **🌙 Dark Mode Support** - Toggle between light and dark themes with system preference detection
- **👥 Custom Employee Names** - Optionally use real employee names instead of generic ones
- **📊 Schedule Statistics** - View comprehensive statistics including unique pairs and shift distribution
- **🖨️ Print Functionality** - Professional print layout optimized for paper
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **⚡ Real-time Updates** - Auto-sync employee count with names for convenience

## 🎯 Quick Start

### Option 1: Direct Usage
Simply open `shift-scheduler.html` in any modern web browser - no installation required!

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/shift-scheduler-2.git

# Navigate to the project directory
cd shift-scheduler-2

# Open the application
start shift-scheduler.html  # Windows
# or
open shift-scheduler.html   # macOS
# or
xdg-open shift-scheduler.html  # Linux
```

## 📖 Usage Guide

### Basic Usage
1. **Enter Number of Employees**: Input the total number of employees (minimum 2, maximum 50)
2. **Add Employee Names** (Optional): Enter names one per line or comma-separated
3. **Select Algorithm**: Choose between Standard Round-Robin or **Circle Algorithm** (recommended)
4. **Generate Schedule**: Click "Generate Schedule" to create the rotation
5. **Print or Clear**: Use "Print Schedule" or "Clear Schedule" as needed

### Advanced Features

#### Dark Mode
- Click the moon/sun icon in the top-right corner
- Theme preference is saved automatically
- Supports system-level dark mode detection

#### Algorithm Selection
- **Circle Algorithm** (Default & Recommended): More intuitive, produces complete schedules, easier to understand
- **Standard Round-Robin**: Mathematical approach, better for very large teams

#### Employee Names
- Leave empty for generic names (Employee 1, Employee 2, etc.)
- Names automatically sync with employee count
- Supports both newline and comma-separated input

## 🏗️ Project Structure

```
shift-scheduler-2/
├── README.md                 # Project documentation
├── LICENSE                   # MIT License
├── .gitignore               # Git ignore rules
├── package.json             # Project configuration
├── ai-todos.md              # Development tracking
├── shift-scheduler.html     # Main application file
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

## 🔧 Technical Details

### Algorithms Implemented

#### Circle Algorithm (Default)
- Uses physical rotation of employee array
- More intuitive and easier to understand
- Produces complete schedules for all team sizes
- Recommended for most use cases
- Based on the circle method for round-robin tournaments

#### Standard Round-Robin
- Uses mathematical indexing with modulo operations
- More computationally elegant
- Better performance with very large teams

### Fair BYE Rotation System

For odd numbers of employees, the scheduler implements a **Fair BYE Rotation System** that ensures:

- **Equal Breaks**: Each employee gets exactly one break (paired with BYE) during the schedule
- **Fair Distribution**: No employee is paired with BYE again until all employees have had their turn
- **Complete Pairings**: All possible employee pairs are created exactly once
- **Balanced Workload**: Equal distribution of shifts among all employees

**How it works:**
1. When there are odd numbers of employees, one employee gets a break (BYE) each round
2. The system tracks which employees have had breaks
3. Employees are rotated through BYE assignments in a fair sequence
4. The algorithm ensures all possible pair combinations are created
5. Each employee works the same number of shifts (n-1 for n employees)

**Example with 5 employees:**
- Round 1: Employee 1 gets BYE, others work in pairs
- Round 2: Employee 2 gets BYE, others work in pairs
- Round 3: Employee 3 gets BYE, others work in pairs
- Round 4: Employee 4 gets BYE, others work in pairs
- Round 5: Employee 5 gets BYE, others work in pairs

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

- **Circle Algorithm** implementation for round-robin scheduling
- **Fair BYE Rotation System** for odd number of employees
- Round-robin scheduling based on tournament pairing principles
- Modern UI design inspired by current web standards
- Test-driven development approach for reliability

---

**Made with ❤️ for fair scheduling**