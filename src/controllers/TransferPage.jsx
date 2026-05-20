import React, { useState, useEffect } from 'react';
import { FaExchangeAlt, FaWarehouse, FaSearch, FaBox, FaCheckCircle, FaTrash, FaSpinner, FaBarcode, FaMapMarkerAlt, FaBars, FaLayerGroup } from 'react-icons/fa';
import '../css/TransferPage.css';

const TransferPage = () => {
  const [bodegas, setBodegas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ubicacionesLibres, setUbicacionesLibres] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [bodegaOrigen, setBodegaOrigen] = useState('');
  const [bodegaDestino, setBodegaDestino] = useState('');
  const [estrategia, setEstrategia] = useState('RACK'); 
  const [ubicacionDestino, setUbicacionDestino] = useState('');
  const [productoSelect, setProductoSelect] = useState('');

  const [escaneo, setEscaneo] = useState('');
  const [listaTransferencia, setListaTransferencia] = useState([]);

  const cargarDatos = async () => {
    const token = localStorage.getItem('token');
    try {
      const [resMaestros, resProd] = await Promise.all([
          fetch('http://localhost:3001/api/inventario/maestros', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:3001/api/inventario', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (resMaestros.ok) {
          const dataM = await resMaestros.json();
          if (dataM.bodegas) setBodegas(dataM.bodegas);
          if (dataM.ubicaciones) setUbicacionesLibres(dataM.ubicaciones.filter(u => u.estado === 'LIBRE'));
      }
      if (resProd.ok) {
          const dataProd = await resProd.json();
          setProductos(dataProd.filter(p => Number(p.stock_actual) > 0));
      }
    } catch (error) { console.error("Error cargando maestros:", error); }
    finally { setLoadingInitial(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleScan = (e) => {
      e.preventDefault();
      const val = escaneo.trim().toUpperCase();
      
      if (!val) return;
      if (!bodegaOrigen || !bodegaDestino || !ubicacionDestino || !productoSelect) {
          return alert("⚠️ Complete Bodega de Origen, Destino, Ubicación y Producto antes de escanear.");
      }

      if (listaTransferencia.some(item => item.codigo === val)) {
          setEscaneo('');
          return alert(`❌ El código ${val} ya está en la lista de transferencia.`);
      }

      const prodSeleccionado = productos.find(p => p.id_producto.toString() === productoSelect);

      let tipoItem = 'UNIDAD/SERIE';
      if (val.startsWith('PLT-')) tipoItem = 'PALLET';
      else if (val.startsWith('MB-')) tipoItem = 'MASTERBOX';

      const nuevoItem = {
          id: new Date().getTime(),
          id_producto: productoSelect,
          nombre_producto: prodSeleccionado.nombre_producto,
          sku: prodSeleccionado.sku,
          codigo: val,
          tipo: tipoItem,
          cantidad: 1 
      };

      setListaTransferencia([nuevoItem, ...listaTransferencia]);
      setEscaneo(''); 
  };

  const actualizarCantidad = (idItem, nuevaCantidad) => {
      const cantidad = parseInt(nuevaCantidad) || 1;
      setListaTransferencia(listaTransferencia.map(item => 
          item.id === idItem ? { ...item, cantidad: cantidad } : item
      ));
  };

  const quitarItem = (idToRemove) => {
      setListaTransferencia(listaTransferencia.filter(item => item.id !== idToRemove));
  };

  const handleTransferirTodo = async () => {
      if (listaTransferencia.length === 0) return;

      // CORRECCIÓN: Separamos el string para comparar solo el estante
      const ubicacionValida = ubicacionesLibres.find(u => 
          u.id_ubicacion.split('-')[1] === ubicacionDestino && 
          u.tipo === estrategia &&
          u.id_bodega === bodegaDestino
      );
      
      if (!ubicacionValida) return alert("❌ La ubicación de destino no es válida, está ocupada o pertenece a otra bodega.");

      const confirmacion = window.confirm(`¿Confirmar transferencia de ${listaTransferencia.length} elementos hacia [${bodegaDestino}] en ubicación [${ubicacionDestino}]?`);
      if (!confirmacion) return;

      const payload = {
          bodega_origen: bodegaOrigen,
          bodega_destino: bodegaDestino,
          ubicacion_destino: ubicacionValida.id_ubicacion, // SE ENVÍA COMPLETO AL BACKEND
          items: listaTransferencia
      };

      console.log("Payload Transferencia:", payload);
      alert(`✅ ¡Transferencia hacia ${bodegaDestino} completada!`);
      
      setListaTransferencia([]); setBodegaDestino(''); setUbicacionDestino(''); setProductoSelect(''); setBodegaOrigen('');
      await cargarDatos(); 
  };

  if (loadingInitial) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#1a73e8" /></div>;

  return (
    <div className="transfer-container">
      <div className="transfer-card-main">
        
        <div className="transfer-header">
            <h2 className="transfer-title">
                <div className="transfer-icon-wrapper"><FaExchangeAlt /></div>
                Transferencia Interna (WMS)
            </h2>
            <div className="transfer-badge">{listaTransferencia.length} Escaneos listos</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="transfer-box">
                    <label className="transfer-label"><FaWarehouse color="#1a73e8"/> Bodega Origen *</label>
                    <select value={bodegaOrigen} onChange={e => setBodegaOrigen(e.target.value)} className="transfer-input" style={{ backgroundColor: 'white' }}>
                        <option value="" style={{ background: 'white', color: '#202124' }}>-- Seleccione Origen --</option>
                        {bodegas.map(b => <option key={b.id} value={b.id} style={{ background: 'white', color: '#202124' }}>{b.id} - {b.descripcion}</option>)}
                    </select>
                </div>
                <div className="transfer-box" style={{borderColor: '#1a73e8', background: 'white'}}>
                    <label className="transfer-label" style={{color: '#1a73e8'}}><FaWarehouse/> Bodega Destino *</label>
                    <select value={bodegaDestino} onChange={e => setBodegaDestino(e.target.value)} className="transfer-input" disabled={!bodegaOrigen} style={{ backgroundColor: 'white' }}>
                        <option value="" style={{ background: 'white', color: '#202124' }}>-- Seleccione Destino --</option>
                        {bodegas.filter(b => b.id !== bodegaOrigen).map(b => <option key={b.id} value={b.id} style={{ background: 'white', color: '#202124' }}>{b.id} - {b.descripcion}</option>)}
                    </select>
                </div>
            </div>

            <div className="transfer-location-card">
                <div className="transfer-location-header">
                    <FaMapMarkerAlt color="#fbbc04" /> <span style={{ fontWeight: 'bold' }}>Ubicación en Bodega Destino</span>
                </div>
                
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="btn-toggle-group">
                        <button onClick={() => {setEstrategia('RACK'); setUbicacionDestino('');}} className={`btn-toggle ${estrategia === 'RACK' ? 'active' : 'inactive'}`}><FaBars /> RACK FIJO</button>
                        <button onClick={() => {setEstrategia('PISO'); setUbicacionDestino('');}} className={`btn-toggle ${estrategia === 'PISO' ? 'active' : 'inactive'}`}><FaLayerGroup /> PISO MÓVIL</button>
                    </div>

                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', flex: 1 }}>
                        <label className="transfer-label" style={{justifyContent: 'center', marginBottom: '10px'}}>Posición Física a Ocupar</label>
                        <input 
                            list="listaUbiTransfer"
                            value={ubicacionDestino} 
                            onChange={e => setUbicacionDestino(e.target.value.toUpperCase())} 
                            className="transfer-input-yellow"
                            placeholder={estrategia === 'RACK' ? "Ej: A01A01" : "Ej: PA0001"}
                            disabled={!bodegaDestino}
                        />
                        <datalist id="listaUbiTransfer">
                            {ubicacionesLibres
                                .filter(u => u.tipo === estrategia && (!u.id_bodega || u.id_bodega === bodegaDestino))
                                .map(u => (
                                <option key={u.id_ubicacion} value={u.id_ubicacion.split('-')[1]} />
                            ))}
                        </datalist>
                    </div>
                </div>
            </div>
        </div>

        <div className="transfer-box" style={{ marginBottom: '25px', background: 'white' }}>
            <label className="transfer-label"><FaBox color="#fbbc04"/> Seleccionar Producto a Transferir *</label>
            <select value={productoSelect} onChange={e => setProductoSelect(e.target.value)} className="transfer-input" style={{ backgroundColor: 'white' }}>
                <option value="" style={{ background: 'white', color: '#202124' }}>-- Busque y seleccione el producto --</option>
                {productos.map(p => <option key={p.id_producto} value={p.id_producto} style={{ background: 'white', color: '#202124' }}>{p.sku} | {p.nombre_producto} (Disp: {p.stock_actual})</option>)}
            </select>
        </div>

        <div className="transfer-reader-zone">
            <label className="transfer-label" style={{color: '#8ab4f8', marginBottom: '15px'}}>🔫 LECTORA DE SERIES, CAJAS Y PALLETS</label>
            <form onSubmit={handleScan} style={{ display: 'flex', gap: '15px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <FaBarcode style={{ position: 'absolute', left: '16px', top: '18px', color: '#8ab4f8', fontSize: '1.2rem' }} />
                    <input type="text" value={escaneo} onChange={e => setEscaneo(e.target.value)} className="transfer-reader-input" placeholder="Escanee LPN (Pallet/Caja) o Serie y presione ENTER..." autoFocus />
                </div>
                <button type="submit" className="transfer-btn-scan">AÑADIR</button>
            </form>
        </div>

        <div style={{ border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden', marginBottom: '25px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', color: '#5f6368', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '15px' }}>Tipo</th>
                        <th style={{ padding: '15px' }}>Código LPN/Serie</th>
                        <th style={{ padding: '15px' }}>Producto</th>
                        <th style={{ padding: '15px', textAlign: 'center', width: '120px' }}>Cant.</th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {listaTransferencia.length === 0 ? (
                        <tr><td colSpan="5" style={{textAlign:'center', padding:'40px', color:'#9aa0a6'}}>No hay elementos escaneados para transferir.</td></tr>
                    ) : (
                        listaTransferencia.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f0f2f5' }}>
                            <td style={{ padding: '15px' }}>
                                <span className={item.tipo === 'PALLET' ? 'tag-pallet' : item.tipo === 'MASTERBOX' ? 'tag-masterbox' : 'tag-unidad'}>
                                    {item.tipo}
                                </span>
                            </td>
                            <td style={{ padding: '15px', fontWeight: 'bold', color: '#202124', fontSize: '1.1rem' }}>{item.codigo}</td>
                            <td style={{ padding: '15px', color: '#5f6368' }}>{item.nombre_producto} <br/><small>{item.sku}</small></td>
                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                <input 
                                    type="number" 
                                    min="1" 
                                    value={item.cantidad} 
                                    onChange={(e) => actualizarCantidad(item.id, e.target.value)}
                                    style={{ width: '60px', padding: '8px', textAlign: 'center', borderRadius: '6px', border: '1px solid #dadce0', fontWeight: 'bold', color: '#202124' }}
                                />
                            </td>
                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                <button onClick={() => quitarItem(item.id)} style={{ color: '#d93025', border: 'none', background: '#fce8e6', padding: '8px', borderRadius: '50%', cursor:'pointer' }}>
                                    <FaTrash />
                                </button>
                            </td>
                        </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        <div style={{ textAlign: 'right' }}>
            <button onClick={handleTransferirTodo} disabled={listaTransferencia.length === 0} style={{ background: listaTransferencia.length > 0 ? '#1a73e8' : '#dadce0', color: 'white', border: 'none', padding: '18px 40px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: listaTransferencia.length > 0 ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '10px', transition: '0.3s', boxShadow: listaTransferencia.length > 0 ? '0 8px 15px rgba(26, 115, 232, 0.3)' : 'none' }}>
                <FaCheckCircle size="1.3em" /> EJECUTAR TRANSFERENCIA FÍSICA
            </button>
        </div>

      </div>
    </div>
  );
};

export default TransferPage;