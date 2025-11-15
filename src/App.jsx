// src/App.jsx (VERSÍON LIMPIA SOLO PARA ENRUTAMIENTO)
import { Routes, Route } from 'react-router-dom';

// Importar los componentes de página desde la carpeta controllers/
import LoginPage from './controllers/LoginPage.jsx'; 
import DashboardPage from './controllers/DashboardPage.jsx'; // Nuevo
import RegisterPage from './controllers/RegisterPage.jsx';   // Nuevo

function App() {
  return (
    <Routes>
      {/* RUTAS PÚBLICAS */}
      {/* La ruta raíz y /login apuntan al formulario de inicio de sesión */}
      <Route path="/" element={<LoginPage />} /> 
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} /> 

      {/* RUTAS PROTEGIDAS */}
      {/* Aquí irá el layout principal, envuelto quizás por AuthGuard */}
      <Route path="/dashboard" element={<DashboardPage />} />
      {/* Agrega otras rutas principales aquí: /productos, /movimientos */}
    </Routes>
  );
}

export default App;