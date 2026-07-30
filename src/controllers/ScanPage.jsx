import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api.js';
import { FaBarcode, FaWarehouse, FaMicrochip, FaBoxOpen, FaPallet, FaCheckCircle, FaSpinner, FaMapMarkerAlt, FaBars, FaLayerGroup, FaSearch, FaExclamationTriangle, FaBoxes } from 'react-icons/fa';
import '../css/ScanPage.css';

const ScanPage = () => {
  const [bodegas, setBodegas] = useState([]);
  const [ubicacionesLibres, setUbicacionesLibres] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [bodegaOrigen, setBodegaOrigen] = useState('B00'); 
  const [bodegaDestino, setBodegaDestino] = useState('');
  const [estrategia, setEstrategia] = useState('RACK');
  const [ubicacionDestino, setUbicacionDestino] = useState('');
  const [ubicacionesPorPallet, setUbicacionesPorPallet] = useState({});
  
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
      const [resMaestros, resLotes, resInventario] = await Promise.all([
          fetch(`${API_BASE}/inventario/maestros`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/inventario/lotes`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/inventario`, { headers: { 'Authorization': `Bearer ${token}` } }) // 🚀 Llamamos al catálogo real
      ]);
      
      if (resMaestros.ok) {
          const dataM = await resMaestros.json();
          if (dataM.bodegas) setBodegas(dataM.bodegas);
          if (dataM.ubicaciones) setUbicacionesLibres(dataM.ubicaciones.filter(u => u.estado === 'LIBRE'));
      }

      if (resLotes.ok && resInventario.ok) {
          const dataL = await resLotes.json();
          const dataInv = await resInventario.json();
          const lotesValidos = Array.isArray(dataL) ? dataL.filter(l => l.estado === 'INGRESADO') : [];
          
          const productosUnicos = [];
          const idsVistos = new Set();
          
          lotesValidos.forEach(lote => {
              if (!idsVistos.has(lote.id_producto)) {
                  idsVistos.add(lote.id_producto);
                  // 🚀 FILTRO INTELIGENTE: Verificamos en el catálogo si ya se movió a Producto Terminado
                  const prodReal = dataInv.find(p => p.id_producto === lote.id_producto);
                  const estaEnB01 = prodReal && prodReal.ubicacion_bodega && prodReal.ubicacion_bodega.startsWith('B01');
                  
                  if (!estaEnB01) { // Solo lo mostramos si NO está serializado en B01
                      productosUnicos.push({ ...lote, stock_actual: lote.cantidad_total });
                  }
              }
          });
          setProductos(productosUnicos);
      }
    } catch (error) { console.error("Error cargando maestros:", error); }
    finally { setLoadingInitial(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const productoSeleccionado = productos.find(p => p.id_producto.toString() === productoSelect.toString());

  const planSerializacion = productoSeleccionado ? {
      cantidadTotal: Number(productoSeleccionado.cantidad_total || productoSeleccionado.stock_actual || 0),
      totalPallets: Number(productoSeleccionado.total_pallets || 0),
      totalMasterBox: Number(productoSeleccionado.total_mb || 0),
      unidadesPorMasterBox: Number(productoSeleccionado.unidades_por_mb || 0),
      unidadesPorPallet: Number(productoSeleccionado.unidades_por_pallet || 0),
      lotePallet: productoSeleccionado.lote_pallet || '',
      loteMasterBox: productoSeleccionado.lote_masterbox || ''
  } : null;

  const totalPalletsEscaneados = Object.keys(arbolEscaneo).length;
  const totalMasterBoxEscaneadas = Object.values(arbolEscaneo).reduce((sum, pallet) => sum + Object.keys(pallet).length, 0);
  const masterBoxPorPalletEsperadas = planSerializacion?.totalPallets > 0
      ? Math.ceil((planSerializacion.totalMasterBox || 0) / planSerializacion.totalPallets)
      : 0;
  const serialesPlano = Object.entries(arbolEscaneo).flatMap(([pallet, masterBoxes]) =>
      Object.entries(masterBoxes).flatMap(([masterBox, seriales]) =>
          seriales.map((serial, index) => ({ pallet, masterBox, serial, index: index + 1 }))
      )
  );
  const normalizarUbicacion = (valor = '') => valor.toString().trim().toUpperCase();
  const getSerialesPorPallet = (pallet, arbol = arbolEscaneo) =>
      Object.values(arbol[pallet] || {}).reduce((sum, seriales) => sum + seriales.length, 0);
  const getUbicacionValida = (codigoUbicacion) => {
      const ubicacionBuscada = normalizarUbicacion(codigoUbicacion);
      return ubicacionesLibres.find(u =>
          normalizarUbicacion(u.id_ubicacion).split('-')[1] === ubicacionBuscada &&
          u.tipo === estrategia &&
          u.id_bodega === bodegaDestino
      );
  };
  const getUbicacionesDisponiblesParaPallet = () => {
      const ubicacionesAsignadas = new Set(Object.values(ubicacionesPorPallet).map(u => normalizarUbicacion(u.id_ubicacion)));
      return ubicacionesLibres.filter(u => (
          u.tipo === estrategia &&
          (!u.id_bodega || u.id_bodega === bodegaDestino) &&
          !ubicacionesAsignadas.has(normalizarUbicacion(u.id_ubicacion))
      ));
  };
  const progresoSeriales = planSerializacion?.cantidadTotal > 0
      ? Math.min(100, Math.round((totalSeriales / planSerializacion.cantidadTotal) * 100))
      : 0;

  const handleProductoChange = (e) => {
      const idProd = e.target.value;
      setProductoSelect(idProd);
      const prod = productos.find(p => p.id_producto.toString() === idProd);
      setCantidadTotal(prod ? prod.stock_actual : 0);
      setArbolEscaneo({});
      setUbicacionesPorPallet({});
      setActivePallet(null);
      setActiveMB(null);
      setTotalSeriales(0);
      setUbicacionDestino('');
      setMensaje({ texto: '', tipo: '' });
  };

  const handleBodegaDestinoChange = (valor) => {
      setBodegaDestino(valor);
      setUbicacionDestino('');
      setUbicacionesPorPallet({});
      setArbolEscaneo({});
      setActivePallet(null);
      setActiveMB(null);
      setTotalSeriales(0);
      setMensaje({ texto: '', tipo: '' });
  };

  const cerrarPalletActual = () => {
      if (!activePallet) return;
      const serialesPallet = getSerialesPorPallet(activePallet);

      if (serialesPallet === 0) {
          return setMensaje({ texto: 'El pallet activo no tiene seriales escaneados.', tipo: 'error' });
      }

      setActivePallet(null);
      setActiveMB(null);
      setUbicacionDestino('');
      setMensaje({ texto: `Pallet cerrado con ${serialesPallet} unidades. Seleccione otra ubicación y escanee el siguiente pallet.`, tipo: 'exito' });
  };

  const handleScan = (e) => {
      e.preventDefault();
      const val = escaneo.trim().toUpperCase();
      if (!val) return;
      if (!productoSelect || !bodegaDestino) return alert("⚠️ Seleccione Producto y Bodega Destino antes de escanear.");

      const nuevoArbol = { ...arbolEscaneo };

      if (val.startsWith('PLT-')) {
          const esPalletNuevo = !nuevoArbol[val];

          if (planSerializacion?.lotePallet && !val.startsWith(planSerializacion.lotePallet)) {
              setEscaneo('');
              return setMensaje({ texto: `El pallet ${val} no pertenece al lote esperado (${planSerializacion.lotePallet}).`, tipo: 'error' });
          }
          if (esPalletNuevo && planSerializacion?.totalPallets && totalPalletsEscaneados >= planSerializacion.totalPallets) {
              setEscaneo('');
              return setMensaje({ texto: `Ya se escanearon los ${planSerializacion.totalPallets} pallets esperados.`, tipo: 'error' });
          }
          if (esPalletNuevo) {
              if (!ubicacionDestino) {
                  setEscaneo('');
                  return setMensaje({ texto: 'Seleccione una ubicación disponible antes de escanear este pallet.', tipo: 'error' });
              }

              const ubicacionValida = getUbicacionValida(ubicacionDestino);
              if (!ubicacionValida) {
                  setEscaneo('');
                  return setMensaje({ texto: 'La ubicación no es válida, está ocupada o pertenece a otra bodega.', tipo: 'error' });
              }

              const ubicacionRepetida = Object.values(ubicacionesPorPallet).some(u => normalizarUbicacion(u.id_ubicacion) === normalizarUbicacion(ubicacionValida.id_ubicacion));
              if (ubicacionRepetida) {
                  setEscaneo('');
                  return setMensaje({ texto: 'Esa ubicación ya fue asignada a otro pallet. Seleccione otra ubicación.', tipo: 'error' });
              }

              nuevoArbol[val] = {};
              setUbicacionesPorPallet(prev => ({
                  ...prev,
                  [val]: {
                      id_ubicacion: ubicacionValida.id_ubicacion,
                      codigo: ubicacionValida.id_ubicacion.split('-')[1],
                      estrategia
                  }
              }));
          } else {
              setUbicacionDestino(ubicacionesPorPallet[val]?.codigo || '');
          }
          setActivePallet(val); setActiveMB(null);
          setMensaje({ texto: `Pallet ${val} activado en ubicación ${esPalletNuevo ? ubicacionDestino : ubicacionesPorPallet[val]?.codigo || ''}.`, tipo: 'info' });
      } else if (val.startsWith('MB-')) {
          if (!activePallet) return alert("❌ Escanee un PALLET primero.");
          if (!ubicacionesPorPallet[activePallet]) return alert("❌ El pallet activo no tiene ubicación asignada.");
          if (planSerializacion?.loteMasterBox && !val.startsWith(planSerializacion.loteMasterBox)) {
              setEscaneo('');
              return setMensaje({ texto: `La MasterBox ${val} no pertenece al lote esperado (${planSerializacion.loteMasterBox}).`, tipo: 'error' });
          }
          const existeEnOtroPallet = Object.entries(nuevoArbol).some(([pallet, masterBoxes]) => pallet !== activePallet && Boolean(masterBoxes[val]));
          if (existeEnOtroPallet) {
              setEscaneo('');
              return setMensaje({ texto: `La MasterBox ${val} ya fue asignada a otro pallet.`, tipo: 'error' });
          }
          if (!nuevoArbol[activePallet][val] && planSerializacion?.totalMasterBox && totalMasterBoxEscaneadas >= planSerializacion.totalMasterBox) {
              setEscaneo('');
              return setMensaje({ texto: `Ya se escanearon las ${planSerializacion.totalMasterBox} MasterBox esperadas.`, tipo: 'error' });
          }
          if (!nuevoArbol[activePallet][val] && masterBoxPorPalletEsperadas && Object.keys(nuevoArbol[activePallet]).length >= masterBoxPorPalletEsperadas) {
              setEscaneo('');
              return setMensaje({ texto: `El pallet activo ya tiene ${masterBoxPorPalletEsperadas} MasterBox, que es lo esperado.`, tipo: 'error' });
          }
          if (!nuevoArbol[activePallet][val]) nuevoArbol[activePallet][val] = [];
          setActiveMB(val);
          setMensaje({ texto: `Caja ${val} abierta.`, tipo: 'info' });
      } else {
          if (!activePallet || !activeMB) return alert("❌ Debe tener Pallet y Caja activos.");
          if (!ubicacionesPorPallet[activePallet]) return alert("❌ El pallet activo no tiene ubicación asignada.");
          let isDuplicado = false;
          Object.values(nuevoArbol).forEach(p => Object.values(p).forEach(c => { if (c.includes(val)) isDuplicado = true; }));
          if (isDuplicado) {
              setMensaje({ texto: `El serial ${val} ya fue escaneado.`, tipo: 'error' });
          } else if (planSerializacion?.unidadesPorMasterBox && nuevoArbol[activePallet][activeMB].length >= planSerializacion.unidadesPorMasterBox) {
              setMensaje({ texto: `La MasterBox activa ya tiene ${planSerializacion.unidadesPorMasterBox} seriales, que es lo esperado.`, tipo: 'error' });
          } else if (planSerializacion?.cantidadTotal && totalSeriales >= planSerializacion.cantidadTotal) {
              setMensaje({ texto: `Ya se escanearon las ${planSerializacion.cantidadTotal} unidades esperadas.`, tipo: 'error' });
          } else {
              nuevoArbol[activePallet][activeMB].push(val);
              setTotalSeriales(prev => prev + 1);
              const serialesPallet = getSerialesPorPallet(activePallet, nuevoArbol);
              const palletCompleto = planSerializacion?.unidadesPorPallet && serialesPallet >= planSerializacion.unidadesPorPallet;
              if (palletCompleto && totalPalletsEscaneados < (planSerializacion?.totalPallets || 0)) {
                  setActivePallet(null);
                  setActiveMB(null);
                  setUbicacionDestino('');
                  setMensaje({ texto: `Pallet completo con ${serialesPallet} unidades. Seleccione otra ubicación y escanee el siguiente pallet.`, tipo: 'exito' });
              } else {
                  setMensaje({ texto: `Serial #${nuevoArbol[activePallet][activeMB].length} guardado: ${val}`, tipo: 'exito' });
              }
          }
      }
      setArbolEscaneo(nuevoArbol); setEscaneo(''); 
  };

  const handleGuardarSerializacion = async () => {
      if (totalSeriales === 0) return;

      const palletsSinUbicacion = Object.keys(arbolEscaneo).filter(pallet => !ubicacionesPorPallet[pallet]);
      if (palletsSinUbicacion.length > 0) {
          return alert(`⚠️ Falta asignar ubicación a: ${palletsSinUbicacion.join(', ')}`);
      }

      const movimientosPorPallet = Object.entries(arbolEscaneo).map(([pallet, masterBoxes]) => ({
          pallet,
          cantidad: Object.values(masterBoxes).reduce((sum, seriales) => sum + seriales.length, 0),
          ubicacion: ubicacionesPorPallet[pallet],
          seriales: Object.entries(masterBoxes).flatMap(([masterBox, seriales]) =>
              seriales.map(serial => ({ serial, pallet, masterBox }))
          )
      })).filter(movimiento => movimiento.cantidad > 0);

      const resumenUbicaciones = movimientosPorPallet.map(movimiento => `${movimiento.pallet}: ${movimiento.cantidad} uds. en ${movimiento.ubicacion.codigo}`).join('\n');
      const confirmacion = window.confirm(`Se moverán ${totalSeriales} equipos separados por pallet:\n\n${resumenUbicaciones}\n\n¿Confirmar?`);
      if (!confirmacion) return;

      const token = localStorage.getItem('token');
      try {
          for (const movimiento of movimientosPorPallet) {
              const response = await fetch(`${API_BASE}/inventario/movimiento-interno`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({
                      id_producto: productoSelect,
                      tipo_movimiento: 'PRODUCCIÓN',
                      cantidad: movimiento.cantidad,
                      origen: bodegaOrigen,
                      destino: bodegaDestino,
                      ubicacion_nueva: movimiento.ubicacion.id_ubicacion,
                      seriales: movimiento.seriales
                  })
              });

              if (!response.ok) {
                  const data = await response.json().catch(() => ({}));
                  throw new Error(data.message || `No se pudo transferir ${movimiento.pallet}.`);
              }
          }

          alert("✅ ¡Producción registrada y Transferencia completada!");
          setArbolEscaneo({}); setUbicacionesPorPallet({}); setActivePallet(null); setActiveMB(null); setTotalSeriales(0); setProductoSelect(''); setUbicacionDestino('');
          await cargarDatos(); // Esto recargará y ocultará el producto automáticamente
      } catch (error) {
          alert(`❌ Error al guardar la serialización: ${error.message}`);
      }
  };

  if (loadingInitial) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#1a73e8" /><p>Cargando WMS...</p></div>;

  return (
    <div className="scan-container">
      <div className="scan-card-main">
        <h2 className="scan-header-title">
          <div style={{ background: '#e8f0fe', padding: '10px', borderRadius: '10px', color: '#1a73e8' }}><FaBarcode /></div>
          Producción: Serializado y Transferencia
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="scan-box-disabled">
                    <label className="scan-label"><FaWarehouse/> Bodega Origen</label>
                    <select value={bodegaOrigen} disabled className="scan-input" style={{background: 'white'}}><option>B00 - Materia prima</option></select>
                </div>
                <div className="scan-box-disabled" style={{borderColor: '#1a73e8', background: '#f8f9fa'}}>
                    <label className="scan-label" style={{color: '#1a73e8'}}><FaWarehouse/> Bodega Destino *</label>
                    <select value={bodegaDestino} onChange={e => handleBodegaDestinoChange(e.target.value)} className="scan-input" style={{background: 'white'}}>
                        <option value="">-- Seleccione Destino --</option>
                        {bodegas.filter(b => b.id !== 'B00').map(b => <option key={b.id} value={b.id}>{b.id} - {b.descripcion}</option>)}
                    </select>
                </div>
            </div>

            <div className="scan-box-white">
                <div style={{ padding: '15px 20px', borderBottom: '2px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: '10px', background: '#202124', color: 'white' }}>
                    <FaMapMarkerAlt color="#fbbc04" /> <span style={{ fontWeight: 'bold' }}>Ubicaciones de Destino</span>
                </div>
                <div style={{ padding: '20px' }}>
                    <div className="btn-toggle-group">
                        <button onClick={() => {setEstrategia('RACK'); setUbicacionDestino('');}} className={`btn-toggle ${estrategia === 'RACK' ? 'active' : 'inactive'}`} disabled={Boolean(activePallet)}><FaBars /> POSICIÓN FIJA</button>
                        <button onClick={() => {setEstrategia('PISO'); setUbicacionDestino('');}} className={`btn-toggle ${estrategia === 'PISO' ? 'active' : 'inactive'}`} disabled={Boolean(activePallet)}><FaLayerGroup /> POSICIÓN MÓVIL</button>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                        <label className="scan-label" style={{justifyContent: 'center', marginBottom: '10px'}}>
                          {activePallet ? `Ubicación asignada a ${activePallet}` : 'Ubicación para el siguiente pallet'}
                        </label>
                        <input list="listaUbiScan" value={ubicacionDestino} onChange={e => setUbicacionDestino(e.target.value.toUpperCase())} className="scan-input scan-input-yellow" placeholder={estrategia === 'RACK' ? "Ej: A01A01" : "Ej: PA0001"} disabled={!bodegaDestino || Boolean(activePallet)} />
                        <datalist id="listaUbiScan">
                            {getUbicacionesDisponiblesParaPallet().map(u => (
                                <option key={u.id_ubicacion} value={u.id_ubicacion.split('-')[1]} />
                            ))}
                        </datalist>
                    </div>
                </div>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="scan-box-disabled" style={{background: 'white'}}>
                <label className="scan-label"><FaMicrochip/> Producto a Serializar *</label>
                <select value={productoSelect} onChange={handleProductoChange} className="scan-input">
                    <option value="">-- Seleccione un Producto --</option>
                    {productos.map(p => <option key={p.id_lote || p.id_producto} value={p.id_producto}>{p.sku} | {p.nombre_producto}</option>)}
                </select>
            </div>
            <div className="scan-box-disabled" style={{textAlign: 'center', background: '#fff9c4', border: '2px solid #fbbc04'}}>
                <label className="scan-label" style={{justifyContent: 'center'}}>Stock MP</label>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{cantidadTotal}</div>
            </div>
        </div>

        {productoSeleccionado && (
          <div className="scan-plan-card">
            <div className="scan-plan-header">
              <div>
                <span>Plan inteligente del lote</span>
                <strong>{productoSeleccionado.sku} · {productoSeleccionado.nombre_producto}</strong>
              </div>
              <div className={totalSeriales === planSerializacion.cantidadTotal ? 'scan-plan-status complete' : 'scan-plan-status'}>
                {totalSeriales}/{planSerializacion.cantidadTotal} unidades
              </div>
            </div>
            <div className="scan-plan-grid">
              <div><FaPallet /><strong>{totalPalletsEscaneados}/{planSerializacion.totalPallets || '-'}</strong><span>Pallets</span></div>
              <div><FaBoxOpen /><strong>{totalMasterBoxEscaneadas}/{planSerializacion.totalMasterBox || '-'}</strong><span>MasterBox</span></div>
              <div><FaMicrochip /><strong>{planSerializacion.unidadesPorMasterBox || '-'}</strong><span>Unidades por MB</span></div>
              <div><FaBoxes /><strong>{masterBoxPorPalletEsperadas || '-'}</strong><span>MB por pallet</span></div>
            </div>
            <div className="scan-progress-track">
              <div style={{ width: `${progresoSeriales}%` }} />
            </div>
            <p>
              El sistema espera {planSerializacion.totalPallets || 0} pallets, {planSerializacion.totalMasterBox || 0} MasterBox y {planSerializacion.cantidadTotal || 0} seriales. Si un código no pertenece al lote o excede el plan, se bloquea.
            </p>
          </div>
        )}

        <div className="scan-reader-zone">
            <label className="scan-label" style={{color: '#1a73e8', marginBottom: '8px'}}>Escáner de Matrícula o Serial</label>
            {mensaje.texto && (
              <div className={`scan-message ${mensaje.tipo}`}>
                {mensaje.tipo === 'error' && <FaExclamationTriangle />}
                {mensaje.texto}
              </div>
            )}
            <form onSubmit={handleScan} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}><FaSearch style={{ position: 'absolute', left: '16px', top: '16px', color: '#8ab4f8' }} /><input type="text" value={escaneo} onChange={e => setEscaneo(e.target.value)} className="scan-reader-input" placeholder="Escanee LPN o SN..." autoFocus /></div>
                <button type="submit" style={{background:'#1a73e8', color:'white', border:'none', padding:'0 30px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}><FaBarcode /> ESCANEO</button>
            </form>
            <div className="scan-active-context">
              <span>Pallet activo: <strong>{activePallet || 'Sin seleccionar'}</strong></span>
              <span>MasterBox activa: <strong>{activeMB || 'Sin seleccionar'}</strong></span>
              {activePallet && (
                <button type="button" onClick={cerrarPalletActual} style={{ background: '#fbbc04', color: '#202124', border: 'none', borderRadius: '6px', padding: '7px 12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  CERRAR PALLET
                </button>
              )}
            </div>
        </div>

        <div className="tree-container" style={{ border: '2px solid #e0e0e0', borderRadius: '12px', minHeight: '200px', background: '#fafafa' }}>
            <div style={{ background: '#f1f3f4', padding: '15px', borderRadius: '10px 10px 0 0', borderBottom: '2px solid #e0e0e0', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color: '#5f6368' }}>ÁRBOL DE CARGA</span>
                <span style={{ background: '#1a73e8', color: 'white', padding: '2px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>Equipos: {totalSeriales}</span>
            </div>
            <div style={{ padding: '20px' }}>
                {Object.keys(arbolEscaneo).length === 0 ? <p style={{textAlign:'center', color:'#999'}}>Árbol vacío...</p> : 
                    Object.entries(arbolEscaneo).map(([plt, mbs]) => (
                        <div key={plt} style={{marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white'}}>
                            <div style={{padding: '8px 15px', background: '#f8f9fa', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', gap: '10px'}}>
                              <span><FaPallet/> {plt}</span>
                              <span style={{ color: '#1a73e8' }}><FaMapMarkerAlt/> {ubicacionesPorPallet[plt]?.codigo || 'Sin ubicación'}</span>
                            </div>
                            <div style={{padding: '10px'}}>
                                {Object.entries(mbs).map(([mb, sn]) => (
                                    <div key={mb} className="scan-mb-node">
                                      <div className="scan-mb-title"><FaBoxOpen/> {mb} ({sn.length}/{planSerializacion?.unidadesPorMasterBox || '-'} seriales)</div>
                                      <div className="scan-serial-list">
                                        {sn.map((serial, index) => (
                                          <span key={serial}>#{index + 1} · {serial}</span>
                                        ))}
                                      </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>

        {serialesPlano.length > 0 && (
          <div className="scan-serial-audit">
            <h3>Seriales escaneados</h3>
            <div className="scan-serial-audit-grid">
              {serialesPlano.map((item, index) => (
                <div key={`${item.masterBox}-${item.serial}`}>
                  <strong>#{index + 1}</strong>
                  <span>{item.serial}</span>
                  <small>{item.pallet} · {item.masterBox}</small>
                </div>
              ))}
            </div>
          </div>
        )}

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
