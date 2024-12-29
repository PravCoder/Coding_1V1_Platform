import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import axios from "axios";
import { useCookies } from "react-cookie";

const LoginForm = () => {
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [_, setCookies] = useCookies(["access_token"]);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const result = await axios.post("http://localhost:3001/login", {email, password});
      console.log("login-form result data: " + result.data.message);
      // save the return access-token from request in cookies
      setCookies("access_token", result.data.token);
      // user user-id that logged inside local-storage, the current-user
      window.localStorage.setItem("userID", result.data.userID); 
      navigate("/");
    } catch (error) {
      console.error(error.response.data.message);  // either emial/passwor dincorrect will be the message.
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>

        <h2>Login Form</h2>
        
        <label >Email</label>
        <input type="email" placeholder="enter email" onChange={(e) => setEmail(e.target.value)}/>
        
        
        <label >Password</label>
        <input type="password" placeholder="enter password" onChange={(e) => setPassword(e.target.value)}/>
        
        
        <button type="submit" style={{ color: 'black',fontWeight: 'bold', }}>Login In</button>
        
        
      </form>
         
    </div>
  )
}

export default LoginForm;