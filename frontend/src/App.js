import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<h1>Home</h1>} />
          <Route path="/match" element={<h1>Match</h1>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
