import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import MatchPage from './pages/MatchPage';
import MatchOutcomePage from './pages/MatchOutcomePage';
import StatsPage from './pages/StatsPage';





function App() {
  return (
    <Router>

      <div>
        <Routes>
          <Route path="/" element={<HomePage></HomePage>} />
          <Route path="/register" element={<RegisterPage></RegisterPage>} />
          <Route path="/login" element={<LoginPage></LoginPage>} />


          {/* for shone -> 6779d39282fe16a6817030f9 */}
          <Route path="/match/:match_id" element={<MatchPage></MatchPage>} /> 

          <Route path="/match-outcome/:match_id" element={<MatchOutcomePage></MatchOutcomePage>} /> 


          <Route path="/stats" element={<StatsPage></StatsPage>} />
          

        </Routes>
      </div>
    </Router>
  );
}

export default App;
