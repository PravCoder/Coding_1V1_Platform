import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from "react";
import axios from "axios";



const MatchOutcomeInfo = ({ match_id }) => {

  const [match, setMatch] = useState({});
    
  const [player1, setPlayer1] = useState("player1 name hasn't been set yet");
  const [player2, setPlayer2] = useState("player2 hasn't been set yet");


  const [player1TimeComplexity, setPlayer1TimeComplexity] = useState("O(n^2)");
  const [player2TimeComplexity, setPlayer2TimeComplexity] = useState("O(nlog(n))");


  // players code
  const [player1Code, setPlayer1Code] = useState("nums = list(map(int, input().split()))\ntarget = int(input())\n\ndef two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            return [lookup[diff], i]\n        lookup[num] = i\n\nresult = two_sum(nums, target)\nprint(result)");
  const [player2Code, setPlayer2Code] = useState("nums = list(map(int, input().split()))\ntarget = int(input())\n\ndef two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            return [lookup[diff], i]\n        lookup[num] = i\n\nresult = two_sum(nums, target)\nprint(result)");

  const fetchMatch = async (event) => {
    try {
      const response = await axios.post(`http://localhost:3001/match/get-match-problem/${match_id}`, {});  // string version language. send some payload language with it
      const matchData = response.data.match;
      setMatch(matchData);
      setPlayer1(response.data.match.first_player);
      setPlayer2(response.data.match.second_player);
      console.log("get-match-id: ",  response.data.match);
      console.log("set-match-id: ", match._id);
    } catch (error) {
      // console.error(error.response.data.message);  
    }
  };

  useEffect(() => {
    fetchMatch();

  }, [match_id]);


  return (
    <div>
        <h1>Match Outcome Info for: {match._id}</h1>
        <br></br>

        <h2>Players: {player1.username} vs. {player2.username}</h2>
        {match.winner ? (
            <p><b>Congratulations the winner is {match.winner.username}!</b></p>
        ) : (
            <p><b>Determining winner...</b></p>
        )}
        <p> <b>Too bad you lost {player2.username} </b></p>

        <br></br>

        <h3>{player1.username} Stats:</h3>
        <p>Submissions: {match.first_player_submissions}</p>
        <p>Ending Testcases Passed: {match.first_player_latest_testcases_passed}</p>
        <p>Maximum Testcases Passed in match: {match.first_player_max_testcases_passed}</p>
        <p>Time: TBD minutes.</p>

        <br></br>

        <h3>{player2.username} Stats:</h3>
        <p>Submissions: {match.second_player_submissions}</p>
        <p>Ending Testcases Passed: {match.second_player_latest_testcases_passed}</p>
        <p>Maximum Testcases Passed in match: {match.second_player_max_testcases_passed}</p>
        <p>Time: TBD minutes.</p>

        <br></br>

        <h3>{player1.username} Code:</h3>
        <p>TBD</p>
        <p>Time complexity: TBD</p>

        <br></br>

        <h3>{player2.username}: Code:</h3>
        <p>TBD</p>
        <p>Time complexity: TBD</p>

        
    </div>
  );


}
    
    
export default MatchOutcomeInfo;