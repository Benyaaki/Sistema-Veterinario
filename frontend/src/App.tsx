import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import TutorsList from './pages/Tutors/TutorsList';
import TutorForm from './pages/Tutors/TutorForm';
import TutorDetail from './pages/Tutors/TutorDetail';
import PatientsList from './pages/Patients/PatientsList';
import PatientForm from './pages/Patients/PatientForm';
import PatientDetail from './pages/Patients/PatientDetail';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agenda" element={<Agenda />} />

              <Route path="/tutores" element={<TutorsList />} />
              <Route path="/tutores/crear" element={<TutorForm />} />
              <Route path="/tutores/editar/:id" element={<TutorForm />} />
              <Route path="/tutores/:id" element={<TutorDetail />} />

              <Route path="/pacientes" element={<PatientsList />} />
              <Route path="/pacientes/crear" element={<PatientForm />} />
              <Route path="/pacientes/editar/:id" element={<PatientForm />} />
              <Route path="/pacientes/:id" element={<PatientDetail />} />

              <Route path="/ajustes" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
