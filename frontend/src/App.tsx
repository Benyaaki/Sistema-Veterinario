import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
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
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import Inventory from './pages/Inventory';
import Deliveries from './pages/Deliveries';
import MyDailySales from './pages/MyDailySales';
import Reports from './pages/Reports';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import Receiving from './pages/Receiving';
import Employees from './pages/Employees';
import Branches from './pages/Branches';
import SecurityManagement from './pages/SecurityManagement';

import ActivityHistory from './pages/ActivityHistory';
import StockPage from './pages/Stock';
import Cash from './pages/Cash';

function App() {
  return (
    <AuthProvider>
      <BranchProvider>
        <BrowserRouter basename="/Sistema-Veterinario">
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />

                {/* V2 Routes */}
                <Route path="/ventas/nueva" element={<POS />} />
                <Route path="/ventas/mis-ventas" element={<MyDailySales />} />
                <Route path="/ventas/historial" element={<SalesHistory />} />
                <Route path="/ventas/caja" element={<Cash />} />
                <Route path="/inventario" element={<Inventory />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/despachos" element={<Deliveries />} />
                <Route path="/reportes" element={<Reports />} />
                <Route path="/recepcion" element={<Receiving />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/historial-actividades" element={<ActivityHistory />} />

                {/* Clients (Tutors for Sales) */}
                <Route path="/clientes" element={<Clients />} />
                <Route path="/empleados" element={<Employees />} />
                <Route path="/sucursales" element={<Branches />} />
                <Route path="/proveedores" element={<Suppliers />} />
                <Route path="/seguridad" element={<SecurityManagement />} />

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
      </BranchProvider>
    </AuthProvider>
  );
}

export default App;
