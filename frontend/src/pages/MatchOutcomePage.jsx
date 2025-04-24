import { Link, useNavigate, useParams } from 'react-router-dom'
import MatchOutcomeInfo from '../components/MatchOutcomeInfo';


const MatchOutcomePage = () => {
  
    const { match_id } = useParams();
  
  
    return (
      <div>
          <h1>Match Outcome Page: {match_id}</h1>
          <MatchOutcomeInfo match_id={match_id}/>
          
      </div>
    );
    }
    
    
export default MatchOutcomePage;