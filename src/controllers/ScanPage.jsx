import React, { useState, useEffect } from 'react';
import { FaBarcode, FaWarehouse, FaMicrochip, FaBoxOpen, FaPallet, FaCheckCircle, FaSpinner, FaTimesCircle, FaSave, FaExclamationTriangle, FaMapMarkerAlt, FaBars, FaLayerGroup, FaSearch, FaBox } from 'react-icons/fa';
import '../css/ScanPage.css';

const ScanPage = () => {
  const [bodegas, setBodegas] = useState([]);
  const [ubicacionesLibres, setUbicacionesLibres] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // ESTADOS DE TRAZABILIDAD (Igual al Ingreso)
  const [bodegaOrigen, setBodegaOrigen] = useState('B00'); 
  const [bodegaDestino, setBodegaDestino] = useState('');
  const [estrategia, setEstrategia] = useState('RACK'); // RACK o PISO
  const [ubicacionDestino, setUbicacionDestino] = useState('');
  
  const [productoSelect, setProductoSelect] = useState('');
  const [cantidadTotal, setCantidadTotal] = useState(0);

  const [escaneo, setEscaneo] = useState('');
  const [arbolEscaneo, setArbolEscaneo] = useState({}); 
  const [activePallet, setActivePallet] = useState(null);
  const [activeMB, setActiveMB] = useState(null);
  const [totalSeriales, setTotalSeriales] = useState(0);

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const cargarDatos = async () => {
    const token = localStorage.getItem('token');
    try {
      const [resMaestros, resLotes] = await Promise.all([
          fetch('http://localhost:3001/api/inventario/maestros', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:3001/api/inventario/lotes', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (resMaestros.ok) {
          const dataM = await resMaestros.json();
          if (dataM.bodegas) setBodegas(dataM.bodegas);
          // Cargamos ubicaciones libres igual que en el Ingreso
          if (dataM.ubicaciones) {
              setUbicacionesLibres(dataM.ubicaciones.filter(u => u.estado === 'LIBRE'));
          }
      }

      if (resLotes.ok) {
          const dataL = await resLotes.json();
          const lotesValidos = Array.isArray(dataL) ? dataL.filter(l => l.estado === 'INGRESADO') : [];
          const productosUnicos = [];
          const idsVistos = new Set();
          lotesValidos.forEach(lote => {
              if (!idsVistos.has(lote.id_producto)) {
                  idsVistos.add(lote.id_producto);
                  productosUnicos.push({ ...lote, stock_actual: lote.cantidad_total });
              }
          });
          setProductos(productosUnicos);
      }
    } catch (error) { console.error("Error cargando maestros:", error); }
    finally { setLoadingInitial(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleProductoChange = (e) => {
      const idProd = e.target.value;
      setProductoSelect(idProd);
      const prod = productos.find(p => p.id_producto.toString() === idProd);
      setCantidadTotal(prod ? prod.stock_actual : 0);
  };

  const handleScan = (e) => {
      e.preventDefault();
      const val = escaneo.trim().toUpperCase();
      if (!val) return;
      
      if (!productoSelect || !bodegaDestino || !ubicacionDestino) {
          return alert("⚠️ Trazabilidad Incompleta: Seleccione Producto, Bodega Destino y Ubicación antes de escanear.");
      }

      const nuevoArbol = { ...arbolEscaneo };

      if (val.startsWith('PLT-')) {
          if (!nuevoArbol[val]) nuevoArbol[val] = {};
          setActivePallet(val); setActiveMB(null);
          setMensaje({ texto: `Pallet ${val} activado.`, tipo: 'info' });
      } 
      else if (val.startsWith('MB-')) {
          if (!activePallet) return alert("❌ Escanee un PALLET primero.");
          if (!nuevoArbol[activePallet][val]) nuevoArbol[activePallet][val] = [];
          setActiveMB(val);
          setMensaje({ texto: `Caja ${val} abierta.`, tipo: 'info' });
      } 
      else {
          if (!activePallet || !activeMB) return alert("❌ Debe tener Pallet y Caja activos.");
          let isDuplicado = false;
          Object.values(nuevoArbol).forEach(p => Object.values(p).forEach(c => { if (c.includes(val)) isDuplicado = true; }));
          if (isDuplicado) {
              setMensaje({ texto: `El serial ${val} ya fue escaneado.`, tipo: 'error' });
          } else {
              nuevoArbol[activePallet][activeMB].push(val);
              setTotalSeriales(prev => prev + 1);
              setMensaje({ texto: `Serial ${val} guardado.`, tipo: 'exito' });
          }
      }
      setArbolEscaneo(nuevoArbol);
      setEscaneo(''); 
  };

  const handleGuardarSerializacion = async () => {
      if (totalSeriales === 0) return;
      
      // Validación de ubicación (Igual al Ingreso)
      const ubicacionValida = ubicacionesLibres.find(u => u.id_ubicacion === ubicacionDestino && u.tipo === estrategia);
      if (!ubicacionValida) return alert("❌ La ubicación no es válida o no pertenece a la estrategia seleccionada.");

      const confirmacion = window.confirm(`Se moverán ${totalSeriales} equipos a [${bodegaDestino}] ubicación [${ubicacionDestino}]. ¿Confirmar?`);
      if (!confirmacion) return;

      console.log("Payload:", { bodegaOrigen, bodegaDestino, ubicacionDestino, totalSeriales, arbolEscaneo });
      alert("✅ ¡Producción registrada y Transferencia completada!");
      
      setArbolEscaneo({}); setActivePallet(null); setActiveMB(null); setTotalSeriales(0); setProductoSelect(''); setUbicacionDestino('');
      await cargarDatos(); // Recargar ubicaciones
  };

  if (loadingInitial) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#1a73e8" /><p>Cargando WMS...</p></div>;

  return (
    <div className="scan-container">
      <div className="scan-card-main">
        
        <h2 className="scan-header-title">
          <div style={{ background: '#e8f0fe', padding: '10px', borderRadius: '10px', color: '#1a73e8' }}><FaBarcode /></div>
          Producción: Serializado y Transferencia
        </h2>

        {/* --- GRID DE TRAZABILIDAD (ESTILO INGRESO) --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '30px' }}>
            
            {/* IZQUIERDA: BODEGAS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="scan-box-disabled">
                    <label className="scan-label"><FaWarehouse/> Bodega Origen</label>
                    <select value={bodegaOrigen} disabled className="scan-input" style={{background: 'white'}}><option>B00 - Materia prima</option></select>
                </div>
                <div className="scan-box-disabled" style={{borderColor: '#1a73e8', background: '#f8f9fa'}}>
                    <label className="scan-label" style={{color: '#1a73e8'}}><FaWarehouse/> Bodega Destino *</label>
                    <select value={bodegaDestino} onChange={e => setBodegaDestino(e.target.value)} className="scan-input" style={{background: 'white'}}>
                        <option value="">-- Seleccione Destino --</option>
                        {bodegas.filter(b => b.id !== 'B00').map(b => <option key={b.id} value={b.id}>{b.id} - {b.descripcion}</option>)}
                    </select>
                </div>
            </div>

            {/* DERECHA: UBICACIONES (Sincronizado con Ingreso) */}
            <div className="scan-box-white">
                <div style={{ padding: '15px 20px', borderBottom: '2px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: '10px', background: '#202124', color: 'white' }}>
                    <FaMapMarkerAlt color="#fbbc04" /> <span style={{ fontWeight: 'bold' }}>Ubicaciones de Destino</span>
                </div>
                
                <div style={{ padding: '20px' }}>
                    <div className="btn-toggle-group">
                        <button onClick={() => {setEstrategia('RACK'); setUbicacionDestino('');}} className={`btn-toggle ${estrategia === 'RACK' ? 'active' : 'inactive'}`}>
                            <FaBars /> POSICIÓN FIJA
                        </button>
                        <button onClick={() => {setEstrategia('PISO'); setUbicacionDestino('');}} className={`btn-toggle ${estrategia === 'PISO' ? 'active' : 'inactive'}`}>
                            <FaLayerGroup /> POSICIÓN MÓVIL
                        </button>
                    </div>

                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                        <label className="scan-label" style={{justifyContent: 'center', marginBottom: '10px'}}>Asignar Ubicación Física (Disponibles)</label>
                        <input 
                            list="listaUbiScan"
                            value={ubicacionDestino} 
                            onChange={e => setUbicacionDestino(e.target.value.toUpperCase())} 
                            className="scan-input scan-input-yellow"
                            placeholder={estrategia === 'RACK' ? "Ej: A01A01" : "Ej: PA0001"}
                            disabled={!bodegaDestino}
                        />
                        <datalist id="listaUbiScan">
                            {ubicacionesLibres.filter(u => u.tipo === estrategia).map(u => (
                                <option key={u.id_ubicacion} value={u.id_ubicacion} />
                            ))}
                        </datalist>
                    </div>
                </div>
            </div>
        </div>

        {/* --- PRODUCTO Y ESCÁNER --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="scan-box-disabled" style={{background: 'white'}}>
                <label className="scan-label"><FaMicrochip/> Producto a Serializar *</label>
                <select value={productoSelect} onChange={handleProductoChange} className="scan-input">
                    <option value="">-- Seleccione un Producto --</option>
                    {productos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.sku} | {p.nombre_producto}</option>)}
                </select>
            </div>
            <div className="scan-box-disabled" style={{textAlign: 'center', background: '#fff9c4', border: '2px solid #fbbc04'}}>
                <label className="scan-label" style={{justifyContent: 'center'}}>Stock MP</label>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{cantidadTotal}</div>
            </div>
        </div>

        <div className="scan-reader-zone">
            <label className="scan-label" style={{color: '#1a73e8', marginBottom: '8px'}}>Escáner de Matrícula o Serial</label>
            <form onSubmit={handleScan} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <FaSearch style={{ position: 'absolute', left: '16px', top: '16px', color: '#8ab4f8' }} />
                    <input type="text" value={escaneo} onChange={e => setEscaneo(e.target.value)} className="scan-reader-input" placeholder="Escanee LPN o SN..." autoFocus />
                </div>
                <button type="submit" style={{background:'#1a73e8', color:'white', border:'none', padding:'0 30px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <FaBarcode /> ESCANEO
                </button>
            </form>
        </div>

        {/* ÁRBOL DE SERIALIZACIÓN (EL CONTENEDOR QUE YA TENÍAS) */}
        <div className="tree-container" style={{ border: '2px solid #e0e0e0', borderRadius: '12px', minHeight: '200px', background: '#fafafa' }}>
            <div style={{ background: '#f1f3f4', padding: '15px', borderRadius: '10px 10px 0 0', borderBottom: '2px solid #e0e0e0', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color: '#5f6368' }}>ÁRBOL DE CARGA</span>
                <span style={{ background: '#1a73e8', color: 'white', padding: '2px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>Equipos: {totalSeriales}</span>
            </div>
            <div style={{ padding: '20px' }}>
                {Object.keys(arbolEscaneo).length === 0 ? <p style={{textAlign:'center', color:'#999'}}>Árbol vacío...</p> : 
                    Object.entries(arbolEscaneo).map(([plt, mbs]) => (
                        <div key={plt} style={{marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white'}}>
                            <div style={{padding: '8px 15px', background: '#f8f9fa', fontWeight: 'bold'}}><FaPallet/> {plt}</div>
                            <div style={{padding: '10px'}}>
                                {Object.entries(mbs).map(([mb, sn]) => (
                                    <div key={mb} style={{marginLeft: '20px', color: '#b06000'}}><FaBoxOpen/> {mb} ({sn.length} seriales)</div>
                                ))}
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>

        <div style={{ marginTop: '25px', textAlign: 'right' }}>
            <button onClick={handleGuardarSerializacion} disabled={totalSeriales === 0} style={{ background: totalSeriales > 0 ? '#34a853' : '#dadce0', color: 'white', border: 'none', padding: '16px 50px', borderRadius: '8px', fontWeight:'bold', fontSize: '1.1rem', cursor: totalSeriales > 0 ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:'10px', marginLeft: 'auto' }}>
                <FaCheckCircle /> CONFIRMAR Y TRANSFERIR
            </button>
        </div>

      </div>
    </div>
  );
};

export default ScanPage;