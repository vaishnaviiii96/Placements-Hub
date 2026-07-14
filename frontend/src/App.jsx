import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './layouts/Layout';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Companies } from './pages/Companies';
import { CompanyDetail } from './pages/CompanyDetail';
import { SubmissionDetail } from './pages/SubmissionDetail';
import { SubmitExperience } from './pages/SubmitExperience';
import { MyExperiences } from './pages/MyExperiences';
import { Analytics } from './pages/Analytics';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
            <Route path="/submissions/:id" element={<SubmissionDetail />} />
            <Route path="/submit" element={<SubmitExperience />} />
            <Route path="/my-experiences" element={<MyExperiences />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
