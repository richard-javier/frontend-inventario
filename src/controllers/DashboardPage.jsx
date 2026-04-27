import React, { useState, useEffect } from 'react';
import '../css/DashboardPage.css';
import CreateProduct from '../controllers/CreateProduct.jsx';
import InventoryPage from '../controllers/InventoryPage.jsx';
import EntryPage from '../controllers/EntryPage.jsx';
import OutputPage from '../controllers/OutputPage.jsx';
import HistoryPage from '../controllers/HistoryPage.jsx'; 
import CreateLotPage from '../controllers/CreateLotPage.jsx'; 

import { FaHome, FaBoxOpen, FaClipboardList, FaSignOutAlt, FaChartLine, FaWarehouse, FaTimesCircle, FaExclamationTriangle, FaCheckCircle, FaChartPie, FaHistory, FaChartBar, FaBarcode } from 'react-icons/fa'; 

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DashboardPage = () => {
  const [activeSection, setActiveSection] = useState('inicio');
  const [userData, setUserData] = useState(null);
  const [productos, setProductos] = useState([]);
  const [historial, setHistorial] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('usuario');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      setUserData(JSON.parse(storedUser));
      fetchDatosIniciales(storedToken); 
    } else {
      window.location.href = '/login'; 
    }
  }, []);

  const fetchDatosIniciales = async (token) => {
    try {
      const [resProd, resHist] = await Promise.all([
        fetch('http://localhost:3001/api/inventario', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:3001/api/inventario/historial', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resProd.ok) {
        const dataP = await resProd.json();
        setProductos(Array.isArray(dataP) ? dataP : []);
      }
      
      if (resHist.ok) {
        const dataH = await resHist.json();
        setHistorial(Array.isArray(dataH) ? dataH : []);
      }

    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
  };

  if (!userData) return <div style={{color:'white', padding:'20px'}}>Cargando sistema...</div>;
  const rol = userData.rol; 

  const prepararDatosGrafica = () => {
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const ultimos7Dias = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaKey = fecha.toISOString().split('T')[0];
      ultimos7Dias.push({
        fechaKey,
        name: diasSemana[fecha.getDay()],
        ingresos: 0,
        salidas: 0
      });
    }

    if (Array.isArray(historial)) {
        historial.forEach(mov => {
          if (mov.fecha) {
              const fechaMov = mov.fecha.split('T')[0];
              const diaEncontrado = ultimos7Dias.find(d => d.fechaKey === fechaMov);
              if (diaEncontrado) {
                if (mov.tipo_movimiento === 'INGRESO') diaEncontrado.ingresos += Number(mov.cantidad || 0);
                else diaEncontrado.salidas += Number(mov.cantidad || 0);
              }
          }
        });
    }
    return ultimos7Dias;
  };

  const dataGrafica = prepararDatosGrafica();

  // --- CORRECCIÓN MAGIA MATEMÁTICA DE LA DONA ---
  const activosReales = productos.filter(p => p.estado !== 'INACTIVO');
  
  // Categorización exacta
  const agotados = activosReales.filter(p => Number(p.stock_actual) === 0);
  const criticos = activosReales.filter(p => Number(p.stock_actual) > 0 && Number(p.stock_actual) <= Number(p.stock_minimo));
  const bajos = activosReales.filter(p => Number(p.stock_actual) > Number(p.stock_minimo) && Number(p.stock_actual) <= Number(p.stock_minimo) + 3);
  const ok = activosReales.filter(p => Number(p.stock_actual) > Number(p.stock_minimo) + 3); // NUEVO: Calculamos los que están OK

  const productosEnRiesgo = [...agotados, ...criticos, ...bajos].sort((a, b) => a.stock_actual - b.stock_actual).slice(0, 5);
  const maxScale = productosEnRiesgo.length > 0 ? Math.max(...productosEnRiesgo.map(p => Number(p.stock_actual)), 10) : 10;

  // Cálculo de Porcentajes Reales
  const totalItems = activosReales.length || 1; 
  const porcAgotado = (agotados.length / totalItems) * 100;
  const porcCritico = (criticos.length / totalItems) * 100;
  const porcBajo = (bajos.length / totalItems) * 100;
  // El "OK" llenará todo el resto del círculo automáticamente

  // Generador de Cono Inteligente
  const donutGradient = `conic-gradient(
    #d93025 0% ${porcAgotado}%, 
    #ea4335 ${porcAgotado}% ${porcAgotado + porcCritico}%, 
    #fbbc04 ${porcAgotado + porcCritico}% ${porcAgotado + porcCritico + porcBajo}%, 
    #34a853 ${porcAgotado + porcCritico + porcBajo}% 100%
  )`;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-title" style={{ textAlign: 'center', padding: '15px 0' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '2px', color: '#fff' }}>SINCOT</div>
          <div style={{ fontSize: '0.65rem', fontWeight: 'normal', color: '#aaa', marginTop: '5px', lineHeight: '1.3', textTransform: 'uppercase' }}>
            Sistema de Inventario, Control<br/>y Trazabilidad Integral
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-button ${activeSection === 'inicio' ? 'active' : ''}`} onClick={() => setActiveSection('inicio')}><FaHome /> Inicio</button>
          
          {['Gerente', 'Jefe Administrativo', 'Jefe de Operaciones'].includes(rol) && (
            <button className={`nav-button ${activeSection === 'productos' ? 'active' : ''}`} onClick={() => setActiveSection('productos')}><FaBoxOpen /> Crear Producto</button>
          )}
          
          {rol !== 'Auxiliar de Almacén' && (
            <>
              <button className={`nav-button ${activeSection === 'lotes' ? 'active' : ''}`} onClick={() => setActiveSection('lotes')}><FaBarcode /> Creación de Lote</button>
              <button className={`nav-button ${activeSection === 'ingresos' ? 'active' : ''}`} onClick={() => setActiveSection('ingresos')}><FaClipboardList /> Registrar Ingreso</button>
              <button className={`nav-button ${activeSection === 'salidas' ? 'active' : ''}`} onClick={() => setActiveSection('salidas')}><FaSignOutAlt /> Registrar Salida</button>
            </>
          )}

          <button className={`nav-button ${activeSection === 'trazabilidad' ? 'active' : ''}`} onClick={() => setActiveSection('trazabilidad')}>
            <FaChartLine /> Inventario Actual
          </button>

          <button className={`nav-button ${activeSection === 'historial' ? 'active' : ''}`} onClick={() => setActiveSection('historial')}>
            <FaHistory /> Historial
          </button>
        </nav>

        <div style={{ padding: '20px', marginTop:'auto' }}>
            <button className="logout-button" onClick={handleLogout} style={{ width: '100%', padding: '15px', background: '#d93025', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' }}>
              <FaSignOutAlt /> Cerrar Sesión
            </button>
        </div>
      </aside>

      <div className="main-container">
        <header className="top-navbar">
          <div className="user-info">
            <span>Bienvenido, <strong>{userData.nombre} {userData.apellido}</strong></span>
            <span className="role-badge">{rol}</span>
          </div>
        </header>

        <main className="content-area">
          {activeSection === 'inicio' && (
            <div className="welcome-view">
              <h2>Panel de Control Gerencial</h2>
              
              {/* TARJETAS SUPERIORES ESTADÍSTICAS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #212121', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <h3 style={{margin:0, color:'#555', fontSize:'0.9rem'}}>AGOTADOS</h3>
                  <p style={{ fontSize: '2rem', color: '#212121', margin: '5px 0', fontWeight: 'bold' }}>{agotados.length}</p>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #ea4335', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <h3 style={{margin:0, color:'#555', fontSize:'0.9rem'}}>STOCK CRÍTICO</h3>
                  <p style={{ fontSize: '2rem', color: '#ea4335', margin: '5px 0', fontWeight: 'bold' }}>{criticos.length}</p>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #34a853', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <h3 style={{margin:0, color:'#555', fontSize:'0.9rem'}}>STOCK SALUDABLE</h3>
                  <p style={{ fontSize: '2rem', color: '#34a853', margin: '5px 0', fontWeight: 'bold' }}>{ok.length}</p>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #1a73e8', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <h3 style={{margin:0, color:'#555', fontSize:'0.9rem'}}>CATÁLOGO TOTAL</h3>
                  <p style={{ fontSize: '2rem', color: '#1a73e8', margin: '5px 0', fontWeight: 'bold' }}>{productos.length}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', color: '#333', display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <FaChartBar color="#1a73e8"/> Movimientos Semanales
                  </h3>
                  <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                      <BarChart data={dataGrafica}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ingresos" fill="#137333" name="Ingresos" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="salidas" fill="#d93025" name="Salidas" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <h3 style={{marginTop: 0, fontSize: '1.1rem', color: '#333'}}><FaChartPie color="#1a73e8"/> Salud del Inventario</h3>
                    
                    <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: donutGradient, margin: '20px auto', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '110px', height: '110px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                             <span style={{fontSize: '1.8rem', fontWeight: 'bold'}}>{activosReales.length}</span>
                             <span style={{fontSize: '0.7rem', color: '#666'}}>Activos</span>
                        </div>
                    </div>
                    
                    {/* Leyenda de la Dona */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '0.75rem', color: '#666' }}>
                        <span style={{display:'flex', alignItems:'center', gap:'5px'}}><div style={{width:'10px', height:'10px', background:'#34a853', borderRadius:'2px'}}></div> OK</span>
                        <span style={{display:'flex', alignItems:'center', gap:'5px'}}><div style={{width:'10px', height:'10px', background:'#fbbc04', borderRadius:'2px'}}></div> Bajo</span>
                        <span style={{display:'flex', alignItems:'center', gap:'5px'}}><div style={{width:'10px', height:'10px', background:'#d93025', borderRadius:'2px'}}></div> Agotado</span>
                    </div>
                </div>
              </div>

              <div style={{ background: 'white', padding: '25px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <h3 style={{marginTop: 0, color: '#d93025', display:'flex', alignItems:'center', gap:'10px'}}><FaExclamationTriangle /> Top 5 Prioridad de Reposición</h3>
                  <div style={{marginTop: '15px'}}>
                      {productosEnRiesgo.length > 0 ? productosEnRiesgo.map(prod => (
                          <div key={prod.id_producto} style={{marginBottom: '15px'}}>
                               <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '5px', fontWeight:'600'}}>
                                  <span>{prod.nombre_producto}</span>
                                  <span style={{color: prod.stock_actual === 0 ? '#212121' : '#d93025'}}>{prod.stock_actual} Unid.</span>
                               </div>
                               <div style={{width: '100%', background: '#f1f3f4', borderRadius: '10px', height: '12px', overflow:'hidden'}}>
                                  <div style={{width: `${(prod.stock_actual / maxScale) * 100}%`, background: prod.stock_actual === 0 ? '#212121' : '#ea4335', height: '100%'}}></div>
                               </div>
                          </div>
                      )) : <p style={{textAlign:'center', color:'#666'}}>No hay alertas pendientes. ¡Inventario Saludable!</p>}
                  </div>
              </div>
            </div>
          )}

          {activeSection === 'productos' && <CreateProduct onProductCreated={() => fetchDatosIniciales(localStorage.getItem('token'))} />}
          {activeSection === 'lotes' && <CreateLotPage />}
          {activeSection === 'ingresos' && <EntryPage />}
          {activeSection === 'salidas' && <OutputPage />} 
          {activeSection === 'trazabilidad' && <InventoryPage />}
          {activeSection === 'historial' && <HistoryPage />}

        </main>
      </div>
    </div>
  );
};

export default DashboardPage;