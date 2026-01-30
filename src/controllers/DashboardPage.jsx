// src/controllers/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import '../css/DashboardPage.css';
import CreateProduct from '../controllers/CreateProduct.jsx';
import InventoryPage from '../controllers/InventoryPage.jsx'; // <--- AGREGAR ESTO
import { FaHome, FaBoxOpen, FaClipboardList, FaChartLine, FaSignOutAlt, FaExclamationTriangle } from 'react-icons/fa';
import EntryPage from '../controllers/EntryPage.jsx';

const DashboardPage = () => {
  const [activeSection, setActiveSection] = useState('inicio');
  const [userData, setUserData] = useState(null);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Al cargar, leemos el usuario guardado en el Login
  useEffect(() => {
    const storedUser = localStorage.getItem('usuario');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      setUserData(JSON.parse(storedUser));
      fetchProductos(storedToken); // Cargar datos reales
    } else {
      window.location.href = '/login'; // Si no hay login, mandar fuera
    }
  }, []);

  // 2. Función para pedir datos al Backend (MySQL)
  const fetchProductos = async (token) => {
    try {
      const response = await fetch('http://localhost:3001/api/inventario', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
      }
    } catch (error) {
      console.error("Error cargando inventario:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
  };

  // Evitar renderizar si no hay datos de usuario aún
  if (!userData) return <div>Cargando sistema...</div>;

  const rol = userData.rol; // Ej: 'Gerente', 'Vendedor'

  return (
    <div className="dashboard-layout">
      
      {/* --- SIDEBAR INTELIGENTE --- */}
      <aside className="sidebar">
        <div className="sidebar-title">MundoTec Inventario</div>
        
        <nav className="sidebar-nav">
          <button className={`nav-button ${activeSection === 'inicio' ? 'active' : ''}`} onClick={() => setActiveSection('inicio')}>
            <FaHome /> Inicio
          </button>
          
          {/* Lógica de Roles: Solo Gerente y Jefes ven Crear Producto */}
          {['Gerente', 'Jefe Administrativo', 'Jefe de Operaciones'].includes(rol) && (
            <button className={`nav-button ${activeSection === 'productos' ? 'active' : ''}`} onClick={() => setActiveSection('productos')}>
              <FaBoxOpen /> Crear Producto
            </button>
          )}
          
          {/* Lógica de Roles: Casi todos ven Ingresos, menos el Auxiliar */}
          {rol !== 'Auxiliar de Almacén' && (
            <button className={`nav-button ${activeSection === 'ingresos' ? 'active' : ''}`} onClick={() => setActiveSection('ingresos')}>
              <FaClipboardList /> Registrar Ingreso
            </button>
          )}
          
          <button className={`nav-button ${activeSection === 'trazabilidad' ? 'active' : ''}`} onClick={() => setActiveSection('trazabilidad')}>
            <FaChartLine /> Trazabilidad
          </button>
        </nav>

        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt /> Cerrar Sesión
        </button>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="main-container">
        
        <header className="top-navbar">
          <div className="user-info">
            <span>Usuario: <strong>{userData.nombre} {userData.apellido}</strong></span>
            <span className="role-badge">{rol}</span>
          </div>
          <div style={{fontSize: '0.8rem', color: '#666'}}>ISO 9001:2015</div>
        </header>

<main className="content-area">
  
  {/* --- SECCIÓN 1: INICIO (SOLO RESUMEN GERENCIAL) --- */}
  {activeSection === 'inicio' && (
    <div className="welcome-view">
      <h2>Resumen de Bodega</h2>
      
      {/* Tarjetas de KPI (Indicadores Clave) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', borderLeft: '5px solid #1a73e8' }}>
          <h3>Total Activos</h3>
          <p style={{ fontSize: '2.5rem', color: '#1a73e8', margin: '10px 0', fontWeight: 'bold' }}>
            {productos.length}
          </p>
          <small>Productos registrados en sistema</small>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', borderLeft: '5px solid #ea4335' }}>
          <h3>Alertas Críticas</h3>
          <p style={{ fontSize: '2.5rem', color: '#ea4335', margin: '10px 0', fontWeight: 'bold' }}>
            {productos.filter(p => p.stock_actual < 5).length}
          </p>
          <small>Productos bajo stock mínimo</small>
        </div>
      </div>
      
      {/* Un gráfico o imagen decorativa quedaría bien aquí después */}
    </div>
  )}

  {/* --- SECCIÓN 2: CREAR PRODUCTO --- */}
  {activeSection === 'productos' && (
     <CreateProduct onProductCreated={() => fetchProductos(localStorage.getItem('token'))} />
  )}

  {/* --- SECCIÓN 3: INGRESOS (Pendiente) --- */}
 {activeSection === 'ingresos' && <EntryPage />}

  {/* --- SECCIÓN 4: TRAZABILIDAD (AQUÍ VA LA NUEVA PÁGINA) --- */}
  {activeSection === 'trazabilidad' && (
     <InventoryPage />
  )}

</main>
      </div>
    </div>
  );
};

export default DashboardPage;