import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Importar todas tus pantallas desde la carpeta controllers/
import LoginPage from './controllers/LoginPage.jsx'; 
import RegisterPage from './controllers/RegisterPage.jsx';  
import DashboardPage from './controllers/DashboardPage.jsx'; 
import InventoryPage from './controllers/InventoryPage.jsx';
import CreateProduct from './controllers/CreateProduct.jsx';
import EntryPage from './controllers/EntryPage.jsx';
import OutputPage from './controllers/OutputPage.jsx';
import HistoryPage from './controllers/HistoryPage.jsx';
import MainLayout from './controllers/MainLayout.jsx'; 
import ReceivingNotePage from './controllers/ReceivingNotePage.jsx';
import CreateLotPage from './controllers/CreateLotPage.jsx'; 
import ReceivingHistory from './controllers/ReceivingHistory.jsx';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleLoginSuccess = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setIsAuthenticated(false);
  };

  return (
    <Routes>
      {/* RUTAS PÚBLICAS */}
      <Route 
        path="/" 
        // Si el usuario ya está logueado, lo enviamos al mosaico de aplicaciones (/home)
        element={!isAuthenticated ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/home" />} 
      />
      <Route 
        path="/login" 
        element={!isAuthenticated ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/home" />} 
      />
      <Route path="/registro" element={<RegisterPage />} /> 

      {/* RUTAS PROTEGIDAS (Envueltas en MainLayout) */}
      <Route 
        path="/*" 
        element={
          isAuthenticated ? (
            <MainLayout onLogout={handleLogout}>
              <Routes>
                {/* LA NUEVA RUTA PRINCIPAL: El Escritorio de Aplicaciones (Odoo style) */}
                <Route path="/home" element={<></>} /> 
                
                {/* TODAS TUS RUTAS EXISTENTES SE MANTIENEN INTACTAS */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/create-product" element={<CreateProduct />} />
                
                {/* RUTAS DEL FLUJO DE RECEPCIÓN */}
                <Route path="/receiving-note" element={<ReceivingNotePage />} />
                <Route path="/create-lot" element={<CreateLotPage />} /> 
                <Route path="/receiving-products" element={<EntryPage />} />
                <Route path="/receiving-history" element={<ReceivingHistory />} />
                <Route path="/output" element={<OutputPage />} />
                <Route path="/history" element={<HistoryPage />} />
                
                {/* Redirección por defecto: si el usuario escribe una ruta que no existe, va al menú principal */}
                <Route path="*" element={<Navigate to="/home" />} />
              </Routes>
            </MainLayout>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
    </Routes>
  );
}

export default App;