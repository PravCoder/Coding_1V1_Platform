import { useState, useEffect } from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { executeCode } from "../constants/api";
import axios from "axios";
import "../styles/Popup.css";


const OpponentUpdates = ({ match_id }) => {
    const [opponentSubmissions, setOpponentSubmissions] = useState(2);
    const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (opponentSubmissions) {
      setShowPopup(true);
      // Automatically hide after 3 seconds
      const timer = setTimeout(() => setShowPopup(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [opponentSubmissions]);
  
  return (
    <div className={`popup ${showPopup ? "show" : "hide"}`}>
      Variable changed to: {opponentSubmissions}
    </div>
  );
};


export default OpponentUpdates;