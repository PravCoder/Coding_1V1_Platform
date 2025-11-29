import React, { useState } from "react";
import LoginForm from "../components/LoginForm"
import Navbar from '../components/Navbar';


const LoginPage = () => {
    return (
      <div>
          <Navbar />
          <LoginForm></LoginForm>
  
      </div>
    )
  }
  
  export default LoginPage;