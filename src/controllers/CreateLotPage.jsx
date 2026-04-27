import React, { useState, useEffect } from 'react';
import { FaBoxes, FaPallet, FaSearch, FaBarcode, FaPrint, FaSave, FaListAlt, FaCopy, FaCheck } from 'react-icons/fa';
import jsPDF from 'jspdf';

const CreateLotPage = () => {
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [productoEncontrado, setProductoEncontrado] = useState(null);
  
  const [cantidadTotal, setCantidadTotal] = useState('');
  const [undPorMB, setUndPorMB] = useState('');
  const [undPorPallet, setUndPorPallet] = useState('');
  
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [lotesGenerados, setLotesGenerados] = useState(null);
  
  const [historialLotes, setHistorialLotes] = useState([]);
  const [loteCopiado, setLoteCopiado] = useState('');

  const cargarHistorial = async () => {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('http://localhost:3001/api/inventario/lotes', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            setHistorialLotes(data);
        }
    } catch (error) { console.error("Error al cargar historial", error); }
  };

  useEffect(() => { cargarHistorial(); }, []);

  const handleBuscar = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/inventario', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      const encontrado = data.find(p => p.sku === terminoBusqueda.toUpperCase() || p.codigo_barras === terminoBusqueda);
      if (encontrado) {
          setProductoEncontrado(encontrado);
          setLotesGenerados(null);
          setCantidadTotal(''); setUndPorMB(''); setUndPorPallet('');
      } else { alert("❌ Producto no encontrado."); }
    } catch (error) { console.error(error); }
  };

  const totalMB = (cantidadTotal && undPorMB) ? Math.ceil(cantidadTotal / undPorMB) : 0;
  const totalPallets = (cantidadTotal && undPorPallet) ? Math.ceil(cantidadTotal / undPorPallet) : 0;

  const handleGenerarLote = async () => {
    if (!cantidadTotal || !undPorMB || !undPorPallet) return alert("Complete todas las cantidades.");
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('http://localhost:3001/api/inventario/lotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            id_producto: productoEncontrado.id_producto,
            marca: productoEncontrado.marca,
            cantidad_total: parseInt(cantidadTotal),
            unidades_por_mb: parseInt(undPorMB),
            total_mb: totalMB,
            unidades_por_pallet: parseInt(undPorPallet),
            total_pallets: totalPallets
        })
      });
      const data = await response.json();
      if (response.ok) {
          setMensaje({ texto: `✅ Lote Secuencial ${data.lote_base} creado exitosamente.`, tipo: 'exito' });
          setLotesGenerados(data); 
          cargarHistorial(); 
      } else { alert(data.message); }
    } catch (error) { console.error(error); }
  };

  // FUNCIÓN MAESTRA DE IMPRESIÓN (Sirve para nuevos lotes y para el historial)
  const imprimirEtiquetas = (tipo, loteData = null, productoData = null) => {
    const doc = new jsPDF('l', 'mm', [100, 50]); 
    
    // Si viene del historial usa loteData, si es nuevo usa lotesGenerados
    const cantidad = tipo === 'MB' ? (loteData ? loteData.total_mb : totalMB) : (loteData ? loteData.total_pallets : totalPallets);
    const codigoImprimir = tipo === 'MB' ? (loteData ? loteData.lote_masterbox : lotesGenerados.lote_masterbox) : (loteData ? loteData.lote_pallet : lotesGenerados.lote_pallet);
    const skuImp = productoData ? productoData.sku : productoEncontrado.sku;
    const marcaImp = productoData ? productoData.marca : productoEncontrado.marca;
    
    const nombreTipo = tipo === 'MB' ? 'MASTER BOX' : 'PALLET';

    for (let i = 1; i <= cantidad; i++) {
        if (i > 1) doc.addPage();
        const secuencialCeros = String(i).padStart(7, '0');
        const codigoUnicoFinal = `${codigoImprimir}${secuencialCeros}`;
        
        doc.setFontSize(11);
        doc.setFont('', 'bold');
        doc.text(`SINCOT - ETIQUETA DE ${nombreTipo}`, 50, 7, { align: 'center' });
        doc.setFontSize(6);
        doc.setFont('', 'normal');
        doc.text(`Sistema de Inventario, Control y Trazabilidad Integral`, 50, 11, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`SKU: ${skuImp} | ${marcaImp}`, 50, 16, { align: 'center' });
        
        doc.setLineWidth(0.5);
        for(let b=0; b<40; b+=2) { doc.line(30+b, 19, 30+b, 31); }
        
        doc.setFontSize(15); 
        doc.setFont('', 'bold');
        doc.text(codigoUnicoFinal, 50, 39, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('', 'normal');
        doc.text(`${nombreTipo} ${i} de ${cantidad}`, 50, 45, { align: 'center' });
    }
    doc.save(`Etiquetas_${nombreTipo}_${codigoImprimir}.pdf`);
  };

  const blockInvalidChars = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) { e.preventDefault(); }
  };

  const copiarAlPortapapeles = (texto) => {
      navigator.clipboard.writeText(texto);
      setLoteCopiado(texto);
      setTimeout(() => setLoteCopiado(''), 2000);
  };

  const inputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1.2rem', marginTop: '5px', textAlign: 'center', fontWeight: 'bold' };
  const cardStyle = { background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' };

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: '12px' }}>
      <h2 style={{ color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 10px 0' }}><FaBarcode /> Creación de Lote de Importación</h2>
      <p style={{ color: '#666', marginBottom: '25px' }}>Genere las matrículas y etiquetas de las cajas y pallets antes de ingresar la mercadería a la bodega.</p>

      <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
              <FaSearch style={{ position: 'absolute', left: '15px', top: '15px', color: '#1a73e8' }} />
              <input type="text" value={terminoBusqueda} onChange={e => setTerminoBusqueda(e.target.value)} style={{...inputStyle, paddingLeft: '40px', marginTop: 0, textAlign: 'left', fontWeight:'normal'}} placeholder="Escanee SKU del producto a importar..." />
          </div>
          <button type="submit" style={{background:'#1a73e8', color:'white', border:'none', padding:'0 30px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>BUSCAR</button>
      </form>

      {productoEncontrado && (
        <>
          <div style={{ background: '#e8f0fe', padding: '15px 20px', borderRadius: '8px', border: '2px solid #1a73e8', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{productoEncontrado.nombre_producto}</h3>
                  <span style={{ background: '#1a73e8', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Marca: {productoEncontrado.marca}</span>
              </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Cantidad Total Arribo</h4>
                  <input type="number" min="1" value={cantidadTotal} onKeyDown={blockInvalidChars} onChange={e => setCantidadTotal(e.target.value)} style={inputStyle} placeholder="0" />
              </div>
              
              <div style={{...cardStyle, borderTop: '4px solid #fbbc04'}}>
                  <FaBoxes size="1.5em" color="#fbbc04" />
                  <h4 style={{ margin: '5px 0 10px 0', color: '#333' }}>Agrupación Master Box</h4>
                  <label style={{fontSize:'0.8rem'}}>Unidades por Caja (MB):</label>
                  <input type="number" min="1" value={undPorMB} onKeyDown={blockInvalidChars} onChange={e => setUndPorMB(e.target.value)} style={inputStyle} placeholder="0" />
                  <div style={{ marginTop: '15px', fontSize: '1.2rem', color: '#555' }}>Total Cajas: <strong style={{color:'#000'}}>{totalMB} MB</strong></div>
                  {lotesGenerados && (
                      <button onClick={() => imprimirEtiquetas('MB')} style={{marginTop:'15px', width:'100%', padding:'10px', background:'#fbbc04', color:'#333', border:'none', borderRadius:'4px', fontWeight:'bold', cursor:'pointer'}}><FaPrint/> Imprimir Etiquetas</button>
                  )}
              </div>

              <div style={{...cardStyle, borderTop: '4px solid #34a853'}}>
                  <FaPallet size="1.5em" color="#34a853" />
                  <h4 style={{ margin: '5px 0 10px 0', color: '#333' }}>Agrupación Pallet</h4>
                  <label style={{fontSize:'0.8rem'}}>Unidades por Pallet:</label>
                  <input type="number" min="1" value={undPorPallet} onKeyDown={blockInvalidChars} onChange={e => setUndPorPallet(e.target.value)} style={inputStyle} placeholder="0" />
                  <div style={{ marginTop: '15px', fontSize: '1.2rem', color: '#555' }}>Total Pallets: <strong style={{color:'#000'}}>{totalPallets} PLT</strong></div>
                  {lotesGenerados && (
                      <button onClick={() => imprimirEtiquetas('P')} style={{marginTop:'15px', width:'100%', padding:'10px', background:'#34a853', color:'white', border:'none', borderRadius:'4px', fontWeight:'bold', cursor:'pointer'}}><FaPrint/> Imprimir Etiquetas</button>
                  )}
              </div>
          </div>

          {mensaje.texto && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '6px', fontWeight: 'bold', background: '#e6f4ea', color: '#137333', border: `1px solid #137333` }}>{mensaje.texto}</div>}

          {!lotesGenerados ? (
              <button onClick={handleGenerarLote} style={{ width: '100%', padding: '18px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', display:'flex', justifyContent:'center', alignItems:'center', gap:'10px' }}>
                  <FaSave /> GUARDAR Y GENERAR LOTE SECUENCIAL
              </button>
          ) : (
              <div style={{ background: '#343a40', padding: '20px', borderRadius: '8px', color: 'white', textAlign: 'center', display: 'flex', justifyContent: 'space-around' }}>
                  <div><span style={{fontSize:'0.8rem', color:'#aaa'}}>LOTE BASE (SISTEMA)</span><br/><strong style={{fontSize:'1.8rem'}}>{lotesGenerados.lote_base}</strong></div>
                  <div><span style={{fontSize:'0.8rem', color:'#fbbc04'}}>LOTE MASTER BOX</span><br/><strong style={{fontSize:'1.8rem', color:'#fbbc04'}}>{lotesGenerados.lote_masterbox}</strong></div>
                  <div><span style={{fontSize:'0.8rem', color:'#34a853'}}>LOTE PALLETS</span><br/><strong style={{fontSize:'1.8rem', color:'#34a853'}}>{lotesGenerados.lote_pallet}</strong></div>
              </div>
          )}
        </>
      )}

      {/* SECCIÓN INFERIOR: HISTORIAL DE LOTES Y RE-IMPRESIÓN */}
      <div style={{ marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
          <h3 style={{ color: '#333', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}><FaListAlt color="#1a73e8" /> Historial de Planificaciones</h3>
          
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #ddd' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                  <thead>
                      <tr style={{ background: '#f8f9fa', color: '#555' }}>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Fecha y Hora</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Lote / LPN</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Producto</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Cantidad</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Estado</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd', textAlign: 'center' }}>Acciones</th>
                      </tr>
                  </thead>
                  <tbody>
                      {historialLotes.length === 0 ? (
                          <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No hay lotes registrados aún.</td></tr>
                      ) : (
                          historialLotes.map(lote => (
                              <tr key={lote.id_lote} style={{ borderBottom: '1px solid #eee', background: lote.estado === 'INGRESADO' ? '#fcfcfc' : 'white' }}>
                                  <td style={{ padding: '12px', color: '#666' }}>{new Date(lote.fecha_creacion).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#1a73e8' }}>{lote.lote_base}</td>
                                  <td style={{ padding: '12px' }}>{lote.marca} <span style={{color:'#888', fontSize:'0.8rem'}}>({lote.sku})</span></td>
                                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{lote.cantidad_total}</td>
                                  <td style={{ padding: '12px' }}>
                                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', background: lote.estado === 'CREADO' ? '#fff3e0' : '#e6f4ea', color: lote.estado === 'CREADO' ? '#e65100' : '#137333' }}>
                                          {lote.estado}
                                      </span>
                                  </td>
                                  {/* BOTONES DE REIMPRESIÓN MAGNÍFICOS */}
                                  <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                      <button onClick={() => copiarAlPortapapeles(lote.lote_pallet)} style={{ background: loteCopiado === lote.lote_pallet ? '#34a853' : '#f1f3f4', color: loteCopiado === lote.lote_pallet ? 'white' : '#444', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '5px' }} title="Copiar LPN Pallet">
                                          {loteCopiado === lote.lote_pallet ? <FaCheck /> : <FaCopy />} Copiar
                                      </button>
                                      
                                      <button onClick={() => imprimirEtiquetas('MB', lote, {sku: lote.sku, marca: lote.marca})} style={{ background: '#fbbc04', color: '#333', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }} title="Re-imprimir Cajas">
                                          <FaPrint/> MB
                                      </button>

                                      <button onClick={() => imprimirEtiquetas('P', lote, {sku: lote.sku, marca: lote.marca})} style={{ background: '#34a853', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }} title="Re-imprimir Pallets">
                                          <FaPrint/> Pallets
                                      </button>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};

export default CreateLotPage;