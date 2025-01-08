import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import axios from "axios";
import { useCookies } from "react-cookie";
import  getCurrentUser  from "../hooks/getCurrentUser";
import OutputWindow from "../components/OutputWindow";
import CodeEditor from "../components/CodeEditor";

const MatchPage = () => {
  

  return (
    <div>
        <CodeEditor />

    </div>
  );
  }
  
  export default MatchPage;