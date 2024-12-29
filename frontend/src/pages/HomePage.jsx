import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import axios from "axios";
import { useCookies } from "react-cookie";
import  getCurrentUser  from "../hooks/getCurrentUser";


const HomePage = () => {
  const [user, setUser] = useState(null);
  const userID = getCurrentUser();

  return (
    <div>
      <h2>Current User id: {userID}</h2>
    </div>
  );
  }
  
  export default HomePage;