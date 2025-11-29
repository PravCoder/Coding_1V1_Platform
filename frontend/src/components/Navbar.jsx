import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import getCurrentUser from "../hooks/getCurrentUser";
import api from "../api/axios";


const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const isActive = (path) => {
    return location.pathname === path;
  };

  useEffect(() => {
    const fetchUserData = async () => {
        try {
            const userID = getCurrentUser();
            
            if (!userID) {
                console.log("No user logged in");
                setLoading(false);
                return;
            }

            // call route
            const response = await api.post(`/get-user-data/${userID}`);
            
            console.log("User data fetched:", response.data);
            
            // set the username
            setUsername(response.data.user.username);
            setEmail(response.data.user.email);
            
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setLoading(false);
        }
    };

  fetchUserData();
  }, []); 

  return (
    <nav className="relative bg-black border-b border-gray-900 shadow-2xl overflow-hidden">
      {/* Red gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-900/30 to-transparent opacity-70"></div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-700/80 to-transparent"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo/Brand */}
          <div className="flex items-center flex-1">
            <button
              onClick={() => navigate('/')}
              className="text-white text-2xl font-bold hover:text-red-600 transition-colors duration-200"
            >
              <span className="text-red-700">Code</span>Clash
            </button>
          </div>

          {/* Navigation Links */}
          
          <div className="flex items-center space-x-6">
            
            {/* Stats Link */}
            <button
              onClick={() => navigate('/stats')}
              className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                isActive('/stats')
                  ? 'text-white bg-red-700 shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              📊 Stats
            </button>

            

            {/* GitHub Link */}
            <a
              href="https://github.com/PravCoder/Coding_1V1_Platform"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <svg 
                className="w-5 h-5" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
              </svg>
              <span>Code</span>
              <svg 
                className="w-3 h-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            {/* Login Link */}
            <button
              onClick={() => navigate("/login")}
              className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                isActive('/stats')
                  ? 'text-white bg-red-700 shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              Login
            </button>
            
          </div>
          {!loading && username && (
            <p className="text-white text-sm bg-gray-800 px-3 py-1 rounded-full">
              Welcome, {username}!
            </p>
          )}
        </div>
        
      </div>
    </nav>
  );
};

export default Navbar;
