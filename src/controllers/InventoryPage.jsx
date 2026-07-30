import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api.js';
import { FaBoxOpen, FaTrash, FaEdit, FaTimes, FaSave, FaFileInvoiceDollar, FaMapMarkerAlt, FaTag, FaSearch, FaAngleLeft, FaAngleRight, FaMicrochip, FaPowerOff, FaRecycle, FaClock, FaFilePdf, FaFileExcel, FaWarehouse, FaStepBackward, FaStepForward } from 'react-icons/fa';
import { exportarInventarioPDF, exportarInventarioExcel, generarPDFReposicion } from '../utils/exportReports';
import '../css/InventoryPage.css';

const InventoryPage = () => {
  const [productos, setProductos] = useState([]); 
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [verSoloDescontinuados, setVerSoloDescontinuados] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [fechaHora, setFechaHora] = useState(new Date()); 

  const [editingProduct, setEditingProduct] = useState(null); 
  const [replenishProduct, setReplenishProduct] = useState(null); 
  const [cantidadReponer, setCantidadReponer] = useState(1);
  const itemsPorPagina = 12;

  useEffect(() => {
    const timer = setInterval(() => setFechaHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchInventario = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/inventario`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setProductos(await response.json() || []);
    } catch (error) { console.error("Error cargando inventario", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInventario(); }, []);
  useEffect(() => { setPaginaActual(1); }, [busqueda, verSoloDescontinuados]);

  // --- LÓGICA DE EXTRACCIÓN DE BODEGA Y UBICACIÓN ---
  const getUbicacionDetalle = (ubicacionStr) => {
    if (!ubicacionStr || ubicacionStr === 'Por Asignar' || ubicacionStr === 'Sin Asignar') {
        return { idBodega: '-', descBodega: 'Sin Asignar', rack: 'Por Asignar' };
    }
    
    // Si la ubicación viene en formato "B01-A01A01"
    if (ubicacionStr.includes('-')) {
        const parts = ubicacionStr.split('-');
        const bId = parts[0];
        const rackFisico = parts[1];
        
        let bDesc = 'Bodega General';
        if (bId === 'B00') bDesc = 'Materia prima';
        else if (bId === 'B01') bDesc = 'Producto terminado';
        else if (bId === 'B02') bDesc = 'Refabricado';
        else if (bId === 'B03') bDesc = 'Devoluciones';
        else if (bId === 'B04') bDesc = 'Dañados';
        else if (bId === 'B05') bDesc = 'Despacho';

        return { idBodega: bId, descBodega: bDesc, rack: rackFisico };
    }
    
    return { idBodega: '-', descBodega: 'Bodega General', rack: ubicacionStr };
  };

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

  const handleDescontinuar = async (prod) => {
    if (Number(prod.stock_actual) > 0) return alert("⛔ No se puede descontinuar con stock físico.");
    if(!window.confirm(`¿Descontinuar:\n"${prod.nombre_producto}"?`)) return;
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/inventario/${prod.id_producto}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...prod, status_equipo: 'Descontinuado' })
    });
    fetchInventario();
  };

  const handleReactivar = async (prod) => {
    if(!window.confirm(`¿Reactivar:\n"${prod.nombre_producto}"?`)) return;
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/inventario/${prod.id_producto}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...prod, status_equipo: 'Nuevo' }) 
    });
    fetchInventario();
  };

  const handleUpdateSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/inventario/${editingProduct.id_producto}`, {
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

  const productosFiltrados = productos.filter(prod => {
    const isInactive = prod.status_equipo === 'Descontinuado' || prod.estado === 'INACTIVO';
    if (verSoloDescontinuados && !isInactive) return false;
    if (!verSoloDescontinuados && isInactive) return false;

    const termino = busqueda.toLowerCase().trim();
    if (!termino) return true;
    return (prod.nombre_producto || '').toLowerCase().includes(termino) || 
           (prod.sku || '').toLowerCase().includes(termino) || 
           (prod.part_number || '').toLowerCase().includes(termino) ||
           (prod.ubicacion_bodega || '').toLowerCase().includes(termino);
  });

  const indexUltimoItem = paginaActual * itemsPorPagina;
  const indexPrimerItem = indexUltimoItem - itemsPorPagina;
  const itemsActuales = productosFiltrados.slice(indexPrimerItem, indexUltimoItem);
  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);
  const desdeRegistro = productosFiltrados.length === 0 ? 0 : indexPrimerItem + 1;
  const hastaRegistro = Math.min(indexUltimoItem, productosFiltrados.length);

  const cambiarPagina = (pagina) => {
    const paginaSegura = Math.min(Math.max(pagina, 1), totalPaginas || 1);
    setPaginaActual(paginaSegura);
  };

  const getPaginasVisibles = () => {
    if (totalPaginas <= 7) {
      return Array.from({ length: totalPaginas }, (_, index) => index + 1);
    }

    if (paginaActual <= 4) return [1, 2, 3, 4, 5, '...', totalPaginas];
    if (paginaActual >= totalPaginas - 3) return [1, '...', totalPaginas - 4, totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas];

    return [1, '...', paginaActual - 1, paginaActual, paginaActual + 1, '...', totalPaginas];
  };

  return (
    <div className="inventory-container">
      <div className="inventory-card">
        
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

        <div className="filter-section">
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Buscar por SKU, Part Number, Ubicación, Nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="search-input" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: verSoloDescontinuados ? '#3c4043' : 'white', padding: '12px 18px', borderRadius: '8px', border: '1px solid #dadce0', color: verSoloDescontinuados ? 'white' : '#3c4043', fontWeight: 'bold' }}>
              <input type="checkbox" checked={verSoloDescontinuados} onChange={(e) => setVerSoloDescontinuados(e.target.checked)} style={{ display: 'none' }} />
              <FaPowerOff color={verSoloDescontinuados ? '#ea4335' : '#80868b'} />
              {verSoloDescontinuados ? 'Volver al Activo' : 'Ver Descontinuados'}
          </label>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '13%' }}>Identificación</th>
                <th style={{ width: '25%' }}>Detalle del Equipo</th>
                <th style={{ width: '15%' }}>Bodega</th>
                <th style={{ width: '10%' }}>Ubicación</th>
                <th style={{ width: '9%' }}>Precio Ref.</th>
                <th style={{ width: '12%', textAlign: 'center' }}>Stock Físico</th>
                <th style={{ width: '16%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? ( <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#1a73e8', fontWeight: 'bold' }}>Cargando catálogo inteligente...</td></tr> ) : 
               itemsActuales.length > 0 ? (
                itemsActuales.map((prod) => {
                const status = getStockStatus(prod);
                const isInactive = prod.status_equipo === 'Descontinuado' || prod.estado === 'INACTIVO';
                const ubi = getUbicacionDetalle(prod.ubicacion_bodega);

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
                    
                    {/* NUEVA COLUMNA DE BODEGA */}
                    <td>
                      <div style={{ fontWeight: 'bold', color: '#1a73e8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FaWarehouse size="0.8em"/> {ubi.idBodega}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#5f6368', textTransform: 'uppercase' }}>{ubi.descBodega}</div>
                    </td>

                    {/* NUEVA COLUMNA DE UBICACIÓN FÍSICA */}
                    <td>
                        <div style={{ background: ubi.rack === 'Por Asignar' ? '#f1f3f4' : '#fef7e0', color: ubi.rack === 'Por Asignar' ? '#5f6368' : '#b06000', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${ubi.rack === 'Por Asignar' ? '#dadce0' : '#fbbc04'}`, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            <FaMapMarkerAlt /> {ubi.rack}
                        </div>
                    </td>

                    <td style={{ fontWeight: '600', color: isInactive ? '#80868b' : '#137333' }}>${prod.precio || '0.00'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ background: status.bg, color: status.color, padding: '6px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem', display: 'inline-block', border: `1px solid ${status.color}40` }}>
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
                            <button onClick={() => abrirModalReposicion(prod)} title="Orden de Reposición" style={{ background: '#fff', color: '#ea4335', border: '1px solid #ea4335', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}><FaFileInvoiceDollar /></button>
                            <button onClick={() => setEditingProduct(prod)} title="Editar Stock" style={{ background: '#fff', color: '#1a73e8', border: '1px solid #1a73e8', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}><FaEdit /></button>
                            <button onClick={() => handleDescontinuar(prod)} title="Descontinuar" disabled={Number(prod.stock_actual) > 0} style={{ background: 'none', border: 'none', color: Number(prod.stock_actual) > 0 ? '#dadce0' : '#5f6368', cursor: Number(prod.stock_actual) > 0 ? 'not-allowed' : 'pointer' }}><FaPowerOff /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
               })
              ) : (
                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color:'#80868b' }}>No se encontraron coincidencias.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <div className="pagination-summary">
            <strong>{desdeRegistro}-{hastaRegistro}</strong> de {productosFiltrados.length} registros
            <span>Pagina {paginaActual} de {Math.max(totalPaginas, 1)}</span>
          </div>

          {totalPaginas > 1 && (
            <nav className="pagination-controls" aria-label="Navegacion de inventario">
              <button className="pagination-btn pagination-edge" onClick={() => cambiarPagina(1)} disabled={paginaActual === 1} title="Primera pagina">
                <FaStepBackward />
              </button>
              <button className="pagination-btn" onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1} title="Pagina anterior">
                <FaAngleLeft />
                <span>Anterior</span>
              </button>

              <div className="pagination-pages">
                {getPaginasVisibles().map((pagina, index) => (
                  pagina === '...' ? (
                    <span className="pagination-ellipsis" key={`ellipsis-${index}`}>...</span>
                  ) : (
                    <button
                      className={`pagination-page ${pagina === paginaActual ? 'active' : ''}`}
                      key={pagina}
                      onClick={() => cambiarPagina(pagina)}
                      aria-current={pagina === paginaActual ? 'page' : undefined}
                    >
                      {pagina}
                    </button>
                  )
                ))}
              </div>

              <button className="pagination-btn" onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} title="Pagina siguiente">
                <span>Siguiente</span>
                <FaAngleRight />
              </button>
              <button className="pagination-btn pagination-edge" onClick={() => cambiarPagina(totalPaginas)} disabled={paginaActual === totalPaginas} title="Ultima pagina">
                <FaStepForward />
              </button>
            </nav>
          )}
        </div>

      </div>

      {editingProduct && (
        <div className="inventory-stock-modal-overlay">
          <div className="inventory-stock-modal" role="dialog" aria-modal="true" aria-labelledby="stock-limits-title">
            <button
              type="button"
              className="inventory-stock-modal-close"
              onClick={() => setEditingProduct(null)}
              aria-label="Cerrar ventana de límites de stock"
              title="Cerrar"
            >
              <FaTimes />
            </button>

            <div className="inventory-stock-modal-header">
              <span className="inventory-stock-modal-icon"><FaEdit /></span>
              <div>
                <h3 id="stock-limits-title">Límites de Stock</h3>
                <p>{editingProduct.nombre_producto || 'Producto seleccionado'}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateSave} className="inventory-stock-modal-form">
                <div className="inventory-stock-modal-grid">
                    <label className="inventory-stock-field">
                      <span>Mínimo de alerta</span>
                      <input
                        type="number"
                        min="0"
                        value={editingProduct.stock_minimo || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, stock_minimo: e.target.value})}
                        required
                      />
                    </label>
                    <label className="inventory-stock-field">
                      <span>Máximo permitido</span>
                      <input
                        type="number"
                        min="0"
                        value={editingProduct.stock_maximo || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, stock_maximo: e.target.value})}
                        required
                      />
                    </label>
                </div>

                <div className="inventory-stock-modal-actions">
                  <button type="button" className="inventory-stock-btn secondary" onClick={() => setEditingProduct(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="inventory-stock-btn primary">
                    <FaSave /> Guardar parámetros
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {replenishProduct && (
        <div className="inventory-replenish-modal-overlay">
          <div className="inventory-replenish-modal" role="dialog" aria-modal="true" aria-labelledby="replenish-order-title">
            <button
              type="button"
              className="inventory-replenish-modal-close"
              onClick={() => setReplenishProduct(null)}
              aria-label="Cerrar orden de reposición"
              title="Cerrar"
            >
              <FaTimes />
            </button>

            <div className="inventory-replenish-modal-header">
              <span className="inventory-replenish-modal-icon"><FaFileInvoiceDollar /></span>
              <div>
                <h3 id="replenish-order-title">Orden de Reposición</h3>
                <p>{replenishProduct.nombre_producto}</p>
              </div>
            </div>

            <form className="inventory-replenish-modal-form" onSubmit={(e) => { e.preventDefault(); generarPDFReposicion(replenishProduct, cantidadReponer); setReplenishProduct(null); }}>
                <div className="inventory-replenish-summary">
                   <div className="inventory-replenish-row">
                     <span>Costo unitario</span>
                     <strong>${replenishProduct.precio || '0.00'}</strong>
                   </div>
                   <label className="inventory-replenish-quantity">
                       <span>Cantidad a pedir</span>
                       <input
                         type="number"
                         min="1"
                         value={cantidadReponer}
                         onChange={(e) => setCantidadReponer(e.target.value)}
                         required
                       />
                   </label>
                </div>

                <div className="inventory-replenish-modal-actions">
                  <button type="button" className="inventory-replenish-btn secondary" onClick={() => setReplenishProduct(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="inventory-replenish-btn primary">
                    <FaFilePdf /> Generar orden PDF
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
