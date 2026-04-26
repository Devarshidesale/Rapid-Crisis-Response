import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import OperatorDashboard from './pages/OperatorDashboard';
import StaffPortal from './pages/StaffPortal';
import GuestSOS from './pages/GuestSOS';
import GuestEvacuation from './pages/GuestEvacuation';
import MutualAidBoard from './pages/MutualAidBoard';
import './App.css';

function Home() {
  return (
    <div className="home-nav">
      <h1>CrisisSyncAI Navigation</h1>
      <ul>
        <li><Link to="/manager">Manager Dashboard</Link></li>
        <li><Link to="/staff">Staff Portal</Link></li>
        <li><Link to="/guest/sos">Guest SOS</Link></li>
        <li><Link to="/guest/evacuation">Guest Evacuation</Link></li>
        <li><Link to="/sister-property">Sister Property Mutual Aid</Link></li>
      </ul>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/manager" element={<OperatorDashboard />} />
        <Route path="/staff" element={<StaffPortal />} />
        <Route path="/guest/sos" element={<GuestSOS />} />
        <Route path="/guest/evacuation" element={<GuestEvacuation />} />
        <Route path="/sister-property" element={<MutualAidBoard />} />
      </Routes>
    </Router>
  );
}

export default App;
