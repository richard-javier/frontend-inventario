import React, { useState, useEffect } from 'react';
import { FaChartLine, FaSearch, FaFilePdf, FaFileExcel, FaClock, FaDollarSign, FaBoxes, FaSpinner, FaAngleLeft, FaAngleRight } from 'react-icons/fa';
import { exportarStockValoradoPDF, exportarStockValoradoExcel } from '../utils/exportReports';

const ValuedStockPage = () => {
  const [productos, setProductos] = useState([]); 
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [fechaHora, setFechaHora] = useState(new Date()); 
  
  // --- NUEVO ESTADO PARA PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 15; // Límite de 15 productos por página

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setFechaHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchInventario = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:3001/api/inventario', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
          const data = await response.json();
          // AQUÍ GARANTIZAMOS QUE SOLO VENGAN LOS QUE TIENEN CANTIDAD > 0
          setProductos(Array.isArray(data) ? data.filter(p => Number(p.stock_actual) > 0) : []);
      }
    } catch (error) { console.error("Error cargando inventario", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInventario(); }, []);

  // Resetear la página a 1 cada vez que el usuario busca algo
  useEffect(() => { setPaginaActual(1); }, [busqueda]);

  // Filtro de búsqueda
  const productosFiltrados = productos.filter(prod => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) return true;
    return (prod.nombre_producto || '').toLowerCase().includes(termino) || 
           (prod.sku || '').toLowerCase().includes(termino) || 
           (prod.part_number || '').toLowerCase().includes(termino);
  });

  // --- LÓGICA MATEMÁTICA DE PAGINACIÓN ---
  const indexUltimoItem = paginaActual * itemsPorPagina;
  const indexPrimerItem = indexUltimoItem - itemsPorPagina;
  const itemsActuales = productosFiltrados.slice(indexPrimerItem, indexUltimoItem); // Solo los 15 de esta página
  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);

  // Cálculos Financieros Rápidos (Se calculan sobre todos los filtrados, no solo los de la página actual)
  const totalInversion = productosFiltrados.reduce((sum, p) => sum + (Number(p.stock_actual) * Number(p.precio || 0)), 0);
  const totalArticulosFisicos = productosFiltrados.reduce((sum, p) => sum + Number(p.stock_actual), 0);

  if (loading) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#34a853" /><p>Calculando valoraciones...</p></div>;

  return (
    <div style={{ padding: '25px', background: '#f4f6f8', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* TARJETAS FINANCIERAS (Dashboard Rápido) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }}>
          <div style={{ background: '#202124', color: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ background: 'rgba(52, 168, 83, 0.2)', padding: '15px', borderRadius: '50%' }}><FaDollarSign size="2em" color="#34a853"/></div>
              <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '1px' }}>Inversión Total en Bodega</p>
                  <h2 style={{ margin: 0, fontSize: '2.2rem', color: '#34a853' }}>${totalInversion.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
              </div>
          </div>
          
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #e0e0e0' }}>
              <div style={{ background: '#e8f0fe', padding: '15px', borderRadius: '50%' }}><FaBoxes size="2em" color="#1a73e8"/></div>
              <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#5f6368', textTransform: 'uppercase' }}>Unidades Físicas (Total)</p>
                  <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#202124' }}>{totalArticulosFisicos.toLocaleString()} Uds.</h2>
              </div>
          </div>

          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #e0e0e0' }}>
              <div style={{ background: '#fef7e0', padding: '15px', borderRadius: '50%' }}><FaChartLine size="2em" color="#fbbc04"/></div>
              <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#5f6368', textTransform: 'uppercase' }}>Variedad de SKUs</p>
                  <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#202124' }}>{productosFiltrados.length} Modelos</h2>
              </div>
          </div>
      </div>

      <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
        
        {/* ENCABEZADO Y RELOJ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f2f5', paddingBottom: '20px', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ color: '#34a853', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 8px 0' }}>
              <FaChartLine /> Reporte de Stock Valorado
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f8f9fa', padding: '6px 12px', borderRadius: '6px', color: '#5f6368', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid #dadce0' }}>
              <FaClock /> {fechaHora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - {fechaHora.toLocaleTimeString('es-ES')}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => exportarStockValoradoExcel(productosFiltrados)} style={{ background: '#e6f4ea', color: '#137333', border: '1px solid #e6f4ea', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }}>
              <FaFileExcel /> Descargar Excel
            </button>
            <button onClick={() => exportarStockValoradoPDF(productosFiltrados)} style={{ background: '#fce8e6', color: '#d93025', border: '1px solid #fce8e6', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }}>
              <FaFilePdf /> Descargar PDF
            </button>
          </div>
        </div>

        {/* BUSCADOR */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FaSearch style={{ position: 'absolute', left: '16px', top: '14px', color: '#80868b', fontSize: '1.1rem' }} />
            <input 
              type="text" 
              placeholder="Buscar por SKU o Nombre del Equipo..." 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)} 
              style={{ width: '100%', padding: '12px 15px 12px 48px', borderRadius: '8px', border: '1px solid #dadce0', outline: 'none', boxSizing:'border-box', fontSize: '1rem' }} 
            />
          </div>
        </div>

        {/* TABLA VALORADA PAGINADA */}
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', color: '#5f6368', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', width: '15%' }}>SKU</th>
                <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', width: '35%' }}>Equipo / Modelo</th>
                <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', width: '15%', textAlign: 'center' }}>Stock Físico</th>
                <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', width: '15%', textAlign: 'right' }}>Costo Unit.</th>
                <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', width: '20%', textAlign: 'right' }}>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {itemsActuales.length > 0 ? (
                itemsActuales.map((prod) => {
                  const stock = Number(prod.stock_actual) || 0;
                  const precio = Number(prod.precio) || 0;
                  const total = stock * precio;

                  return (
                    <tr key={prod.id_producto} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '16px', fontWeight: 'bold', color: '#1a73e8', fontSize: '0.95rem' }}>{prod.sku}</td>
                      <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '600', color: '#202124', marginBottom: '4px' }}>{prod.nombre_producto}</div>
                          <div style={{ fontSize: '0.8rem', color: '#80868b' }}>Marca: {prod.marca}</div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{ background: '#e8f0fe', color: '#1a73e8', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                              {stock}
                          </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', color: '#5f6368', fontWeight: '500' }}>
                          ${precio.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: '#137333', fontSize: '1.05rem' }}>
                          ${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color:'#80868b' }}>No hay productos con stock para valorar.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CONTROLES DE PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px 0' }}>
            <span style={{ color: '#5f6368', fontSize: '0.9rem' }}>
              Mostrando {indexPrimerItem + 1} a {Math.min(indexUltimoItem, productosFiltrados.length)} de {productosFiltrados.length} modelos valorados
            </span>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => setPaginaActual(paginaActual - 1)} 
                disabled={paginaActual === 1} 
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #dadce0', background: paginaActual === 1 ? '#f8f9fa' : 'white', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', color: '#5f6368' }}
              >
                <FaAngleLeft />
              </button>
              
              <span style={{ padding: '8px', color: '#34a853', fontWeight: 'bold', fontSize: '1rem' }}>
                {paginaActual} / {totalPaginas}
              </span>

              <button 
                onClick={() => setPaginaActual(paginaActual + 1)} 
                disabled={paginaActual === totalPaginas} 
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #dadce0', background: paginaActual === totalPaginas ? '#f8f9fa' : 'white', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', color: '#5f6368' }}
              >
                <FaAngleRight />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ValuedStockPage;