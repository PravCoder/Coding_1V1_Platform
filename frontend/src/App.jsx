import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import MatchPage from './pages/MatchPage';



function App() {
  return (
    <Router>

      <div>
        <Routes>
          <Route path="/" element={<HomePage></HomePage>} />
          <Route path="/register" element={<RegisterPage></RegisterPage>} />
          <Route path="/login" element={<LoginPage></LoginPage>} />


          {/* for shone -> 6779d39282fe16a6817030f9 */}
          <Route path="/match/:id" element={<MatchPage></MatchPage>} /> 
          

        </Routes>
      </div>
    </Router>
  );
}

export default App;
