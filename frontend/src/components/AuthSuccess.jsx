import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCookies } from 'react-cookie';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [_, setCookies] = useCookies(['access_token']);
  
  useEffect(() => {
    // Get token and userID from URL parameters
    const token = searchParams.get('token');
    const userID = searchParams.get('userID');
    
    if (token && userID) {
      // Store token in cookies
      setCookies('access_token', token);
      
      // Store userID in localStorage
      window.localStorage.setItem('userID', userID);
      
      // Redirect to homepage
      navigate('/');
    } else {
      // If authentication failed, redirect to login
      navigate('/login');
    }
  }, [navigate, searchParams, setCookies]);
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <div className="bg-[#2B2B2D] bg-opacity-50 shadow-lg rounded-lg p-8">
        <h2 className="text-white text-xl font-bold">Authentication in progress...</h2>
        <p className="text-gray-300 mt-2">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  );
};

export default AuthSuccess;
