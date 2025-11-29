import React, { useState } from "react";
import RegisterForm from "../components/RegisterForm"
import Navbar from '../components/Navbar';


const RegisterPage = () => {
    return (
      <div>
          <Navbar />
          <RegisterForm></RegisterForm>
  
      </div>
    )
  }
  
  export default RegisterPage;