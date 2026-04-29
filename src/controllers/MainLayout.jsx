import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaBoxOpen, FaExchangeAlt, FaBrain, FaTags, FaClipboardList, 
  FaFileSignature, FaBarcode, FaChartLine, FaSignOutAlt, 
  FaUserCircle, FaTruckLoading, FaWarehouse, FaSearch, 
  FaCubes, FaFileExport, FaChartPie, FaTh, FaBoxes
} from 'react-icons/fa';

const MainLayout = ({ children, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================
  // 1. DEFINICIÓN MODULAR (ESTILO ODOO)
  // ==========================================
  const appModules = [
    { 
      id: 'dashboard', name: 'Dashboard', icon: <FaChartLine size="2.8em"/>, color: '#875A7B', defaultPath: '/dashboard', 
      menus: [
        { label: 'Panel de Control', path: '/dashboard', icon: <FaChartLine/> }
      ] 
    },
    { 
      id: 'recepcion', name: 'Recepción', icon: <FaTruckLoading size="2.8em"/>, color: '#017E84', defaultPath: '/receiving-note', 
      menus: [
        { label: 'Crear Productos', path: '/create-product', icon: <FaTags/> },
        { label: 'Crear Lotes', path: '/create-lot', icon: <FaBarcode/> },
        { label: 'Nota de Ingreso', path: '/receiving-note', icon: <FaFileSignature/> },
        { label: 'Archivo Notas de Ingreso', path: '/receiving-history', icon: <FaClipboardList/> }, // <--- INTEGRADO
        { label: 'Ingreso de Productos', path: '/receiving-products', icon: <FaCubes/> }
      ]
    },
    { 
      id: 'produccion', name: 'Producción', icon: <FaBarcode size="2.8em"/>, color: '#F06050', defaultPath: '/scan-imei', 
      menus: [
        { label: 'Escaneo de Equipos', path: '/scan-imei', icon: <FaBarcode/> }
      ]
    },
    { 
      id: 'almacenamiento', name: 'Almacenamiento', icon: <FaWarehouse size="2.8em"/>, color: '#D9534F', defaultPath: '/inventory-annual', 
      menus: [
        { label: 'Inventario Anual', path: '/inventory-annual', icon: <FaClipboardList/> },
        { label: 'Inventario Cíclico', path: '/inventory-cyclic', icon: <FaClipboardList/> },
        { label: 'IA Analítica Predictiva', path: '/ai-predictive', icon: <FaBrain color="#fbbc04"/> },
        { label: 'IA Detección Anomalías', path: '/ai-anomalies', icon: <FaBrain color="#ea4335"/> }
      ]
    },
    { 
      id: 'despacho', name: 'Despacho', icon: <FaFileExport size="2.8em"/>, color: '#F0AD4E', defaultPath: '/output', 
      menus: [
        { label: 'Nota de Egreso', path: '/output', icon: <FaFileSignature/> }, // <--- INTEGRADO (/output)
        { label: 'Guía de Remisión', path: '/remission-guide', icon: <FaFileSignature/> }
      ]
    },
    { 
      id: 'reportes', name: 'Reportes', icon: <FaChartPie size="2.8em"/>, color: '#5CB85C', defaultPath: '/inventory', 
      menus: [
        { label: 'Stock General', path: '/inventory', icon: <FaBoxes/> }, // <--- INTEGRADO (/inventory)
        { label: 'Stock Valorado', path: '/report-valued', icon: <FaChartLine/> },
        { label: 'Trazabilidad (Movimientos)', path: '/history', icon: <FaSearch/> } // <--- INTEGRADO (/history)
      ]
    },
    { 
      id: 'transferencia', name: 'Transferencia', icon: <FaExchangeAlt size="2.8em"/>, color: '#5BC0DE', defaultPath: '/transfers', 
      menus: [
        { label: 'Gestión de Transferencias', path: '/transfers', icon: <FaExchangeAlt/> }
      ]
    }
  ];

  // ==========================================
  // 2. LÓGICA DE NAVEGACIÓN DINÁMICA
  // ==========================================
  // Detecta si estamos en la pantalla inicial de aplicaciones (Home)
  const isHome = location.pathname === '/home' || location.pathname === '/';
  
  // Encuentra a qué "Aplicación" pertenece la ruta actual para mostrar su menú
  const activeApp = appModules.find(app => app.menus.some(m => m.path === location.pathname));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f6f8', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* BARRA SUPERIOR (TOP NAV) - Estilo Odoo */}
      <header style={{ background: '#202124', color: 'white', height: '55px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', zIndex: 10 }}>
        
        {/* Zona Izquierda: App Switcher y Títulos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Botón de "Aplicaciones" (El mosaico) */}
          <button 
            onClick={() => navigate('/home')} 
            title="Volver a Aplicaciones"
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'opacity 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            <FaTh size="1.5em" />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px' }}>SINCOT</span>
            {!isHome && activeApp && (
              <>
                <span style={{ color: '#9aa0a6' }}>/</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{activeApp.name}</span>
              </>
            )}
          </div>
        </div>

        {/* Zona Derecha: Usuario y Salir */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaUserCircle size="1.5em" color="#8ab4f8" />
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Richard Cruz</span>
          </div>
          <button 
            onClick={onLogout}
            style={{ background: '#d93025', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaSignOutAlt /> Salir
          </button>
        </div>
      </header>

      {/* ÁREA CENTRAL */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* BARRA LATERAL DINÁMICA (Se oculta en el Home, aparece en los Módulos) */}
        {!isHome && activeApp && (
          <aside style={{ width: '250px', background: 'white', borderRight: '1px solid #dadce0', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: activeApp.color }}>{activeApp.icon}</div>
                <h3 style={{ margin: 0, color: '#202124', fontSize: '1.1rem' }}>{activeApp.name}</h3>
            </div>

            <nav style={{ flex: 1, padding: '15px 0', overflowY: 'auto' }}>
              {activeApp.menus.map((menu) => {
                const isActive = location.pathname === menu.path;
                return (
                  <div 
                    key={menu.path}
                    onClick={() => navigate(menu.path)}
                    style={{
                      padding: '12px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                      background: isActive ? '#e8f0fe' : 'transparent',
                      color: isActive ? '#1a73e8' : '#3c4043',
                      borderLeft: isActive ? `4px solid ${activeApp.color}` : '4px solid transparent',
                      fontWeight: isActive ? 'bold' : 'normal',
                      fontSize: '0.9rem', transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => { if(!isActive) e.currentTarget.style.background = '#f8f9fa' }}
                    onMouseOut={(e) => { if(!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: '1.1em', color: isActive ? activeApp.color : '#5f6368' }}>{menu.icon}</span>
                    {menu.label}
                  </div>
                )
              })}
            </nav>
          </aside>
        )}

        {/* CONTENIDO PRINCIPAL */}
        <main style={{ flex: 1, overflowY: 'auto', background: isHome ? '#e9ecef' : '#f4f6f8' }}>
          {isHome ? (
            // ==========================================
            // VISTA ODOO: ESCRITORIO DE APLICACIONES
            // ==========================================
            <div style={{ padding: '40px', display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center', maxWidth: '1200px', margin: '0 auto' }}>
              {appModules.map((app) => (
                <div 
                  key={app.id} 
                  onClick={() => navigate(app.defaultPath)}
                  style={{
                    width: '160px', height: '160px', background: 'white', borderRadius: '15px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s, boxShadow 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)' }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)' }}
                >
                  <div style={{ color: app.color, marginBottom: '15px' }}>
                    {app.icon}
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#3c4043', fontSize: '0.95rem' }}>{app.name}</span>
                </div>
              ))}
            </div>
          ) : (
            // Aquí se carga la pantalla de React Router (ReceivingNote, Dashboard, etc)
            <div style={{ padding: '15px' }}>
              {children}
            </div>
          )}
        </main>

      </div>
    </div>
  );
};

export default MainLayout;