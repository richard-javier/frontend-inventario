import React, { useState, useEffect } from 'react';
import { FaBoxOpen, FaTrash, FaEdit, FaTimes, FaSave, FaFileInvoiceDollar, FaMapMarkerAlt, FaTag, FaSearch, FaAngleLeft, FaAngleRight, FaMicrochip, FaPowerOff, FaRecycle, FaClock, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import { exportarInventarioPDF, exportarInventarioExcel, generarPDFReposicion } from '../utils/exportReports';
import '../css/InventoryPage.css';

const InventoryPage = () => {
  const [productos, setProductos] = useState([]); 
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [verSoloDescontinuados, setVerSoloDescontinuados] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [fechaHora, setFechaHora] = useState(new Date()); // Reloj en vivo

  const [editingProduct, setEditingProduct] = useState(null); 
  const [replenishProduct, setReplenishProduct] = useState(null); 
  const [cantidadReponer, setCantidadReponer] = useState(1);
  const itemsPorPagina = 12;

  // Actualizador del Reloj
  useEffect(() => {
    const timer = setInterval(() => setFechaHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchInventario = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:3001/api/inventario', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setProductos(await response.json() || []);
    } catch (error) { console.error("Error cargando inventario", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInventario(); }, []);
  useEffect(() => { setPaginaActual(1); }, [busqueda, verSoloDescontinuados]);

  // Lógica de Estados Visuales
  const getStockStatus = (prod) => {
    const isInactive = prod.status_equipo === 'Descontinuado' || prod.estado === 'INACTIVO';
    if (isInactive) return { color: '#5f6368', bg: '#f1f3f4', label: 'DESCONTINUADO' };
    const numActual = parseInt(prod.stock_actual || 0);
    const numMin = parseInt(prod.stock_minimo || 5);
    if (numActual === 0) return { color: '#5f6368', bg: '#e8eaed', label: 'AGOTADO' };
    if (numActual <= numMin) return { color: '#c5221f', bg: '#fce8e6', label: 'CRÍTICO' };
    if (numActual <= numMin + 3) return { color: '#b06000', bg: '#fef7e0', label: 'BAJO' };
    return { color: '#137333', bg: '#e6f4ea', label: 'ÓPTIMO' };
  };

  // Funciones CRUD
  const handleDescontinuar = async (prod) => {
    if (Number(prod.stock_actual) > 0) return alert("⛔ No se puede descontinuar con stock físico.");
    if(!window.confirm(`¿Descontinuar:\n"${prod.nombre_producto}"?`)) return;
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:3001/api/inventario/${prod.id_producto}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...prod, status_equipo: 'Descontinuado' })
    });
    fetchInventario();
  };

  const handleReactivar = async (prod) => {
    if(!window.confirm(`¿Reactivar:\n"${prod.nombre_producto}"?`)) return;
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:3001/api/inventario/${prod.id_producto}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...prod, status_equipo: 'Nuevo' }) 
    });
    fetchInventario();
  };

  const handleUpdateSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:3001/api/inventario/${editingProduct.id_producto}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editingProduct)
    });
    setEditingProduct(null); fetchInventario();
  };

  const abrirModalReposicion = (prod) => {
      setReplenishProduct(prod);
      const sugerido = Math.max(0, Number(prod.stock_maximo || 0) - Number(prod.stock_actual || 0));
      setCantidadReponer(sugerido > 0 ? sugerido : 1);
  };

  // Filtrado de Productos
  const productosFiltrados = productos.filter(prod => {
    const isInactive = prod.status_equipo === 'Descontinuado' || prod.estado === 'INACTIVO';
    if (verSoloDescontinuados && !isInactive) return false;
    if (!verSoloDescontinuados && isInactive) return false;

    const termino = busqueda.toLowerCase().trim();
    if (!termino) return true;
    return (prod.nombre_producto || '').toLowerCase().includes(termino) || 
           (prod.sku || '').toLowerCase().includes(termino) || 
           (prod.part_number || '').toLowerCase().includes(termino);
  });

  const indexUltimoItem = paginaActual * itemsPorPagina;
  const indexPrimerItem = indexUltimoItem - itemsPorPagina;
  const itemsActuales = productosFiltrados.slice(indexPrimerItem, indexUltimoItem);
  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);

  return (
    <div className="inventory-container">
      <div className="inventory-card">
        
        {/* ENCABEZADO CON RELOJ Y BOTONES NUEVOS */}
        <div className="header-section">
          <div className="title-group">
            <h2 style={{ color: verSoloDescontinuados ? '#5f6368' : '#1a73e8', display: 'flex', alignItems: 'center', gap: '10px', margin: '0' }}>
              <FaBoxOpen /> {verSoloDescontinuados ? 'Papelera de Equipos' : 'Catálogo y Existencias'}
            </h2>
            <div className="live-clock">
              <FaClock /> {fechaHora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - {fechaHora.toLocaleTimeString('es-ES')}
            </div>
          </div>
          
          <div className="action-group">
            <button className="btn-export-excel" onClick={() => exportarInventarioExcel(productosFiltrados)}>
              <FaFileExcel /> Descargar Excel
            </button>
            <button className="btn-export-pdf" onClick={() => exportarInventarioPDF(productosFiltrados)}>
              <FaFilePdf /> Descargar PDF
            </button>
            <div className="stock-counter" style={{ background: verSoloDescontinuados ? '#f1f3f4' : '#e8f0fe', color: verSoloDescontinuados ? '#5f6368' : '#1a73e8' }}>
              Mostrando: {productosFiltrados.length}
            </div>
          </div>
        </div>

        {/* BUSCADOR Y FILTRO */}
        <div className="filter-section">
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Buscar por SKU, Part Number, Nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="search-input" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: verSoloDescontinuados ? '#3c4043' : 'white', padding: '12px 18px', borderRadius: '8px', border: '1px solid #dadce0', color: verSoloDescontinuados ? 'white' : '#3c4043', fontWeight: 'bold' }}>
              <input type="checkbox" checked={verSoloDescontinuados} onChange={(e) => setVerSoloDescontinuados(e.target.checked)} style={{ display: 'none' }} />
              <FaPowerOff color={verSoloDescontinuados ? '#ea4335' : '#80868b'} />
              {verSoloDescontinuados ? 'Volver al Activo' : 'Ver Descontinuados'}
          </label>
        </div>

        {/* TABLA DE PRODUCTOS */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Identificación</th>
                <th style={{ width: '35%' }}>Detalle del Equipo</th>
                <th style={{ width: '10%' }}>Precio Ref.</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Stock Físico</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? ( <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#1a73e8', fontWeight: 'bold' }}>Cargando catálogo inteligente...</td></tr> ) : 
               itemsActuales.length > 0 ? (
                itemsActuales.map((prod) => {
                const status = getStockStatus(prod);
                const isInactive = prod.status_equipo === 'Descontinuado' || prod.estado === 'INACTIVO';

                return (
                  <tr key={prod.id_producto} style={{ opacity: isInactive ? 0.8 : 1 }}>
                    <td>
                        <div style={{ fontWeight:'bold', color: isInactive ? '#5f6368' : '#202124', fontSize: '0.95rem' }}><FaTag color={isInactive ? "#9aa0a6" : "#1a73e8"} style={{ marginRight: '6px' }}/>{prod.sku || 'S/N'}</div>
                        <div style={{ fontSize:'0.8rem', color:'#5f6368', display: 'flex', alignItems: 'center', gap: '4px' }}><FaMicrochip /> PN: {prod.part_number || 'N/A'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: isInactive ? '#80868b' : '#202124', fontSize: '0.95rem', textDecoration: isInactive ? 'line-through' : 'none' }}>{prod.nombre_producto}</div>
                      <div style={{ fontSize: '0.8rem', color: '#80868b' }}>{prod.tipo_producto || 'Sin Cat.'} • {prod.marca}</div>
                    </td>
                    <td style={{ fontWeight: '600', color: isInactive ? '#80868b' : '#137333' }}>${prod.precio || '0.00'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ background: status.bg, color: status.color, padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem', display: 'inline-block', border: `1px solid ${status.color}40` }}>
                        {prod.stock_actual} Uds. • {status.label}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {isInactive ? (
                          <button onClick={() => handleReactivar(prod)} style={{ background: '#e6f4ea', color: '#137333', border: '1px solid #137333', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaRecycle /> Reactivar
                          </button>
                        ) : (
                          <>
                            <button onClick={() => abrirModalReposicion(prod)} style={{ background: '#fff', color: '#ea4335', border: '1px solid #ea4335', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer' }}><FaFileInvoiceDollar /></button>
                            <button onClick={() => setEditingProduct(prod)} style={{ background: '#fff', color: '#1a73e8', border: '1px solid #1a73e8', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer' }}><FaEdit /></button>
                            <button onClick={() => handleDescontinuar(prod)} disabled={Number(prod.stock_actual) > 0} style={{ background: 'none', border: 'none', color: Number(prod.stock_actual) > 0 ? '#dadce0' : '#5f6368', cursor: Number(prod.stock_actual) > 0 ? 'not-allowed' : 'pointer' }}><FaPowerOff /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
               })
              ) : (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color:'#80868b' }}>No se encontraron coincidencias.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <span style={{ color: '#5f6368', fontSize: '0.9rem' }}>Mostrando {indexPrimerItem + 1} a {Math.min(indexUltimoItem, productosFiltrados.length)} de {productosFiltrados.length}</span>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => setPaginaActual(paginaActual - 1)} disabled={paginaActual === 1} style={{ padding: '8px 12px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer' }}><FaAngleLeft /></button>
              <span style={{ padding: '8px', color: '#1a73e8', fontWeight: 'bold' }}>{paginaActual} / {totalPaginas}</span>
              <button onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual === totalPaginas} style={{ padding: '8px 12px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer' }}><FaAngleRight /></button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL EDITAR */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1a73e8' }}><FaEdit /> Límites de Stock</h3>
              <button onClick={() => setEditingProduct(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}><FaTimes /></button>
            </div>
            <form onSubmit={handleUpdateSave}>
                <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap:'15px', marginBottom: '20px'}}>
                    <div><label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Mínimo (Alerta):</label><input type="number" value={editingProduct.stock_minimo || ''} onChange={(e) => setEditingProduct({...editingProduct, stock_minimo: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #dadce0' }} required /></div>
                    <div><label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Máximo Permitido:</label><input type="number" value={editingProduct.stock_maximo || ''} onChange={(e) => setEditingProduct({...editingProduct, stock_maximo: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #dadce0' }} required /></div>
                </div>
                <div style={{textAlign: 'right'}}><button type="submit" style={{ background: '#1a73e8', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Guardar Parámetros</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REPOSICIÓN */}
      {replenishProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ea4335', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#ea4335' }}><FaFileInvoiceDollar /> Orden de Reposición</h3>
              <button onClick={() => setReplenishProduct(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}><FaTimes /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); generarPDFReposicion(replenishProduct, cantidadReponer); setReplenishProduct(null); }}>
                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{replenishProduct.nombre_producto}</p>
                <div style={{background: '#f8f9fa', padding: '20px', borderRadius: '8px', margin: '15px 0', border: '1px solid #dadce0'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}><span>Costo Unitario:</span> <strong>${replenishProduct.precio || '0.00'}</strong></div>
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                       <label style={{fontWeight: 'bold'}}>Cantidad a Pedir:</label>
                       <input type="number" min="1" value={cantidadReponer} onChange={(e) => setCantidadReponer(e.target.value)} style={{ padding: '10px', width: '90px', border: '2px solid #ea4335', borderRadius: '6px', fontSize: '1.1rem', textAlign: 'center' }} required />
                   </div>
                </div>
                <button type="submit" style={{ background: '#ea4335', color: 'white', width: '100%', padding: '12px', border: 'none', borderRadius: '6px', fontSize: '1.05rem', cursor: 'pointer' }}>Generar Orden (PDF)</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;