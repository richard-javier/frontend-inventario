import React, { useState, useEffect } from 'react';
import { FaSave, FaPrint, FaPlus, FaTrash, FaFileSignature, FaBuilding, FaUserCheck } from 'react-icons/fa';
import { generarNotaIngresoPDF } from '../utils/pdfGenerator'; 
import '../css/ReceivingNotePage.css'; 

const proveedoresExample = ['SONY', 'Zebra Technologies', 'Apple Colombia', 'Dahua Seguridad', 'Adata Tech'];
const bodegasExample = ['Bodega Principal (Aduana)', 'Bodega Central (Aereo)', 'Bodega Repuestos (Local)'];
const estadosExample = ['Buenos', 'Regulares', 'Nuevos'];
const aforosExample = ['Físico', 'Documental', 'Público'];
const cargosSugeridos = ['Proveedor', 'Transportista', 'Supervisor', 'Asistente de Bodega', 'Jefe de Operaciones'];

const ProductoFila = ({ producto, index, onFilaChange, onRemove }) => (
  <tr style={{ borderBottom: '1px solid #eaeaea' }}>
    <td style={{ padding: '8px' }}><input type="number" min="0" value={producto.perdida} onChange={(e) => onFilaChange(index, 'perdida', e.target.value)} className="cell-input" /></td>
    <td style={{ padding: '8px' }}><input type="number" min="1" value={producto.recibida} onChange={(e) => onFilaChange(index, 'recibida', e.target.value)} className="cell-input" required /></td>
    <td style={{ padding: '8px' }}><input type="number" min="0" value={producto.pendiente} onChange={(e) => onFilaChange(index, 'pendiente', e.target.value)} className="cell-input" /></td>
    <td style={{ padding: '8px' }}>
        <input type="text" list="catalogoProductos" value={producto.descripcion} onChange={(e) => onFilaChange(index, 'descripcion', e.target.value)} className="cell-input" style={{textAlign: 'left', border: '1px solid #1a73e8'}} placeholder="Buscar por SKU o Nombre..." required />
    </td>
    <td style={{ padding: '8px' }}><input type="text" value={producto.guia} disabled className="cell-input" style={{color: '#5f6368', fontWeight: 'bold', background: 'transparent', border: 'none'}} /></td>
    <td className="no-print" style={{ padding: '8px', textAlign: 'center' }}>
      <button onClick={() => onRemove(index)} style={{ background: 'none', border: 'none', color: '#ea4335', cursor: 'pointer', fontSize: '1.2rem' }}><FaTrash /></button>
    </td>
  </tr>
);

