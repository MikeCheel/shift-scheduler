# Shift Scheduler

A web-based shift rotation scheduler for teams, designed to create fair, balanced, and efficient shift pairings. Built with React and Vite.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.

## Features
- Enter up to 6 team members and an optional "Wildcard" helper.
- Generates a round-robin schedule with no consecutive shifts for any member.
- Ensures all members pair with each other before repeating.
- Wildcard member provides relief to regular members for better balance.
- Visual statistics for shift balance and pairing frequency.

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (version 16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Steps
1. **Clone the repository:**
   ```sh
   git clone https://github.com/your-username/shift-scheduler.git
   cd shift-scheduler
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```

## Running the App

### Development Mode
Start the development server with hot reloading:
```sh
npm run dev
```
Open your browser and go to [http://localhost:5173](http://localhost:5173) to use the app.

### Production Build
To build the app for production:
```sh
npm run build
```
The output will be in the `dist` folder. You can preview the production build locally:
```sh
npm run preview
```

## Usage
1. Enter the names of your team members. The last field is for an optional "Wildcard" (helper/relief) member.
2. Click **Generate Schedule** to create a fair shift rotation.
3. Review the generated schedule, member statistics, and pairing frequencies.

## Contributing
Contributions are welcome! Please open issues or pull requests for improvements or bug fixes.

## License
This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for more information.
