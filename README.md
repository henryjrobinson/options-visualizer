# Options Trading Visualizer with Alpaca Integration

A modern, interactive React application for visualizing options trading data and metrics with integrated Alpaca Trading API functionality. This tool helps traders understand complex options concepts through intuitive visual representations and execute trades directly from the interface.

## Features

- Visual price analysis with current price, strike price, and break-even markers
- Option Greeks visualization (Delta, Gamma, Theta, Vega)
- Risk assessment and profit potential analysis
- Option vitals display (IV, expiration, volume, open interest)
- Related options comparison
- **Alpaca Trading Integration**:
  - Real-time account information display
  - Options order placement
  - Stock data fetching
  - Options chain data retrieval

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app) and uses Tailwind CSS for styling. The backend is built with FastAPI and integrates with the Alpaca Trading API.

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3.8+
- Alpaca API credentials (API Key and Secret)

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```
   npm install
   ```
3. Install backend dependencies:
   ```
   cd backend
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the backend directory based on `.env.example` and add your Alpaca API credentials:
   ```
   ALPACA_API_KEY=your_api_key_here
   ALPACA_API_SECRET=your_api_secret_here
   ALPACA_BASE_URL=https://paper-api.alpaca.markets
   ALPACA_DATA_URL=https://data.alpaca.markets
   ```

### Running the Application

You can use the provided start script to run both the frontend and backend:

```
./start.sh
```

Or run them separately:

#### Frontend

```
npm start
```

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

#### Backend

```
cd backend/api
python main.py
```

The backend server will be available at http://localhost:8000

## Available Scripts

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