const ReceivingNotePage = () => {
  const [productosBD, setProductosBD] = useState([]);
  const [isSaved, setIsSaved] = useState(false);

  const [nota, setNota] = useState({
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    proveedor: '', 
    ordenCompra: 'OC-0001',
    secuencial: '0000001', // Valor por defecto mientras carga
    provieneDe: bodegasExample[0],
    estadoMercaderia: 'Nuevos',
    placaVehiculo: 'GQV-3581',
    aforo: 'Documental',
    observaciones: 'Importación llegó sin novedad',
    entregadoPor: { nombre: '', cargo: '' },
    recibidoPor: { nombre: '', cargo: '' }
  });

  const [productosRows, setProductosRows] = useState([
    { perdida: 0, recibida: 1, pendiente: 0, descripcion: '', guia: '0000001' } 
  ]);

  // Cargar Catálogo
  useEffect(() => {
    const fetchCatalogo = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch('http://localhost:3001/api/inventario', { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) setProductosBD(await response.json() || []);
      } catch (error) { console.error("Error cargando catálogo", error); }
    };
    fetchCatalogo();
  }, []);

  // NUEVO EFFECT: Cargar el Secuencial Siguiente al abrir la pantalla
  useEffect(() => {
    const fetchSecuencial = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch('http://localhost:3001/api/inventario/notas-ingreso/siguiente', { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (response.ok) {
            const data = await response.json();
            // Actualizamos la nota principal
            setNota(prev => ({ ...prev, secuencial: data.secuencial }));
            // Actualizamos la fila inicial
            setProductosRows(prev => prev.map(fila => ({ ...fila, guia: data.secuencial })));
        }
      } catch (error) { console.error("Error cargando el siguiente secuencial", error); }
    };
    fetchSecuencial();
  }, []);

  // Reloj en tiempo real
  useEffect(() => {
    const relojInterval = setInterval(() => {
      const horaAct = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      setNota(prev => prev.hora !== horaAct ? { ...prev, hora: horaAct } : prev);
    }, 1000);
    return () => clearInterval(relojInterval);
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!nota.proveedor || productosRows.some(p => !p.descripcion)) return alert("⚠️ Complete proveedor y descripción.");

    try {
        const response = await fetch('http://localhost:3001/api/inventario/notas-ingreso', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nota, productos: productosRows })
        });
        const data = await response.json();

        if (response.ok) {
            alert(`✅ Documento Guardado. Secuencial: ${data.secuencial}`);
            setIsSaved(true);
            setNota({ ...nota, secuencial: data.secuencial });
            setProductosRows(productosRows.map(fila => ({ ...fila, guia: data.secuencial })));
        } else { alert(`❌ Error: ${data.message}`); }
    } catch (error) { alert("❌ Error de red."); }
  };

  const handleImprimir = () => {
    if (!isSaved) return alert("⚠️ Primero debe GUARDAR el documento.");
    generarNotaIngresoPDF(nota, productosRows); 
  };

  const handleFilaChange = (index, field, value) => {
    const newProductos = [...productosRows];
    newProductos[index][field] = value;
    setProductosRows(newProductos);
  };

  const handleAddFila = () => setProductosRows([...productosRows, { perdida: 0, recibida: 1, pendiente: 0, descripcion: '', guia: nota.secuencial }]);
  const handleRemoveFila = (index) => { if(productosRows.length > 1) setProductosRows(productosRows.filter((_, i) => i !== index)); };

  return (
    <div className="receiving-container">
      
      <datalist id="catalogoProductos">
          {productosBD.map(prod => <option key={prod.id_producto} value={`${prod.sku} | ${prod.nombre_producto}`} />)}
      </datalist>
      <datalist id="proveedoresList">{proveedoresExample.map(p => <option key={p} value={p} />)}</datalist>
      
      <div id="sincot-logo-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#1a73e8', color: 'white', padding: '10px', borderRadius: '8px' }}><FaFileSignature size="1.5em" /></div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1a73e8' }}>Registro Soporte (Recepción)</h2>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: '15px' }}>
            <button onClick={handleSave} className="btn-secondary"><FaSave /> Guardar Documento</button>
            <button onClick={handleImprimir} className="btn-primary"><FaPrint /> Imprimir PDF</button>
          </div>
      </div>

      <div className="form-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eaeaea', paddingBottom: '15px', marginBottom: '25px' }}>
          <h2 style={{ color: '#202124', margin: 0, fontWeight: '700' }}>RECEPCIÓN - INGRESO A BODEGA</h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <div style={{ background: '#fce8e6', color: '#ea4335', padding: '8px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
              No. <input type="text" value={nota.secuencial} disabled style={{ border: 'none', background: 'transparent', color: '#ea4335', fontWeight: 'bold', width: '80px', outline: 'none' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '25px' }}>
          <div className="section-card">
            <h4 className="section-header"><FaBuilding/> Información General</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div><label className="form-label">Proveedor *</label><input list="proveedoresList" value={nota.proveedor} onChange={(e) => setNota({...nota, proveedor: e.target.value})} className="form-input" required /></div>
              <div><label className="form-label">Orden Compra</label><input type="text" value={nota.ordenCompra} onChange={(e) => setNota({...nota, ordenCompra: e.target.value})} className="form-input" /></div>
              <div><label className="form-label">Fecha</label><input type="date" value={nota.fecha} className="form-input" disabled /></div>
              <div><label className="form-label">Hora (Sincronizada)</label><input type="time" value={nota.hora} className="form-input" style={{background:'#e8f0fe', color: '#1a73e8', fontWeight: 'bold'}} disabled /></div>
              <div><label className="form-label">Proviene de *</label><select value={nota.provieneDe} onChange={(e) => setNota({...nota, provieneDe: e.target.value})} className="form-input" required > {bodegasExample.map(b => <option key={b} value={b}>{b}</option>)} </select></div>
              <div><label className="form-label">Placa Vehículo *</label><input type="text" value={nota.placaVehiculo} onChange={(e) => setNota({...nota, placaVehiculo: e.target.value})} className="form-input" required /></div>
            </div>
          </div>

          <div className="section-card">
            <h4 className="section-header"><FaUserCheck/> Detalles e Inspección</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
              <div><label className="form-label">Estado *</label><select value={nota.estadoMercaderia} onChange={(e) => setNota({...nota, estadoMercaderia: e.target.value})} className="form-input" required > {estadosExample.map(e => <option key={e} value={e}>{e}</option>)} </select></div>
              <div><label className="form-label">Tipo Inspección (Aforo)</label><select value={nota.aforo} onChange={(e) => setNota({...nota, aforo: e.target.value})} className="form-input"> {aforosExample.map(a => <option key={a} value={a}>{a}</option>)} </select></div>
            </div>
          </div>
        </div>

        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#202124', textTransform: 'uppercase' }}>Detalle de Recepción</h4>
            <button onClick={handleAddFila} className="btn-add-row no-print"><FaPlus /> Agregar Fila</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', color: '#5f6368', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px', borderBottom: '2px solid #dadce0', width: '10%' }}>Perdida</th>
                  <th style={{ padding: '12px 8px', borderBottom: '2px solid #dadce0', width: '10%' }}>Recibida</th>
                  <th style={{ padding: '12px 8px', borderBottom: '2px solid #dadce0', width: '10%' }}>Pendiente</th>
                  <th style={{ padding: '12px 8px', borderBottom: '2px solid #dadce0', width: '45%', textAlign:'left' }}>Buscar Producto *</th>
                  <th style={{ padding: '12px 8px', borderBottom: '2px solid #dadce0', width: '15%' }}>Guía</th>
                  <th className="no-print" style={{ padding: '12px 8px', borderBottom: '2px solid #dadce0', width: '10%' }}>Borrar</th>
                </tr>
              </thead>
              <tbody>
                {productosRows.map((producto, index) => (
                  <ProductoFila key={index} producto={producto} index={index} onFilaChange={handleFilaChange} onRemove={handleRemoveFila} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '20px', marginBottom: '25px' }}>
            <label className="form-label">Observaciones Generales</label>
            <textarea value={nota.observaciones} onChange={(e) => setNota({...nota, observaciones: e.target.value})} rows="2" className="form-input" style={{resize:'vertical'}} />
        </div>

        <div className="signature-grid">
          <div className="signature-block">
              <div style={{ borderBottom: '2px solid #202124', width: '250px', marginBottom: '10px', marginTop:'40px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '250px' }}>
                <span className="sign-label">Entregado por (Nombre):</span>
                <input type="text" className="sign-input print-signature-input" value={nota.entregadoPor.nombre} onChange={(e) => setNota({...nota, entregadoPor: {...nota.entregadoPor, nombre: e.target.value}})} placeholder="Nombre..." />
                <span className="sign-label">Cargo / Empresa:</span>
                <input type="text" list="cargosList" className="sign-input print-signature-input" value={nota.entregadoPor.cargo} onChange={(e) => setNota({...nota, entregadoPor: {...nota.entregadoPor, cargo: e.target.value}})} style={{fontSize: '0.8rem'}} placeholder="Cargo..." />
              </div>
          </div>

          <div className="signature-block">
              <div style={{ borderBottom: '2px solid #202124', width: '250px', marginBottom: '10px', marginTop:'40px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '250px' }}>
                <span className="sign-label">Recibido por (Nombre):</span>
                <input type="text" className="sign-input print-signature-input" value={nota.recibidoPor.nombre} onChange={(e) => setNota({...nota, recibidoPor: {...nota.recibidoPor, nombre: e.target.value}})} placeholder="Nombre..." />
                <span className="sign-label">Cargo interno:</span>
                <input type="text" list="cargosList" className="sign-input print-signature-input" value={nota.recibidoPor.cargo} onChange={(e) => setNota({...nota, recibidoPor: {...nota.recibidoPor, cargo: e.target.value}})} style={{fontSize: '0.8rem'}} placeholder="Cargo..." />
              </div>
          </div>
          <datalist id="cargosList">{cargosSugeridos.map(cargo => <option key={cargo} value={cargo} />)}</datalist>
        </div>

      </div>
    </div>
  );
};

export default ReceivingNotePage;