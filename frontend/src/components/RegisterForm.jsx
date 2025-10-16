import { useCookies } from "react-cookie";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import api from "../api/axios";

import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc"; // Google icon
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"; // Eye icons

const RegisterForm = () => {
  const [username, setUsername] = useState();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [showPassword, setShowPassword] = useState(false); // toggle visibility
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [_, setCookies] = useCookies(["access_token"]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post("/register", { username, email, password })
      .then(result => {
        console.log("register-form-result: " + result);
        console.log("register-response-status: " + result.status);
        if (result.status === 201) {
          alert("Successfully registered, now login");
          navigate("/login");
        }
      })
      .catch(err => {
        if (err.response && err.response.status === 400) {
          setError("An error occurred registering with these credentials");
          console.log("register-error");
        }
      });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <div className="bg-[#2B2B2D] bg-opacity-50 shadow-lg rounded-lg p-8 w-96 flex flex-col space-y-4">
        <h2 className="text-white text-2xl font-bold text-center">REGISTER</h2>

        {/* Error message */}
        {error && <p className="text-red-500 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <label className="text-white font-medium">Username</label>
          <input
            type="text"
            placeholder="Enter username"
            className="bg-transparent border p-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-white"
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label className="text-white font-medium">Email</label>
          <input
            type="email"
            placeholder="Enter email"
            className="bg-transparent border p-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-white"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="text-white font-medium">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              className="bg-transparent border p-2 rounded-md text-white w-full pr-10 focus:outline-none focus:ring-2 focus:ring-white"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-1 top-0 transform -translate-y-1/2 text-white focus:outline-none"
            >
              {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </button>
          </div>

          <button
            type="submit"
            className="bg-red-700 text-white font-bold py-2 rounded-md hover:bg-red-600 transition"
          >
            Register
          </button>
        </form>

        {/* TODO: Add Google OAuth functionality later */}
        <button className="flex items-center justify-center gap-2 border border-gray-400 text-white py-2 rounded-md hover:bg-gray-700 transition">
          <FcGoogle size={20} /> Sign in with Google
        </button>

        <p className="text-center text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-red-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
