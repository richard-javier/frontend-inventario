import React, { useState, useEffect } from 'react';
import { FaBarcode, FaBoxOpen, FaTrash, FaEdit, FaTimes, FaSave, FaFileInvoiceDollar, FaMapMarkerAlt, FaTag, FaSearch, FaAngleLeft, FaAngleRight, FaMicrochip, FaPowerOff, FaRecycle } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const InventoryPage = () => {
  const [productos, setProductos] = useState([]); 
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // NUEVO ESTADO: Para ver EXCLUSIVAMENTE los descontinuados
  const [verSoloDescontinuados, setVerSoloDescontinuados] = useState(false);

  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 12;

  const [editingProduct, setEditingProduct] = useState(null); 
  const [replenishProduct, setReplenishProduct] = useState(null); 
  const [cantidadReponer, setCantidadReponer] = useState(1);

  const fetchInventario = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:3001/api/inventario', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProductos(Array.isArray(data) ? data : []);
      } else {
        setError("Error cargando inventario.");
      }
    } catch (error) {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventario();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, verSoloDescontinuados]);

  const getStockStatus = (prod) => {
    if (!prod) return { color: '#999', bg: '#f0f0f0', label: 'ERROR' };
    
    // Verificación de estado inactivo
    const isInactive = prod.status_equipo === 'Descontinuado' || prod.estado === 'INACTIVO';
    if (isInactive) return { color: '#5f6368', bg: '#f1f3f4', label: 'DESCONTINUADO' };
    
    const numActual = parseInt(prod.stock_actual || 0);
    const numMin = parseInt(prod.stock_minimo || 5);
    if (numActual === 0) return { color: '#5f6368', bg: '#e8eaed', label: 'AGOTADO' };
    if (numActual <= numMin) return { color: '#c5221f', bg: '#fce8e6', label: 'CRÍTICO' };
    if (numActual <= numMin + 3) return { color: '#b06000', bg: '#fef7e0', label: 'BAJO' };
    return { color: '#137333', bg: '#e6f4ea', label: 'ÓPTIMO' };
  };

  // NUEVA FUNCIÓN: Soft Delete (Cambia el estado a Descontinuado en lugar de borrar)
  const handleDescontinuar = async (prod) => {
    if (Number(prod.stock_actual) > 0) {
      alert("⛔ No se puede descontinuar un producto que aún tiene stock físico en bodega.");
      return;
    }
    if(!window.confirm(`¿Desea marcar como DESCONTINUADO el producto:\n"${prod.nombre_producto}"?`)) return;
    
    const token = localStorage.getItem('token');
    try {
        // Usamos el método PUT para actualizar el estado
        const response = await fetch(`http://localhost:3001/api/inventario/${prod.id_producto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ...prod, status_equipo: 'Descontinuado' })
        });
        if(response.ok) { fetchInventario(); }
    } catch (e) { alert("Error de conexión"); }
  };

  // NUEVA FUNCIÓN: Reactivar Producto
  const handleReactivar = async (prod) => {
    if(!window.confirm(`¿Desea REACTIVAR el producto para que vuelva al catálogo activo:\n"${prod.nombre_producto}"?`)) return;
    
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`http://localhost:3001/api/inventario/${prod.id_producto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ...prod, status_equipo: 'Nuevo' }) // Vuelve a estado Nuevo/Activo
        });
        if(response.ok) { fetchInventario(); }
    } catch (e) { alert("Error de conexión"); }
  };

  const handleUpdateSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`http://localhost:3001/api/inventario/${editingProduct.id_producto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(editingProduct)
        });
        if(response.ok) { setEditingProduct(null); fetchInventario(); }
    } catch (error) { console.error(error); }
  };

  const abrirModalReposicion = (prod) => {
      setReplenishProduct(prod);
      const sugerido = Math.max(0, Number(prod.stock_maximo || 0) - Number(prod.stock_actual || 0));
      setCantidadReponer(sugerido > 0 ? sugerido : 1);
  };

  const generarPDFReposicion = (e) => {
    e.preventDefault();
    const doc = new jsPDF();
    const producto = replenishProduct;
    if(!producto) return;

    doc.setFontSize(20);
    doc.setTextColor(26, 115, 232);
    doc.text("ORDEN DE REPOSICIÓN DE STOCK", 105, 20, { align: 'center' });
    
    const columns = ["Atributo", "Detalle Técnico"];
    const rows = [
      ["SKU Interno", producto.sku || 'N/A'],
      ["Part Number", producto.part_number || 'N/A'],
      ["Equipo", producto.nombre_producto || 'Sin Nombre'],
      ["Precio Ref.", `$${producto.precio || '0.00'}`],
      ["Stock Actual", producto.stock_actual || '0'],
      ["CANTIDAD SOLICITADA", cantidadReponer],
      ["COSTO ESTIMADO", `$${(Number(cantidadReponer) * Number(producto.precio || 0)).toFixed(2)}`]
    ];
    autoTable(doc, { startY: 45, head: [columns], body: rows, theme: 'grid', headStyles: { fillColor: [26, 115, 232] } });
    doc.save(`Reposicion_${producto.sku || 'Doc'}.pdf`);
    setReplenishProduct(null);
  };

  const formatearUbicaciones = (ubicacionStr) => {
    if (!ubicacionStr || ubicacionStr === 'Por Asignar') {
        return <span style={{color:'#d93025', fontSize:'0.85rem', fontWeight:'500'}}><FaMapMarkerAlt/> Por Asignar</span>;
    }
    const ubs = [...new Set(ubicacionStr.split(',').map(u => u.trim()))]; 
    if (ubs.length === 1) {
        return <span style={{color:'#34a853', fontWeight:'bold', fontSize:'0.85rem'}}><FaMapMarkerAlt/> {ubs[0]}</span>;
    }
    return (
        <select style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #1a73e8', fontSize: '0.8rem', background: '#e8f0fe', color: '#1a73e8', fontWeight: 'bold', cursor: 'pointer', outline: 'none', maxWidth: '120px' }}>
            <option value="" disabled selected>{ubs.length} Ubicaciones</option>
            {ubs.map((ub, idx) => <option key={idx} value={ub}>{ub}</option>)}
        </select>
    );
  };

  // --- NUEVA LÓGICA DE FILTRADO EXCLUSIVO ---
  const productosFiltrados = productos.filter(prod => {
    const isInactive = prod.status_equipo === 'Descontinuado' || prod.estado === 'INACTIVO';
    
    // Si queremos ver solo inactivos, ocultamos los activos
    if (verSoloDescontinuados && !isInactive) return false;
    // Si queremos ver solo activos (normal), ocultamos los inactivos
    if (!verSoloDescontinuados && isInactive) return false;

    const termino = busqueda.toLowerCase().trim();
    if (!termino) return true;
    
    const nombre = (prod.nombre_producto || '').toLowerCase();
    const barcode = (prod.codigo_barras || '').toLowerCase();
    const sku = (prod.sku || '').toLowerCase();
    const partNumber = (prod.part_number || '').toLowerCase();
    const modelo = (prod.modelo || '').toLowerCase();

    return nombre.includes(termino) || barcode.includes(termino) || sku.includes(termino) || partNumber.includes(termino) || modelo.includes(termino);
  });

  const indexUltimoItem = paginaActual * itemsPorPagina;
  const indexPrimerItem = indexUltimoItem - itemsPorPagina;
  const itemsActuales = productosFiltrados.slice(indexPrimerItem, indexUltimoItem);
  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);

  const cambiarPagina = (numeroPagina) => setPaginaActual(numeroPagina);

  return (
    <div style={{ padding: '25px', background: '#f4f6f8', minHeight: '100vh' }}>
      <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ color: verSoloDescontinuados ? '#5f6368' : '#1a73e8', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 5px 0', transition: 'color 0.3s' }}>
              <FaBoxOpen /> {verSoloDescontinuados ? 'Papelera de Equipos' : 'Catálogo y Existencias'}
            </h2>
            <p style={{ color: '#5f6368', fontSize: '0.9rem', margin: 0 }}>
              {verSoloDescontinuados ? 'Equipos marcados como inactivos.' : 'Gestión general de activos y repuestos.'}
            </p>
          </div>
          <div style={{ background: verSoloDescontinuados ? '#f1f3f4' : '#e8f0fe', color: verSoloDescontinuados ? '#5f6368' : '#1a73e8', padding: '8px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
            Mostrando: {productosFiltrados.length}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FaSearch style={{ position: 'absolute', left: '16px', top: '14px', color: '#80868b', fontSize: '1.1rem' }} />
            <input 
              type="text" 
              placeholder="Buscar por SKU, Part Number, Nombre o GTIN..." 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)} 
              style={{ width: '100%', padding: '12px 15px 12px 48px', borderRadius: '8px', border: '1px solid #dadce0', outline: 'none', boxSizing:'border-box', fontSize: '1rem', transition: 'border 0.3s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} 
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: verSoloDescontinuados ? '#3c4043' : 'white', padding: '12px 18px', borderRadius: '8px', border: '1px solid #dadce0', color: verSoloDescontinuados ? 'white' : '#3c4043', fontWeight: 'bold', transition: 'all 0.2s' }}>
              <input type="checkbox" checked={verSoloDescontinuados} onChange={(e) => setVerSoloDescontinuados(e.target.checked)} style={{ display: 'none' }} />
              <FaPowerOff color={verSoloDescontinuados ? '#ea4335' : '#80868b'} />
              {verSoloDescontinuados ? 'Volver al Inventario Activo' : 'Ver Solo Descontinuados'}
          </label>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', color: '#5f6368', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', width: '20%' }}>Identificación (SKU / PN)</th>
                <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', width: '35%' }}>Detalle del Equipo</th>
                <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', width: '10%' }}>Precio Ref.</th>
                <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', width: '15%', textAlign: 'center' }}>Stock Físico</th>
                <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', width: '20%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? ( <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#1a73e8', fontWeight: 'bold' }}>Cargando catálogo inteligente...</td></tr> ) : 
               itemsActuales.length > 0 ? (
                itemsActuales.map((prod) => {
                const status = getStockStatus(prod);
                const isInactive = prod.status_equipo === 'Descontinuado' || prod.estado === 'INACTIVO';

                return (
                  <tr key={prod.id_producto} style={{ borderBottom: '1px solid #f0f0f0', background: isInactive ? '#fdfdfd' : 'white', opacity: isInactive ? 0.8 : 1, transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = isInactive ? '#f1f3f4' : '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = isInactive ? '#fdfdfd' : 'white'}>
                    
                    <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight:'bold', color: isInactive ? '#5f6368' : '#202124', fontSize: '0.95rem', marginBottom: '4px' }}>
                          <FaTag color={isInactive ? "#9aa0a6" : "#1a73e8"} style={{ marginRight: '6px' }}/>{prod.sku || 'S/N'}
                        </div>
                        <div style={{ fontSize:'0.8rem', color:'#5f6368', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FaMicrochip /> PN: {prod.part_number || 'N/A'}
                        </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: isInactive ? '#80868b' : '#202124', fontSize: '0.95rem', marginBottom: '2px', textDecoration: isInactive ? 'line-through' : 'none' }}>{prod.nombre_producto}</div>
                      <div style={{ fontSize: '0.8rem', color: '#80868b' }}>
                        <span style={{ background: '#e8eaed', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>{prod.tipo_producto || 'Sin Cat.'}</span>
                        {prod.marca !== 'N/A' && ` • ${prod.marca}`} {prod.modelo !== 'N/A' && ` • Mod: ${prod.modelo}`}
                      </div>
                    </td>

                    <td style={{ padding: '16px', fontWeight: '600', color: isInactive ? '#80868b' : '#137333', fontSize: '0.95rem' }}>
                      ${prod.precio || '0.00'}
                    </td>
                    
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ background: status.bg, color: status.color, padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem', display: 'inline-block', marginBottom: '6px', border: `1px solid ${status.color}40` }}>
                        {prod.stock_actual} Uds. • {status.label}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {formatearUbicaciones(prod.ubicacion_bodega)}
                      </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        
                        {/* LÓGICA DE BOTONES: Si está inactivo muestra Reactivar, sino muestra los normales */}
                        {isInactive ? (
                          <button onClick={() => handleReactivar(prod)} title="Reactivar Producto" style={{ background: '#e6f4ea', color: '#137333', border: '1px solid #137333', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={(e) => {e.currentTarget.style.background = '#137333'; e.currentTarget.style.color = '#fff'}} onMouseOut={(e) => {e.currentTarget.style.background = '#e6f4ea'; e.currentTarget.style.color = '#137333'}}>
                            <FaRecycle size="1.1em" /> Reactivar
                          </button>
                        ) : (
                          <>
                            <button onClick={() => abrirModalReposicion(prod)} title="Orden de Reposición" style={{ background: '#fff', color: '#ea4335', border: '1px solid #ea4335', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => {e.currentTarget.style.background = '#ea4335'; e.currentTarget.style.color = '#fff'}} onMouseOut={(e) => {e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#ea4335'}}>
                              <FaFileInvoiceDollar size="1.1em" />
                            </button>
                            <button onClick={() => setEditingProduct(prod)} title="Editar Detalles" style={{ background: '#fff', color: '#1a73e8', border: '1px solid #1a73e8', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => {e.currentTarget.style.background = '#1a73e8'; e.currentTarget.style.color = '#fff'}} onMouseOut={(e) => {e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#1a73e8'}}>
                              <FaEdit size="1.1em" />
                            </button>
                            <button onClick={() => handleDescontinuar(prod)} disabled={Number(prod.stock_actual) > 0} title={Number(prod.stock_actual) > 0 ? "No se puede borrar con stock" : "Descontinuar Equipo"} style={{ background: 'none', border: '1px solid transparent', color: Number(prod.stock_actual) > 0 ? '#dadce0' : '#5f6368', padding: '8px 10px', borderRadius: '6px', cursor: Number(prod.stock_actual) > 0 ? 'not-allowed' : 'pointer' }} onMouseOver={(e) => { if(Number(prod.stock_actual) === 0) e.currentTarget.style.color = '#ea4335' }} onMouseOut={(e) => { if(Number(prod.stock_actual) === 0) e.currentTarget.style.color = '#5f6368' }}>
                              <FaPowerOff size="1.1em" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                );
               })
              ) : (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color:'#80868b', fontSize: '1.1rem' }}>
                  {verSoloDescontinuados ? "No hay equipos en la papelera." : "No se encontraron coincidencias en el catálogo."}
                </td></tr>
              )
            }
            </tbody>
          </table>
        </div>

        {/* CONTROLES DE PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px 0' }}>
            <span style={{ color: '#5f6368', fontSize: '0.9rem' }}>
              Mostrando {indexPrimerItem + 1} a {Math.min(indexUltimoItem, productosFiltrados.length)} de {productosFiltrados.length} equipos
            </span>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #dadce0', background: paginaActual === 1 ? '#f8f9fa' : 'white', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', color: '#5f6368' }}>
                <FaAngleLeft />
              </button>
              
              {[...Array(totalPaginas)].map((_, i) => {
                const num = i + 1;
                if (num === 1 || num === totalPaginas || (num >= paginaActual - 1 && num <= paginaActual + 1)) {
                  return (
                    <button key={num} onClick={() => cambiarPagina(num)} style={{ padding: '8px 14px', borderRadius: '6px', border: num === paginaActual ? '1px solid #1a73e8' : '1px solid #dadce0', background: num === paginaActual ? '#e8f0fe' : 'white', color: num === paginaActual ? '#1a73e8' : '#5f6368', fontWeight: num === paginaActual ? 'bold' : 'normal', cursor: 'pointer' }}>
                      {num}
                    </button>
                  );
                } else if (num === paginaActual - 2 || num === paginaActual + 2) {
                  return <span key={num} style={{ padding: '8px 4px', color: '#dadce0' }}>...</span>;
                }
                return null;
              })}

              <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #dadce0', background: paginaActual === totalPaginas ? '#f8f9fa' : 'white', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', color: '#5f6368' }}>
                <FaAngleRight />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODALES EDITAR Y REPOSICIÓN MANTENIDOS */}
      {editingProduct && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '8px' }}><FaEdit /> Actualizar Límites de Stock</h3>
              <button onClick={() => setEditingProduct(null)} style={closeBtnStyle}><FaTimes /></button>
            </div>
            <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '15px', borderLeft: '4px solid #1a73e8' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#5f6368' }}><strong>{editingProduct.sku}</strong> - {editingProduct.nombre_producto}</p>
            </div>
            <form onSubmit={handleUpdateSave}>
                <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap:'15px', marginBottom: '20px'}}>
                    <div><label style={labelStyle}>Mínimo (Alerta):</label><input type="number" value={editingProduct.stock_minimo || ''} onChange={(e) => setEditingProduct({...editingProduct, stock_minimo: e.target.value})} style={inputStyle} required /></div>
                    <div><label style={labelStyle}>Máximo Permitido:</label><input type="number" value={editingProduct.stock_maximo || ''} onChange={(e) => setEditingProduct({...editingProduct, stock_maximo: e.target.value})} style={inputStyle} required /></div>
                </div>
                <div style={{textAlign: 'right'}}><button type="submit" style={saveBtnStyle}><FaSave style={{marginRight: '8px'}}/> Guardar Parámetros</button></div>
            </form>
          </div>
        </div>
      )}

      {replenishProduct && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{...modalHeaderStyle, borderBottom: '2px solid #ea4335', paddingBottom: '10px'}}>
              <h3 style={{ margin: 0, color: '#ea4335', display: 'flex', alignItems: 'center', gap: '8px' }}><FaFileInvoiceDollar /> Orden de Reposición</h3>
              <button onClick={() => setReplenishProduct(null)} style={closeBtnStyle}><FaTimes /></button>
            </div>
            <form onSubmit={generarPDFReposicion} style={{padding: '10px 0'}}>
                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{replenishProduct.nombre_producto}</p>
                <div style={{background: '#f8f9fa', padding: '20px', borderRadius: '8px', margin: '15px 0', border: '1px solid #dadce0'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#5f6368'}}><span>Referencia de Costo:</span> <strong>${replenishProduct.precio || '0.00'}</strong></div>
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                       <label style={{fontWeight: 'bold', color: '#202124'}}>Cantidad a Pedir:</label>
                       <input type="number" min="1" value={cantidadReponer} onChange={(e) => setCantidadReponer(e.target.value)} style={{ padding: '10px', width: '90px', border: '2px solid #ea4335', borderRadius: '6px', fontSize: '1.1rem', textAlign: 'center', fontWeight: 'bold' }} required />
                   </div>
                   <hr style={{ border: 'none', borderTop: '1px solid #dadce0', margin: '15px 0' }}/>
                   <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', color: '#137333'}}>
                       <span>Estimado Total:</span>
                       <strong>${(Number(cantidadReponer) * Number(replenishProduct.precio || 0)).toFixed(2)}</strong>
                   </div>
                </div>
                <button type="submit" style={{...saveBtnStyle, background: '#ea4335', width: '100%', fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'}}><FaSave /> Generar Orden (PDF)</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#5f6368' };
const inputStyle = { width: '100%', padding: '10px', marginTop: '6px', borderRadius: '6px', border: '1px solid #dadce0', boxSizing: 'border-box', fontSize: '1rem', outline: 'none' };
const labelStyle = { fontSize: '0.85rem', fontWeight: 'bold', color: '#5f6368', textTransform: 'uppercase' };
const saveBtnStyle = { background: '#1a73e8', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' };

export default InventoryPage;