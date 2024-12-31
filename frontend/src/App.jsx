import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';



function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<HomePage></HomePage>} />
          <Route path="/register" element={<RegisterPage></RegisterPage>} />
          <Route path="/login" element={<LoginPage></LoginPage>} />
          {/* for shone */}
          <Route path="/match" element={<LoginPage></LoginPage>} /> 
        </Routes>
      </div>
    </Router>
  );
}

export default App;
