import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Importar pantallas
import LoginPage from './controllers/LoginPage.jsx'; 
import ForgotPassword from './controllers/ForgotPassword.jsx';
import ResetPassword from './controllers/ResetPassword.jsx';
import DashboardPage from './controllers/DashboardPage.jsx'; 
import InventoryPage from './controllers/InventoryPage.jsx';
import CreateProduct from './controllers/CreateProduct.jsx';
import EntryPage from './controllers/EntryPage.jsx';
import OutputPage from './controllers/OutputPage.jsx';
import RemissionGuidePage from './controllers/RemissionGuidePage.jsx';
import HistoryPage from './controllers/HistoryPage.jsx';
import MainLayout from './controllers/MainLayout.jsx'; 
import ReceivingNotePage from './controllers/ReceivingNotePage.jsx';
import CreateLotPage from './controllers/CreateLotPage.jsx'; 
import ReceivingHistory from './controllers/ReceivingHistory.jsx';
import ScanPage from './controllers/ScanPage.jsx';
import ValuedStockPage from './controllers/ValuedStockPage.jsx';
import TransferPage from './controllers/TransferPage.jsx';
import AiPredictivePage from './controllers/AiPredictivePage.jsx';
import InventarioCiclico from './controllers/InventarioCiclico.jsx'; 
import InventarioAnual from './controllers/InventarioAnual.jsx';
import AiAuditPage from './controllers/AiAuditPage.jsx';
import CreateUserPage from './controllers/CreateUserPage.jsx';
import UserDirectoryPage from './controllers/UserDirectoryPage.jsx';
import RegisterPage from './controllers/RegisterPage.jsx';
import InventoryCountReportPage from './controllers/InventoryCountReportPage.jsx';
import SerialReportPage from './controllers/SerialReportPage.jsx';

const getTokenPayload = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch (error) {
    return null;
  }
};

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
};

// =================================================================
// 🛡️ EL GUARDIA DE SEGURIDAD (RBAC PROTECTOR)
// =================================================================
const ProtectedRoute = ({ children, allowedRoles }) => {
  const payload = getTokenPayload();
  if (!payload) {
    clearSession();
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(payload.id_rol)) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

function App() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const hasValidToken = !!getTokenPayload();
    if (!hasValidToken) clearSession();
    return hasValidToken;
  });

  const handleLoginSuccess = (token) => {
    localStorage.setItem('token', token);
    const hasValidToken = !!getTokenPayload();
    if (!hasValidToken) clearSession();
    setIsAuthenticated(hasValidToken);
    return hasValidToken;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setIsAuthenticated(false);
  };

  return (
    <Routes>
      {/* RUTAS PÚBLICAS */}
      <Route path="/" element={!isAuthenticated ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/home" />} />
      <Route path="/login" element={!isAuthenticated ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/home" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* RUTAS PROTEGIDAS (Envueltas en MainLayout) */}
      <Route path="/*" element={ isAuthenticated ? (
            <MainLayout onLogout={handleLogout}>
              <Routes>
                <Route path="/home" element={<></>} /> 
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* 🔒 MÓDULO DE SISTEMAS (SÓLO ROLES 1 Y 2) */}
                <Route path="/registro-usuarios" element={
                  <ProtectedRoute allowedRoles={[1, 2]}>
                    <RegisterPage />
                  </ProtectedRoute>
                } /> 
                <Route path="/directorio-usuarios" element={
                  <ProtectedRoute allowedRoles={[1, 2]}>
                    <UserDirectoryPage />
                  </ProtectedRoute>
                } /> 

                {/* 🔒 MÓDULO DE ALMACENAMIENTO E IA (SÓLO GERENCIA Y SUPERVISORES: 1, 2, 4, 5) */}
                <Route path="/ai-predictive" element={<ProtectedRoute allowedRoles={[1, 2, 4, 5]}><AiPredictivePage /></ProtectedRoute>} />
                <Route path="/ai-audit" element={<ProtectedRoute allowedRoles={[1, 2, 4, 5]}><AiAuditPage /></ProtectedRoute>} />
                <Route path="/inventory-annual" element={<ProtectedRoute allowedRoles={[1, 2, 4, 5]}><InventarioAnual /></ProtectedRoute>} />
                <Route path="/inventory-cyclic" element={<ProtectedRoute allowedRoles={[1, 2, 4, 5]}><InventarioCiclico /></ProtectedRoute>} />
                <Route path="/transfers" element={<ProtectedRoute allowedRoles={[1, 2, 4, 5]}><TransferPage /></ProtectedRoute>} />

                {/* 🔒 MÓDULO DE REPORTES Y DINERO (SÓLO GERENCIA: 1, 2) */}
                <Route path="/inventory" element={<ProtectedRoute allowedRoles={[1, 2]}><InventoryPage /></ProtectedRoute>} />
                <Route path="/valued-stock" element={<ProtectedRoute allowedRoles={[1, 2]}><ValuedStockPage /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute allowedRoles={[1, 2]}><HistoryPage /></ProtectedRoute>} />
                <Route path="/receiving-history" element={<ProtectedRoute allowedRoles={[1, 2]}><ReceivingHistory /></ProtectedRoute>} />
                <Route path="/serials-stock" element={<ProtectedRoute allowedRoles={[1, 2]}><SerialReportPage tipo="bodega" /></ProtectedRoute>} />
                <Route path="/serials-sent" element={<ProtectedRoute allowedRoles={[1, 2]}><SerialReportPage tipo="enviados" /></ProtectedRoute>} />
                <Route path="/inventory-cyclic-report" element={<ProtectedRoute allowedRoles={[1, 2]}><InventoryCountReportPage tipo="cyclic" /></ProtectedRoute>} />
                <Route path="/inventory-annual-report" element={<ProtectedRoute allowedRoles={[1, 2]}><InventoryCountReportPage tipo="annual" /></ProtectedRoute>} />

                {/* RUTAS OPERATIVAS (TODOS PUEDEN ENTRAR) */}
                <Route path="/create-product" element={<ProtectedRoute allowedRoles={[1, 2]}><CreateProduct /></ProtectedRoute>} />
                <Route path="/receiving-note" element={<ReceivingNotePage />} />
                <Route path="/create-lot" element={<ProtectedRoute allowedRoles={[1, 2, 4]}><CreateLotPage /></ProtectedRoute>} /> 
                <Route path="/receiving-products" element={<ProtectedRoute allowedRoles={[1, 2, 4]}><EntryPage /></ProtectedRoute>} />
                <Route path="/output" element={<OutputPage />} />
                <Route path="/remission-guide" element={<RemissionGuidePage />} />
                <Route path="/scan" element={<ScanPage />} />
                
                <Route path="*" element={<Navigate to="/home" />} />
              </Routes>
            </MainLayout>
          ) : ( <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} /> )
        } 
      />
    </Routes>
  );
}

export default App;
