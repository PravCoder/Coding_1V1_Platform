import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from "axios";
import { useCookies } from "react-cookie";
import  getCurrentUser  from "../hooks/getCurrentUser";
import OutputWindow from "../components/OutputWindow";
import CodeEditor from "../components/CodeEditor";

const MatchPage = () => {
  
  const { match_id } = useParams();

  return (
    <div>
        <CodeEditor match_id={match_id}/>

    </div>
  );
  }
  
  export default MatchPage;