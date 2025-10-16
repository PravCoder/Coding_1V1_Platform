import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from "axios";
import api from "../api/axios";

import { useCookies } from "react-cookie";
import { FcGoogle } from "react-icons/fc"; // Google icon
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"; // Eye icons

const LoginForm = () => {
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [showPassword, setShowPassword] = useState(false); // password visibility eye state
  const [_, setCookies] = useCookies(["access_token"]);
  const navigate = useNavigate();


  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const result = await api.post("/login", { email, password });
      console.log("login-form result data: " + result.data.message);
      setCookies("access_token", result.data.token);
      window.localStorage.setItem("userID", result.data.userID);
      navigate("/");
    } catch (error) {
      console.error(error.response.data.message);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <div className="bg-[#2B2B2D] bg-opacity-50 shadow-lg rounded-lg p-8 w-96 flex flex-col space-y-4">
        <h2 className="text-white text-2xl font-bold text-center">SIGN IN</h2>
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">

          <label className="text-white font-medium">Email</label>
          <input
            type="email"
            placeholder="Enter email"
            className="bg-transparent border p-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="text-white font-medium">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              className="bg-transparent border p-2 rounded-md text-white w-full pr-10 focus:outline-none focus:ring-2 focus:ring-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* show Password Button */}
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-0 transform -translate-y-1/2 text-white focus:outline-none"
            >
              {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </button>
          </div>

          <button
            type="submit"
            className="bg-red-700 text-white font-bold py-2 rounded-md hover:bg-red-600 transition"
          >
            Log In
          </button>
        </form>

        {/* Google Sign-In Button */}
        <button className="flex items-center justify-center gap-2 border border-gray-400 text-white py-2 rounded-md hover:bg-gray-700 transition">
          <FcGoogle size={20} /> Sign in with Google
        </button>

        <p className="text-center text-gray-400">
          Don't have an account? <Link to="/register" className="text-red-600 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
