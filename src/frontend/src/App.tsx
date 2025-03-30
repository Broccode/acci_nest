import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/App.css';

// Import pages when they are created
// import Home from './pages/Home';
// import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>ACCI Nest</h1>
          <p>Multi-tenant, plugin-extensible platform</p>
        </header>
        <main>
          <Routes>
            {/* Define routes when pages are created */}
            {/* <Route path="/login" element={<Login />} /> */}
            {/* <Route path="/dashboard" element={<Dashboard />} /> */}
            {/* <Route path="/" element={<Home />} /> */}
            <Route path="/" element={
              <div>
                <h2>Welcome to ACCI Nest</h2>
                <p>Application is being set up. Check back soon!</p>
              </div>
            } />
          </Routes>
        </main>
        <footer>
          <p>ACCI Nest &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </Router>
  );
}

export default App; 