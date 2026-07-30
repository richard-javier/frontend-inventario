import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api.js';
import { FaExchangeAlt, FaWarehouse, FaBox, FaCheckCircle, FaTrash, FaSpinner, FaBarcode, FaMapMarkerAlt, FaBars, FaLayerGroup, FaMinus, FaPlus } from 'react-icons/fa';
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
  const [productoBusqueda, setProductoBusqueda] = useState('');

  const [escaneo, setEscaneo] = useState('');
  const [listaTransferencia, setListaTransferencia] = useState([]);

  const cargarDatos = async () => {
    const token = localStorage.getItem('token');
    try {
      const [resMaestros, resProd] = await Promise.all([
          fetch(`${API_BASE}/inventario/maestros`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/inventario`, { headers: { 'Authorization': `Bearer ${token}` } })
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

  const normalizarTexto = (valor) => (valor ?? '').toString().trim().toUpperCase();

  const productoEstaEnBodega = (producto, bodega) => {
      if (!bodega) return false;
      const ubicacion = normalizarTexto(producto?.ubicacion_bodega);
      return ubicacion.startsWith(`${bodega}-`);
  };

  const productosPorBodega = productos.filter(p => productoEstaEnBodega(p, bodegaOrigen));

  const getTextoProducto = (producto) => {
      const extras = [producto.part_number, producto.codigo_barras].filter(Boolean).join(' | ');
      return `${producto.sku || 'S/N'} | ${producto.nombre_producto || 'Sin nombre'}${extras ? ` | ${extras}` : ''} (Disp: ${producto.stock_actual})`;
  };

  const productoCoincide = (producto, termino) => {
      const texto = normalizarTexto(termino);
      if (!texto) return true;

      return [
          producto?.sku,
          producto?.codigo_barras,
          producto?.part_number,
          producto?.nombre_producto,
          producto?.marca,
          producto?.ubicacion_bodega
      ].some(valor => normalizarTexto(valor).includes(texto));
  };

  const productosSugeridos = productosPorBodega
      .filter(p => productoCoincide(p, productoBusqueda))
      .slice(0, 30);

  const buscarProductoPorCodigo = (codigo, base = productosPorBodega) => {
      const valor = normalizarTexto(codigo);
      if (!valor) return null;

      return base.find(p => [
          p?.sku,
          p?.codigo_barras,
          p?.part_number,
          p?.nombre_producto
      ].some(campo => {
          const campoNormalizado = normalizarTexto(campo);
          return campoNormalizado && (campoNormalizado === valor || campoNormalizado.includes(valor) || valor.includes(campoNormalizado));
      }));
  };

  const seleccionarProducto = (producto) => {
      if (!producto) return false;
      setProductoSelect(producto.id_producto.toString());
      setProductoBusqueda(getTextoProducto(producto));
      return true;
  };

  const handleProductoBusquedaChange = (valor) => {
      setProductoBusqueda(valor);
      const producto = buscarProductoPorCodigo(valor, productosPorBodega);
      if (producto) {
          setProductoSelect(producto.id_producto.toString());
      } else {
          setProductoSelect('');
      }
  };

  const handleProductoBusquedaKeyDown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();

      const producto = buscarProductoPorCodigo(productoBusqueda, productosPorBodega) || productosSugeridos[0];
      if (!seleccionarProducto(producto)) {
          alert('No se encontró ese SKU, serial, part number o nombre en la bodega origen seleccionada.');
      }
  };

  const handleBodegaOrigenChange = (value) => {
      setBodegaOrigen(value);
      setBodegaDestino('');
      setUbicacionDestino('');
      setProductoSelect('');
      setProductoBusqueda('');
      setListaTransferencia([]);
  };

  const handleScan = (e) => {
      e.preventDefault();
      const val = escaneo.trim().toUpperCase();
      if (!val) return;
      if (!bodegaOrigen || !bodegaDestino || !ubicacionDestino) {
          return alert("⚠️ Complete Bodega de Origen, Destino y Ubicación antes de escanear.");
      }

      if (listaTransferencia.some(item => item.codigo === val)) {
          setEscaneo(''); return alert(`❌ El código ${val} ya está en la lista de transferencia.`);
      }

      let prodSeleccionado = productosPorBodega.find(p => p.id_producto.toString() === productoSelect.toString());

      if (!prodSeleccionado) {
          prodSeleccionado = buscarProductoPorCodigo(val, productosPorBodega);
          if (prodSeleccionado) seleccionarProducto(prodSeleccionado);
      }
      
      if (!prodSeleccionado) {
          return alert("❌ No se pudo identificar el producto. Escanee o escriba primero el SKU, serial, código de barras o part number existente en la bodega origen.");
      }

      let tipoItem = 'UNIDAD/SERIE';
      if (val.startsWith('PLT-')) tipoItem = 'PALLET';
      else if (val.startsWith('MB-')) tipoItem = 'MASTERBOX';

      const nuevoItem = { 
          id: new Date().getTime(), 
          id_producto: parseInt(prodSeleccionado.id_producto), // Aseguramos que sea entero
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
      const cantidad = Math.max(1, parseInt(nuevaCantidad, 10) || 1);
      setListaTransferencia(listaTransferencia.map(item => item.id === idItem ? { ...item, cantidad: cantidad } : item));
  };

  const quitarItem = (idToRemove) => { 
      setListaTransferencia(listaTransferencia.filter(item => item.id !== idToRemove)); 
  };

  const handleTransferirTodo = async () => {
      if (listaTransferencia.length === 0) return;

      // CORRECCIÓN: Búsqueda exacta de la ubicación asegurando que pertenezca a la bodega destino
const ubicacionValida = ubicacionesLibres.find(u => {
    // Si el usuario escribe "PA00085", buscamos que el ID termine con eso y coincida con la bodega elegida
    const coincideFisicamente = u.id_ubicacion.endsWith(ubicacionDestino);
    // Verificamos que sea del tipo elegido (RACK o PISO)
    const coincideTipo = u.tipo === estrategia;
    // IMPORTANTE: Verificamos explícitamente que la ubicación empiece con el prefijo de la bodega destino (Ej: 'B00')
    const coincideBodega = u.id_ubicacion.startsWith(bodegaDestino); 

    return coincideFisicamente && coincideTipo && coincideBodega;
});
      if (!ubicacionValida) return alert("❌ La ubicación de destino no es válida, está ocupada o pertenece a otra bodega.");

      const confirmacion = window.confirm(`¿Confirmar transferencia de ${listaTransferencia.length} elementos hacia [${bodegaDestino}] en ubicación [${ubicacionDestino}]?`);
      if (!confirmacion) return;

      const token = localStorage.getItem('token');
      try {
         for (const item of listaTransferencia) {
            const res = await fetch(`${API_BASE}/inventario/movimiento-interno`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    id_producto: item.id_producto,
                    tipo_movimiento: 'TRANSFERENCIA',
                    cantidad: item.cantidad,
                    origen: bodegaOrigen,
                    destino: bodegaDestino,
                    ubicacion_nueva: ubicacionValida.id_ubicacion
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }
         }

         alert(`✅ ¡Transferencia hacia ${bodegaDestino} completada sin errores!`);
         setListaTransferencia([]); 
         setBodegaDestino(''); 
         setUbicacionDestino(''); 
         setProductoSelect(''); 
         setProductoBusqueda('');
         setBodegaOrigen('');
         await cargarDatos(); 
      } catch (error) {
          alert(`❌ Error durante la transferencia: ${error.message}`);
      }
  };

  if (loadingInitial) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#1a73e8" /></div>;

  return (
    <div className="transfer-container">
      <div className="transfer-card-main">
        <div className="transfer-header">
            <h2 className="transfer-title"><div className="transfer-icon-wrapper"><FaExchangeAlt /></div> Transferencia Interna (WMS)</h2>
            <div className="transfer-badge">{listaTransferencia.length} Escaneos listos</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="transfer-box">
                    <label className="transfer-label"><FaWarehouse color="#1a73e8"/> Bodega Origen *</label>
                    <select value={bodegaOrigen} onChange={e => handleBodegaOrigenChange(e.target.value)} className="transfer-input" style={{ backgroundColor: 'white' }}>
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
                <div className="transfer-location-header"><FaMapMarkerAlt color="#fbbc04" /> <span style={{ fontWeight: 'bold' }}>Ubicación en Bodega Destino</span></div>
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="btn-toggle-group">
                        <button onClick={() => {setEstrategia('RACK'); setUbicacionDestino('');}} className={`btn-toggle ${estrategia === 'RACK' ? 'active' : 'inactive'}`}><FaBars /> RACK FIJO</button>
                        <button onClick={() => {setEstrategia('PISO'); setUbicacionDestino('');}} className={`btn-toggle ${estrategia === 'PISO' ? 'active' : 'inactive'}`}><FaLayerGroup /> PISO MÓVIL</button>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', flex: 1 }}>
                        <label className="transfer-label" style={{justifyContent: 'center', marginBottom: '10px'}}>Posición Física a Ocupar</label>
                        <input list="listaUbiTransfer" value={ubicacionDestino} onChange={e => setUbicacionDestino(e.target.value.toUpperCase())} className="transfer-input-yellow" placeholder={estrategia === 'RACK' ? "Ej: A01A01" : "Ej: PA0001"} disabled={!bodegaDestino} />
                        <datalist id="listaUbiTransfer">
                            {ubicacionesLibres.filter(u => u.tipo === estrategia && (!u.id_bodega || u.id_bodega === bodegaDestino)).map(u => (
                                <option key={u.id_ubicacion} value={u.id_ubicacion.split('-')[1]} />
                            ))}
                        </datalist>
                    </div>
                </div>
            </div>
        </div>

        <div className="transfer-box" style={{ marginBottom: '25px', background: 'white' }}>
            <label className="transfer-label"><FaBox color="#fbbc04"/> Seleccionar Producto a Transferir *</label>
            <input
                type="text"
                list="productosTransfer"
                value={productoBusqueda}
                onChange={e => handleProductoBusquedaChange(e.target.value)}
                onKeyDown={handleProductoBusquedaKeyDown}
                onBlur={() => {
                    const producto = productosPorBodega.find(p => p.id_producto.toString() === productoSelect.toString());
                    if (producto) setProductoBusqueda(getTextoProducto(producto));
                }}
                className="transfer-input transfer-product-search"
                placeholder={bodegaOrigen ? "Escriba o escanee SKU, serial, código de barras, part number o nombre..." : "Seleccione primero una bodega origen"}
                disabled={!bodegaOrigen}
            />
            <datalist id="productosTransfer">
                {productosSugeridos.map(p => <option key={p.id_producto} value={getTextoProducto(p)} />)}
            </datalist>
            <div className="transfer-product-help">
                {bodegaOrigen ? `${productosPorBodega.length} productos disponibles en ${bodegaOrigen}` : 'La búsqueda se activa al escoger la bodega origen.'}
            </div>
        </div>

        <div className="transfer-reader-zone">
            <label className="transfer-label" style={{color: '#8ab4f8', marginBottom: '15px'}}>🔫 LECTORA DE SERIES, CAJAS Y PALLETS</label>
            <form onSubmit={handleScan} style={{ display: 'flex', gap: '15px' }}>
                <div style={{ position: 'relative', flex: 1 }}><FaBarcode style={{ position: 'absolute', left: '16px', top: '18px', color: '#8ab4f8', fontSize: '1.2rem' }} /><input type="text" value={escaneo} onChange={e => setEscaneo(e.target.value)} className="transfer-reader-input" placeholder="Escanee LPN (Pallet/Caja) o Serie y presione ENTER..." autoFocus /></div>
                <button type="submit" className="transfer-btn-scan">AÑADIR</button>
            </form>
        </div>

        <div style={{ border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden', marginBottom: '25px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', color: '#5f6368', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '15px' }}>Tipo</th><th style={{ padding: '15px' }}>Código LPN/Serie</th><th style={{ padding: '15px' }}>Producto</th><th style={{ padding: '15px', textAlign: 'center', width: '120px' }}>Cant.</th><th style={{ padding: '15px', textAlign: 'center' }}>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {listaTransferencia.length === 0 ? ( <tr><td colSpan="5" style={{textAlign:'center', padding:'40px', color:'#9aa0a6'}}>No hay elementos escaneados para transferir.</td></tr> ) : (
                        listaTransferencia.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f0f2f5' }}>
                            <td style={{ padding: '15px' }}><span className={item.tipo === 'PALLET' ? 'tag-pallet' : item.tipo === 'MASTERBOX' ? 'tag-masterbox' : 'tag-unidad'}>{item.tipo}</span></td>
                            <td style={{ padding: '15px', fontWeight: 'bold', color: '#202124', fontSize: '1.1rem' }}>{item.codigo}</td>
                            <td style={{ padding: '15px', color: '#5f6368' }}>{item.nombre_producto} <br/><small>{item.sku}</small></td>
                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                <div className="transfer-qty-control" aria-label={`Cantidad para ${item.codigo}`}>
                                    <button type="button" onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} disabled={Number(item.cantidad) <= 1} title="Disminuir cantidad">
                                        <FaMinus />
                                    </button>
                                    <input type="text" inputMode="numeric" value={item.cantidad} onChange={(e) => actualizarCantidad(item.id, e.target.value)} className="transfer-qty-input" />
                                    <button type="button" onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} title="Aumentar cantidad">
                                        <FaPlus />
                                    </button>
                                </div>
                            </td>
                            <td style={{ padding: '15px', textAlign: 'center' }}><button onClick={() => quitarItem(item.id)} style={{ color: '#d93025', border: 'none', background: '#fce8e6', padding: '8px', borderRadius: '50%', cursor:'pointer' }}><FaTrash /></button></td>
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
