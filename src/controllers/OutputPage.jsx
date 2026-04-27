import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaPlus, FaTrash, FaMapMarkerAlt, FaWarehouse, FaSearch, FaCar, FaFilePdf, FaBox, FaClock, FaCalendarDay } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const OutputPage = () => {
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [productoEncontrado, setProductoEncontrado] = useState(null);
  const [cantidadTemp, setCantidadTemp] = useState('');
  const [precioTemp, setPrecioTemp] = useState('');

  const [cabecera, setCabecera] = useState(() => {
    const saved = localStorage.getItem('temp_salida_cabecera');
    return saved ? JSON.parse(saved) : { punto_destino: '', motivo: 'ABASTECIMIENTO', placa_vehiculo: '', observaciones: '' };
  });

  const [listaSalida, setListaSalida] = useState(() => {
    const saved = localStorage.getItem('temp_salida_lista');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('temp_salida_cabecera', JSON.stringify(cabecera));
    localStorage.setItem('temp_salida_lista', JSON.stringify(listaSalida));
  }, [cabecera, listaSalida]);

  const generarPDFSalida = (infoCabecera, items) => {
    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleString('es-EC');

    doc.setFontSize(22);
    doc.setTextColor(217, 48, 37);
    doc.text("MUNDOTEC S.A. - DESPACHO", 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text("ORDEN DE SALIDA DE MERCADERÍA", 105, 22, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Control Interno de Activos | Norma ISO 9001:2015", 105, 28, { align: 'center' });
    doc.line(20, 32, 190, 32);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Punto de Destino: ${infoCabecera.punto_destino}`, 20, 40);
    doc.text(`Motivo de Salida: ${infoCabecera.motivo}`, 20, 46);
    doc.text(`Vehículo Asignado: ${infoCabecera.placa_vehiculo || 'N/A'}`, 20, 52);
    doc.text(`Fecha y Hora de Salida: ${fechaActual}`, 120, 40);

    const columns = ["SKU", "Descripción Producto", "Cant.", "Precio Salida", "Subtotal"];
    const rows = items.map(item => [
      item.sku, 
      `${item.nombre}\n(${item.marca} - ${item.modelo})`, 
      `${item.cantidad} u.`, 
      `$${item.precio.toFixed(2)}`, 
      `$${(item.cantidad * item.precio).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 60,
      head: [columns],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [217, 48, 37] },
      styles: { fontSize: 8 }
    });

    const totalCosto = items.reduce((acc, i) => acc + (i.cantidad * i.precio), 0);
    const totalUnidades = items.reduce((acc, i) => acc + i.cantidad, 0);
    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFont('', 'bold');
    doc.text(`TOTAL PRODUCTOS: ${items.length}`, 20, finalY);
    doc.text(`TOTAL UNIDADES: ${totalUnidades}`, 80, finalY);
    doc.text(`VALOR TOTAL DESPACHO: $${totalCosto.toFixed(2)}`, 190, finalY, { align: 'right' });

    doc.setFont('', 'normal');
    doc.text("Observaciones de Despacho:", 20, finalY + 15);
    doc.text(infoCabecera.observaciones || "Sin observaciones.", 20, finalY + 22, { maxWidth: 170 });

    doc.text("__________________________", 40, finalY + 55);
    doc.text("Bodeguero Responsable", 40, finalY + 60);
    doc.text("__________________________", 130, finalY + 55);
    doc.text("Recibido Conforme", 130, finalY + 60);

    doc.save(`Despacho_${infoCabecera.punto_destino.replace(/ /g, '_')}.pdf`);
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!terminoBusqueda.trim()) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:3001/api/inventario', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      const encontrado = data.find(p => (p.sku && p.sku.toLowerCase() === terminoBusqueda.toLowerCase().trim()) || (p.nombre_producto && p.nombre_producto.toLowerCase().includes(terminoBusqueda.toLowerCase().trim())));
      if (encontrado) {
        if(encontrado.stock_actual <= 0) return alert("⚠️ Producto sin stock.");
        setProductoEncontrado(encontrado); setPrecioTemp(encontrado.precio || '');
      } else { alert("❌ No encontrado."); }
    } catch (e) { alert("Error"); }
  };

  const agregarALista = () => {
    if (parseInt(cantidadTemp) > productoEncontrado.stock_actual) return alert("Stock insuficiente.");
    setListaSalida([...listaSalida, { id_producto: productoEncontrado.id_producto, nombre: productoEncontrado.nombre_producto, marca: productoEncontrado.marca, modelo: productoEncontrado.modelo, sku: productoEncontrado.sku, cantidad: parseInt(cantidadTemp), precio: parseFloat(precioTemp || 0) }]);
    setProductoEncontrado(null); setTerminoBusqueda(''); setCantidadTemp('');
  };

  const handleGuardarTodo = async () => {
    if (!cabecera.punto_destino || listaSalida.length === 0) return alert("Faltan datos obligatorios.");
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:3001/api/inventario/salida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cabecera, items: listaSalida })
      });
      if (response.ok) {
        alert("✅ DESPACHO MASIVO COMPLETADO.");
        generarPDFSalida(cabecera, listaSalida);
        setListaSalida([]);
        setCabecera({ punto_destino: '', motivo: 'ABASTECIMIENTO', placa_vehiculo: '', observaciones: '' });
        localStorage.clear();
      }
    } catch (error) { alert("Error"); }
  };

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'2px solid #f0f2f5', marginBottom:'20px', paddingBottom:'15px'}}>
        <div>
            <h2 style={{ color: '#d93025', display: 'flex', alignItems: 'center', gap: '10px', margin:0 }}><FaSignOutAlt /> Despacho de Mercadería (Salida por Lote)</h2>
            <p style={{margin:0, color:'#666', fontSize:'0.85rem'}}><FaCalendarDay/> Hoy: {new Date().toLocaleDateString()} | <FaClock/> Hora: {new Date().toLocaleTimeString()}</p>
        </div>
        <div style={{background:'#d93025', color:'white', padding:'10px 20px', borderRadius:'8px', fontWeight:'bold'}}>
            {listaSalida.length} Productos por Despachar
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <div><label style={labelStyle}><FaMapMarkerAlt/> Punto de Destino *</label><input type="text" value={cabecera.punto_destino} onChange={e => setCabecera({...cabecera, punto_destino: e.target.value})} style={inputStyle} placeholder="Ej: Tienda Norte / Sucursal Guayaquil" /></div>
          <div><label style={labelStyle}><FaWarehouse/> Motivo</label><select value={cabecera.motivo} onChange={e => setCabecera({...cabecera, motivo: e.target.value})} style={inputStyle}><option value="ABASTECIMIENTO">ABASTECIMIENTO</option><option value="DEVOLUCION">DEVOLUCIÓN</option><option value="BAJA">BAJA (DAÑO/OBSOLETO)</option></select></div>
          <div><label style={labelStyle}><FaCar/> Placa del Vehículo</label><input type="text" value={cabecera.placa_vehiculo} onChange={e => setCabecera({...cabecera, placa_vehiculo: e.target.value})} style={inputStyle} placeholder="Ej: GBA-1234" /></div>
      </div>

      <div style={{ background: '#fce8e6', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '10px' }}>
            <input type="text" value={terminoBusqueda} onChange={e => setTerminoBusqueda(e.target.value)} style={{flex: 1, padding: '12px', border: '1px solid #d93025', borderRadius: '6px'}} placeholder="Busque por SKU o Nombre para despachar..." />
            <button type="submit" style={{background:'#d93025', color:'white', border:'none', padding:'0 20px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>BUSCAR</button>
        </form>
        {productoEncontrado && (
            <div style={{ marginTop: '15px', background: 'white', padding: '15px', borderRadius: '8px', display: 'flex', gap: '15px', alignItems: 'flex-end', border: '2px solid #d93025' }}>
                <div style={{flex: 2}}>
                    <strong>{productoEncontrado.nombre_producto}</strong> <br/>
                    <small style={{color:'#d93025', fontWeight:'bold'}}><FaBox /> Stock Disponible: {productoEncontrado.stock_actual} u.</small>
                </div>
                <div style={{flex: 1}}><label style={{fontSize:'0.8rem'}}>Cantidad:</label><input type="number" value={cantidadTemp} onChange={e => setCantidadTemp(e.target.value)} style={inputStyle} placeholder="0" /></div>
                <div style={{flex: 1}}><label style={{fontSize:'0.8rem'}}>Precio Salida ($):</label><input type="number" step="0.01" value={precioTemp} onChange={e => setPrecioTemp(e.target.value)} style={inputStyle} placeholder="0.00" /></div>
                <button onClick={agregarALista} style={{background: '#d93025', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor:'pointer', fontWeight:'bold'}}><FaPlus /> AÑADIR</button>
            </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                  <tr style={{ background: '#343a40', color: 'white', textAlign: 'left' }}>
                      <th style={tdStyle}>SKU</th><th style={tdStyle}>Producto</th><th style={tdStyle}>Cant.</th><th style={tdStyle}>Precio</th><th style={tdStyle}>Subtotal</th><th style={tdStyle}></th>
                  </tr>
              </thead>
              <tbody>
                  {listaSalida.length === 0 ? (
                      <tr><td colSpan="6" style={{textAlign:'center', padding:'20px', color:'#999'}}>No hay productos seleccionados para el despacho.</td></tr>
                  ) : (
                    listaSalida.map(item => (
                      <tr key={item.id_producto} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={tdStyle}>{item.sku}</td><td style={tdStyle}>{item.nombre}</td><td style={tdStyle}>{item.cantidad}</td><td style={tdStyle}>${item.precio.toFixed(2)}</td><td style={tdStyle}>${(item.cantidad * item.precio).toFixed(2)}</td>
                          <td style={tdStyle}><button onClick={() => setListaSalida(listaSalida.filter(i => i.id_producto !== item.id_producto))} style={{ color: '#d93025', border: 'none', background: 'none', cursor:'pointer' }}><FaTrash /></button></td>
                      </tr>
                    ))
                  )}
              </tbody>
          </table>
      </div>

      <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Observaciones del Despacho</label>
          <textarea rows="2" value={cabecera.observaciones} onChange={e => setCabecera({...cabecera, observaciones: e.target.value})} style={{...inputStyle, height:'auto'}} placeholder="Ej: Mercadería asegurada con precinto, revisión de calidad aprobada..." />
      </div>

      <button onClick={handleGuardarTodo} disabled={listaSalida.length === 0} style={{ width: '100%', padding: '18px', background: listaSalida.length === 0 ? '#ccc' : '#d93025', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.2rem', display:'flex', justifyContent:'center', alignItems:'center', gap:'10px', cursor:'pointer' }}>
          <FaFilePdf /> PROCESAR DESPACHO Y GENERAR REPORTE
      </button>
    </div>
  );
};

const inputStyle = { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', marginTop: '5px' };
const labelStyle = { fontWeight: 'bold', fontSize: '0.9rem', color: '#444' };
const tdStyle = { padding: '12px' };

export default OutputPage;