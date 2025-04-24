import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react';



const MatchOutcomeInfo = ({ match_id }) => {
    
    const [player1, setPlayer1] = useState("bob123");
    const [player2, setPlayer2] = useState("sam123");

    const [player1Time, setPlayer1Time] = useState(23);
    const [player2Time, setPlayer2Time] = useState(32);

    const [player1TimeComplexity, setPlayer1TimeComplexity] = useState("O(n^2)");
    const [player2TimeComplexity, setPlayer2TimeComplexity] = useState("O(nlog(n))");

    // player 1 variables
    const [player1Submissions, setPlayer1Submissions] = useState(0);
    const [player1CurTestcasesPassed, setPlayer1CurTestcasesPassed] = useState(0);
    const [player1MaxTestcasesPassed, setPlayer1MaxTestcasesPassed] = useState(0);
    // player 2 variables
    const [player2Submissions, setPlayer2Submissions] = useState(0);
    const [player2CurTestcasesPassed, setPlayer2CurTestcasesPassed] = useState(0);
    const [player2MaxTestcasesPassed, setPlayer2MaxTestcasesPassed] = useState(0);


    // players code
    const [player1Code, setPlayer1Code] = useState("nums = list(map(int, input().split()))\ntarget = int(input())\n\ndef two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            return [lookup[diff], i]\n        lookup[num] = i\n\nresult = two_sum(nums, target)\nprint(result)");
    const [player2Code, setPlayer2Code] = useState("nums = list(map(int, input().split()))\ntarget = int(input())\n\ndef two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            return [lookup[diff], i]\n        lookup[num] = i\n\nresult = two_sum(nums, target)\nprint(result)");
  
  
    return (
      <div>
          <h1>Match Outcome Info for: {match_id}</h1>
          <br></br>

          <h2>Players: {player1} vs. {player2}</h2>
          <p>Congratulations the winner is {player1}!</p>
          <p>Too bad you lost {player2}</p>

          <br></br>

          <h3>{player1} Stats:</h3>
          <p>Submissions: {player1Submissions}</p>
          <p>Ending Testcases Passed: {player1CurTestcasesPassed}</p>
          <p>Maximum Testcases Passed in match: {player1MaxTestcasesPassed}</p>
          <p>Time: {player1Time} minutes.</p>

          <br></br>

          <h3>{player2} Stats:</h3>
          <p>Submissions: {player2Submissions}</p>
          <p>Ending Testcases Passed: {player2CurTestcasesPassed}</p>
          <p>Maximum Testcases Passed in match: {player2MaxTestcasesPassed}</p>
          <p>Time: {player2Time} minutes.</p>

          <br></br>

          <h3>{player1} Code:</h3>
          <p>{player1Code}</p>
          <p>Time complexity: {player1TimeComplexity}</p>

          <br></br>

          <h3>{player2}: Code:</h3>
          <p>{player2Code}</p>
          <p>Time complexity: {player2TimeComplexity}</p>

          
      </div>
    );
    }
    
    
export default MatchOutcomeInfo;