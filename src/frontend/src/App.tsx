import React from 'react';
import './styles/App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>ACCI Nest</h1>
        <p>Multi-tenant, plugin-extensible platform</p>
      </header>
      <main>
        <div>
          <h2>Welcome to ACCI Nest</h2>
          <p>Application is being set up. Check back soon!</p>
        </div>
      </main>
      <footer>
        <p>ACCI Nest &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App; 