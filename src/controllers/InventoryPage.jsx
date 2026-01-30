import React, { useState, useEffect } from 'react';
import { FaBarcode, FaBoxOpen, FaHistory, FaTrash, FaEdit, FaBolt, FaTimes, FaSave, FaFileInvoiceDollar, FaInfoCircle, FaRecycle, FaEye, FaMapMarkerAlt } from 'react-icons/fa';

const InventoryPage = () => {
  const [productos, setProductos] = useState([]); 
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  // Estados Modales
  const [editingProduct, setEditingProduct] = useState(null); 
  const [replenishProduct, setReplenishProduct] = useState(null); 

  // --- 1. CARGA DE DATOS ---
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
      console.error(error);
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventario();
  }, []);

  // --- 2. SEMÁFORO ---
  const getStockStatus = (prod) => {
    if (prod.estado === 'INACTIVO') return { color: '#999', bg: '#f0f0f0', label: 'DESCONTINUADO' };
    
    const numActual = parseInt(prod.stock_actual || 0);
    const numMin = parseInt(prod.stock_minimo || 5);
    
    if (numActual === 0) return { color: '#666', bg: '#e2e3e5', label: 'AGOTADO' };
    if (numActual <= numMin) return { color: '#c5221f', bg: '#fce8e6', label: 'CRÍTICO' };
    if (numActual <= numMin + 3) return { color: '#b06000', bg: '#fef7e0', label: 'BAJO' };
    return { color: '#137333', bg: '#e6f4ea', label: 'OK' };
  };

  // --- 3. ACCIONES (Eliminar / Restaurar / Guardar) ---
  const handleDelete = async (prod) => {
    if (prod.stock_actual > 0) {
      alert("⛔ No se puede descontinuar un producto con stock físico.\nDebe realizar una salida primero.");
      return;
    }
    if(!window.confirm(`¿Desea descontinuar "${prod.nombre_producto}"?\n\nNo se borrará del historial, pero quedará oculto.`)) return;
    
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`http://localhost:3001/api/inventario/${prod.id_producto}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(response.ok) { fetchInventario(); }
    } catch (e) { alert("Error de conexión"); }
  };

  const handleRestore = async (prod) => {
    if(!window.confirm(`¿Desea volver a activar "${prod.nombre_producto}"?`)) return;
    const token = localStorage.getItem('token');
    const productoReactivado = { ...prod, estado: 'ACTIVO' };
    try {
        const response = await fetch(`http://localhost:3001/api/inventario/${prod.id_producto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(productoReactivado)
        });
        if(response.ok) { alert("✅ Producto reactivado"); fetchInventario(); }
    } catch (e) { alert("Error al reactivar"); }
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

  // --- 4. FILTRADO ---
  const productosFiltrados = productos.filter(prod => {
    if (!mostrarInactivos && prod.estado === 'INACTIVO') return false;
    const termino = busqueda ? busqueda.toString().trim().toLowerCase() : '';
    if (!termino) return true;
    const textoGlobal = `${prod.nombre_producto} ${prod.codigo_barras} ${prod.marca} ${prod.modelo} ${prod.ubicacion_bodega}`.toLowerCase();
    return textoGlobal.includes(termino);
  });

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      
      {/* CABECERA */}
      <div style={{ borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', marginBottom: '20px' }}>
        <h2 style={{ color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaBoxOpen /> Inventario General
        </h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Gestión de activos, control de ubicaciones y reposición.</p>
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <FaBarcode style={{ position: 'absolute', left: '15px', top: '15px', color: '#666' }} />
          <input 
            type="text" 
            placeholder="Buscar por código, nombre, ubicación..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '6px', border: '2px solid #1a73e8', fontSize: '1rem', outline: 'none' }}
            autoFocus 
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', background: mostrarInactivos ? '#e8f0fe' : 'transparent', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
            <input type="checkbox" checked={mostrarInactivos} onChange={(e) => setMostrarInactivos(e.target.checked)} style={{width: '18px', height: '18px'}} />
            <span style={{color: '#555', fontWeight: '500'}}><FaEye /> Ver Descontinuados</span>
        </label>
        <div style={{ background: '#343a40', padding: '10px 20px', borderRadius: '6px', color: 'white', fontWeight: 'bold' }}>{productosFiltrados.length} Items</div>
      </div>

      {/* TABLA CORREGIDA (CON UBICACIÓN) */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
          <thead>
            <tr style={{ background: '#343a40', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '15px' }}>Código</th>
              <th style={{ padding: '15px' }}>Producto</th>
              <th style={{ padding: '15px' }}>Detalles</th>
              <th style={{ padding: '15px' }}>Ubicación (Bodega)</th> {/* COLUMNA RECUPERADA */}
              <th style={{ padding: '15px', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '15px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? ( <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Cargando...</td></tr> ) : 
             productosFiltrados.length > 0 ? (
              productosFiltrados.map((prod) => {
                const status = getStockStatus(prod);
                const esInactivo = prod.estado === 'INACTIVO';

                return (
                  <tr key={prod.id_producto} style={{ borderBottom: '1px solid #eee', fontSize: '0.95rem', background: esInactivo ? '#f9f9f9' : 'white', opacity: esInactivo ? 0.7 : 1 }}>
                    <td style={{ padding: '15px', fontFamily: 'monospace', color: '#555' }}><FaBarcode /> {prod.codigo_barras}</td>
                    
                    <td style={{ padding: '15px' }}>
                        <div style={{fontWeight: 'bold', fontSize: '1rem', textDecoration: esInactivo ? 'line-through' : 'none'}}>
                            {prod.nombre_producto}
                        </div>
                        {esInactivo && <small style={{color: '#d93025', fontWeight:'bold'}}>DESCONTINUADO</small>}
                    </td>

                    <td style={{ padding: '15px' }}>
                        <div style={{fontSize: '0.85rem', color: '#444'}}>
                            {prod.marca} - {prod.modelo}<br/>
                            Color: {prod.color}
                        </div>
                    </td>
                    
                    {/* AQUÍ ESTÁ LA UBICACIÓN RECUPERADA */}
                    <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f1f3f4', padding: '5px 10px', borderRadius: '4px', width: 'fit-content', fontWeight: '500', color: '#333' }}>
                            <FaMapMarkerAlt style={{ color: '#ea4335' }} /> 
                            {prod.ubicacion_bodega}
                        </div>
                    </td>

                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <div style={{ background: status.bg, color: status.color, padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {status.label === 'CRÍTICO' && <FaBolt />} {status.label}: {prod.stock_actual}
                      </div>
                    </td>

                    <td style={{ padding: '15px' }}>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                        {!esInactivo && (
                            <>
                                {(status.label === 'AGOTADO' || status.label === 'CRÍTICO' || status.label === 'BAJO') && (
                                    <button onClick={() => setReplenishProduct(prod)} title="Reponer Stock" style={{ background: '#ea4335', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}><FaFileInvoiceDollar /></button>
                                )}
                                <button onClick={() => setEditingProduct(prod)} title="Editar" style={{ background: '#fff', color: '#1a73e8', border: '1px solid #1a73e8', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}><FaEdit /></button>
                                <button onClick={() => handleDelete(prod)} disabled={prod.stock_actual > 0} style={{ background: 'none', border: '1px solid #ccc', color: prod.stock_actual > 0 ? '#ccc' : '#d93025', padding: '8px', borderRadius: '4px', cursor: prod.stock_actual > 0 ? 'not-allowed' : 'pointer' }}><FaTrash /></button>
                            </>
                        )}
                        {esInactivo && (
                            <button onClick={() => handleRestore(prod)} style={{ background: '#137333', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', gap: '5px' }}><FaRecycle /> Reactivar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : ( <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No se encontraron productos.</td></tr> )}
          </tbody>
        </table>
      </div>

      {/* MODAL EDITAR */}
      {editingProduct && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h3><FaEdit /> Corregir Producto</h3>
              <button onClick={() => setEditingProduct(null)} style={closeBtnStyle}><FaTimes /></button>
            </div>
            <div style={{background: '#fff3cd', color: '#856404', padding: '10px', fontSize: '0.85rem', marginBottom: '15px', borderRadius: '4px'}}>
               <FaInfoCircle /> Nota: El Código de Barras no es editable por seguridad.
            </div>
            <form onSubmit={handleUpdateSave}>
                <div style={inputGroupStyle}><label>Nombre:</label><input type="text" value={editingProduct.nombre_producto} onChange={(e) => setEditingProduct({...editingProduct, nombre_producto: e.target.value})} style={inputStyle} required /></div>
                <div style={{display: 'flex', gap: '10px'}}>
                    <div style={inputGroupStyle}><label>Marca:</label><input type="text" value={editingProduct.marca} onChange={(e) => setEditingProduct({...editingProduct, marca: e.target.value})} style={inputStyle} /></div>
                    <div style={inputGroupStyle}><label>Modelo:</label><input type="text" value={editingProduct.modelo} onChange={(e) => setEditingProduct({...editingProduct, modelo: e.target.value})} style={inputStyle} /></div>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                    <div style={inputGroupStyle}><label>Color:</label><input type="text" value={editingProduct.color} onChange={(e) => setEditingProduct({...editingProduct, color: e.target.value})} style={inputStyle} /></div>
                    {/* INPUT DE UBICACIÓN IMPORTANTE PARA TU TESIS */}
                    <div style={inputGroupStyle}><label style={{fontWeight:'bold', color:'#ea4335'}}>Ubicación:</label><input type="text" value={editingProduct.ubicacion_bodega} onChange={(e) => setEditingProduct({...editingProduct, ubicacion_bodega: e.target.value})} style={{...inputStyle, border:'1px solid #ea4335'}} required /></div>
                </div>
                <div style={{background: '#f8f9fa', padding: '10px', borderRadius: '5px', marginTop: '10px'}}>
                    <h4 style={{margin: '0 0 10px 0', fontSize: '0.9rem', color: '#555'}}>Parametrización de Stock</h4>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <div style={inputGroupStyle}><label>Mínimo:</label><input type="number" value={editingProduct.stock_minimo} onChange={(e) => setEditingProduct({...editingProduct, stock_minimo: e.target.value})} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label>Máximo:</label><input type="number" value={editingProduct.stock_maximo} onChange={(e) => setEditingProduct({...editingProduct, stock_maximo: e.target.value})} style={inputStyle} /></div>
                    </div>
                </div>
                <div style={{marginTop: '20px', textAlign: 'right'}}><button type="submit" style={saveBtnStyle}><FaSave /> Guardar Correcciones</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REPOSICIÓN */}
      {replenishProduct && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{...modalHeaderStyle, borderBottom: '2px solid #ea4335'}}>
              <h3 style={{color: '#ea4335'}}><FaFileInvoiceDollar /> Orden de Reposición</h3>
              <button onClick={() => setReplenishProduct(null)} style={closeBtnStyle}><FaTimes /></button>
            </div>
            <div style={{padding: '10px 0'}}>
                <p><strong>Producto:</strong> {replenishProduct.nombre_producto}</p>
                <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '5px', margin: '15px 0'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between'}}><span>Stock Actual:</span> <strong>{replenishProduct.stock_actual}</strong></div>
                   <div style={{display: 'flex', justifyContent: 'space-between'}}><span>Stock Máximo:</span> <strong>{replenishProduct.stock_maximo}</strong></div>
                   <hr style={{border: '0', borderTop: '1px solid #ccc', margin: '10px 0'}}/>
                   <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', color: '#ea4335'}}>
                        <span>A PEDIR:</span>
                        <strong>{Math.max(0, replenishProduct.stock_maximo - replenishProduct.stock_actual)} u.</strong>
                   </div>
                </div>
                <button onClick={() => { alert("Orden Generada"); setReplenishProduct(null); }} style={{...saveBtnStyle, background: '#ea4335', width: '100%'}}>Confirmar Orden</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Estilos
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' };
const inputGroupStyle = { marginBottom: '10px', width: '100%' };
const inputStyle = { width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' };
const saveBtnStyle = { background: '#1a73e8', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' };

export default InventoryPage;