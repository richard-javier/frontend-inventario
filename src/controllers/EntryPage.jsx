import React, { useState, useEffect } from 'react';
import { FaTruck, FaFileAlt, FaWarehouse, FaCar, FaShieldAlt, FaBox, FaCheckCircle, FaSpinner, FaSearch, FaTag, FaTimesCircle, FaMapMarkerAlt, FaPallet } from 'react-icons/fa';

const EntryPage = () => {
  const [bodegas, setBodegas] = useState([]);
  const [aforos, setAforos] = useState([]);
  const [ubicacionesLibres, setUbicacionesLibres] = useState([]);
  const [lotesPendientes, setLotesPendientes] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // 1. MEJORA: Bodega por defecto es B00 (Materia prima)
  const [cabecera, setCabecera] = useState({ 
      proveedor: '', nro_documento: '', dui: '', id_bodega: 'B00', 
      placa_vehiculo: '', id_aforo: '03', guardias_armados: 0, observaciones: '' 
  });

  const [loteEscaneado, setLoteEscaneado] = useState('');
  const [loteSeleccionado, setLoteSeleccionado] = useState(null); 
  const [costoUnitarioInput, setCostoUnitarioInput] = useState('');

  const [selCorredor, setSelCorredor] = useState('');
  const [selPosicion, setSelPosicion] = useState('');
  const [selNivel, setSelNivel] = useState('');

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const cargarDatosSincot = async () => {
    const token = localStorage.getItem('token');
    try {
      const [resMaestros, resLotes] = await Promise.all([
          fetch('http://localhost:3001/api/inventario/maestros', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:3001/api/inventario/lotes/pendientes', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (resMaestros.ok) {
          const dataMaestros = await resMaestros.json();
          if (dataMaestros.bodegas) setBodegas(dataMaestros.bodegas);
          if (dataMaestros.aforos) setAforos(dataMaestros.aforos);
          if (dataMaestros.ubicaciones) setUbicacionesLibres(dataMaestros.ubicaciones);
      }
      if (resLotes.ok) {
          const dataLotes = await resLotes.json();
          setLotesPendientes(Array.isArray(dataLotes) ? dataLotes : []);
      }
    } catch (error) { console.error("Error SINCOT:", error); }
    finally { setLoadingInitial(false); }
  };

  useEffect(() => { cargarDatosSincot(); }, []);

  const corredores = [...new Set(ubicacionesLibres.map(u => u.corredor))].sort();
  const posiciones = [...new Set(ubicacionesLibres.filter(u => u.corredor === selCorredor).map(u => u.posicion))].sort();
  const niveles = ubicacionesLibres.filter(u => u.corredor === selCorredor && u.posicion === selPosicion).map(u => u.nivel).sort();

  const handleBuscarLoteSincot = (e) => {
    e.preventDefault();
    const codigoLimpio = loteEscaneado.toUpperCase().trim();
    const lote = lotesPendientes.find(l => codigoLimpio.startsWith(l.lote_pallet) || codigoLimpio.startsWith(l.lote_base));
    
    if (lote) {
        const ingresados = lote.pallets_ingresados || 0;
        const unidadesBase = lote.unidades_por_pallet;
        let cantidadReal = unidadesBase;

        if (ingresados === lote.total_pallets - 1) {
            const saldo = lote.cantidad_total - (ingresados * unidadesBase);
            if (saldo > 0) cantidadReal = saldo;
        }

        setLoteSeleccionado({ ...lote, cantidad_ingresar: cantidadReal, pallet_actual: ingresados + 1 }); 
        setSelCorredor(''); setSelPosicion(''); setSelNivel('');
    } else { alert("❌ Lote o Pallet no encontrado en planificaciones pendientes."); }
  };

  const handleGuardarIngresoFormalSincot = async () => {
    if (!loteSeleccionado || !costoUnitarioInput) return alert("Ingrese el Costo Unitario.");
    if (!selCorredor || !selPosicion || !selNivel) return alert("Debe asignar una ubicación completa en la percha.");
    if (!cabecera.proveedor || !cabecera.nro_documento || !cabecera.dui) return alert("Complete los datos logísticos.");

    const token = localStorage.getItem('token');
    const idUbicacionFinal = `${selCorredor}${selPosicion}${selNivel}`;

    const itemRecibido = {
        id_lote_planificado: loteSeleccionado.id_lote,
        id_producto: loteSeleccionado.id_producto,
        cantidad_ingresar: loteSeleccionado.cantidad_ingresar,
        costo_unitario: parseFloat(costoUnitarioInput || 0), 
        id_ubicacion: idUbicacionFinal
    };

    try {
      const response = await fetch('http://localhost:3001/api/inventario/ingresos/formal', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cabecera, itemRecibido })
      });
      if (response.ok) {
        setMensaje({ texto: `✅ Pallet ingresado en Percha ${idUbicacionFinal}. Listo para el siguiente escaneo.`, tipo: 'exito' });
        
        // 2. MEJORA DE UX: No borramos cabecera ni costo. 
        // Solo limpiamos los datos del pallet actual para agilizar el flujo.
        setLoteSeleccionado(null); 
        setLoteEscaneado('');
        setSelCorredor(''); setSelPosicion(''); setSelNivel('');
        
        await cargarDatosSincot(); 
        setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
      }
    } catch (error) { setMensaje({ texto: "❌ Error de red.", tipo: 'error' }); }
  };

  const inputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', marginTop: '5px' };
  const labelStyle = { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.85rem', color: '#444', textTransform: 'uppercase' };
  const readOnlyStyle = { ...inputStyle, background: '#f8f9fa', color: '#666', fontWeight: 'bold', border: '1px solid #ddd' };

  if (loadingInitial) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#1a73e8" /><p>Cargando WMS...</p></div>;

  return (
    <div style={{ padding: '25px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
      <h2 style={{ color: '#1a73e8', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FaTruck /> Recepción por Pallet y Asignación de Percha.
      </h2>

      {mensaje.texto && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '6px', fontWeight: 'bold', background: '#e6f4ea', color: '#137333', border: `1px solid #137333` }}>{mensaje.texto}</div>}

      <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #ddd' }}>
        <h4 style={{ marginTop: 0, color: '#333', marginBottom: '20px', fontSize: '1.1rem' }}>Datos Logísticos del Arribo</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <div><label style={labelStyle}><FaWarehouse/> Bodega Destino *</label>
              <select value={cabecera.id_bodega} onChange={e => setCabecera({...cabecera, id_bodega: e.target.value})} style={{...inputStyle, border: '2px solid #1a73e8', fontWeight: 'bold'}}>
                  {bodegas.map(b => <option key={b.id} value={b.id}>{b.id} - {b.descripcion}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Aforo / Inspección</label>
              <select value={cabecera.id_aforo} onChange={e => setCabecera({...cabecera, id_aforo: e.target.value})} style={inputStyle}>
                  {aforos.map(a => <option key={a.id} value={a.id}>{a.descripcion}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}><FaTag/> Proveedor / Origen *</label><input type="text" value={cabecera.proveedor} onChange={e => setCabecera({...cabecera, proveedor: e.target.value})} style={inputStyle} /></div>
            <div><label style={labelStyle}><FaFileAlt/> Factura / Guía *</label><input type="text" value={cabecera.nro_documento} onChange={e => setCabecera({...cabecera, nro_documento: e.target.value})} style={inputStyle} /></div>
            
            <div><label style={labelStyle}>DUI (Aduana) *</label><input type="text" value={cabecera.dui} onChange={e => setCabecera({...cabecera, dui: e.target.value})} style={inputStyle} /></div>
            <div><label style={labelStyle}><FaCar/> Placa Vehículo</label><input type="text" value={cabecera.placa_vehiculo} onChange={e => setCabecera({...cabecera, placa_vehiculo: e.target.value})} style={inputStyle} /></div>
            <div><label style={labelStyle}><FaShieldAlt/> Guardias (Custodia)</label><input type="number" min="0" value={cabecera.guardias_armados} onChange={e => setCabecera({...cabecera, guardias_armados: e.target.value})} style={inputStyle} /></div>
        </div>
      </div>

      <div style={{ background: '#e8f0fe', padding: '25px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #1a73e8' }}>
        <form onSubmit={handleBuscarLoteSincot} style={{ display: 'flex', gap: '15px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
                <FaSearch style={{ position: 'absolute', left: '15px', top: '15px', color: '#1a73e8' }} />
                <input type="text" value={loteEscaneado} onChange={e => setLoteEscaneado(e.target.value)} style={{...inputStyle, paddingLeft: '45px', fontSize: '1.2rem', marginTop: 0}} placeholder="Escanee ETIQUETA DE PALLET (Ej: DAHAABP0000001)..." />
            </div>
            <button type="submit" style={{background:'#1a73e8', color:'white', border:'none', padding:'0 30px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}><FaBox /> ESCANEAR LPN</button>
        </form>

        {loteSeleccionado && (
            <div style={{ marginTop: '25px', background: 'white', padding: '25px', borderRadius: '8px', border: '2px solid #34a853', position: 'relative' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
                    Asignación de Pallet en Rack de Almacenamiento 
                    <span style={{fontSize:'0.9rem', color:'#1a73e8', marginLeft:'10px'}}>(Pallet {loteSeleccionado.pallet_actual} de {loteSeleccionado.total_pallets})</span>
                </h3>
                <button onClick={() => setLoteSeleccionado(null)} style={{ position: 'absolute', top: '20px', right: '20px', color: '#d93025', border: 'none', background: 'none', cursor:'pointer' }}><FaTimesCircle size="1.5em" /></button>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', alignItems: 'flex-end', marginBottom: '25px' }}>
                    <div style={{gridColumn: 'span 2'}}><label style={labelStyle}>Producto a Ingresar </label><input type="text" value={`${loteSeleccionado.nombre_producto} | ${loteSeleccionado.marca}`} style={readOnlyStyle} readOnly /></div>
                    <div>
                        <label style={{...labelStyle, color: '#fbbc04'}}><FaPallet/> Cantidad (Unid. x Pallet)</label>
                        <input type="text" value={`${loteSeleccionado.cantidad_ingresar} Unidades`} style={{...readOnlyStyle, color: '#fbbc04', border: '2px solid #fbbc04'}} readOnly />
                    </div>
                    <div><label style={labelStyle}>Costo Unitario ($) *</label><input type="number" step="0.01" value={costoUnitarioInput} onChange={e => setCostoUnitarioInput(e.target.value)} style={{...inputStyle, border:'2px solid #34a853', fontWeight:'bold'}} /></div>
                </div>

                <div style={{ background: '#f1f3f4', padding: '20px', borderRadius: '8px', border: '1px dashed #aaa' }}>
                    <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><FaMapMarkerAlt color="#d93025"/> Coordenadas de las ubicaciones</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '15px', alignItems: 'end' }}>
                        
                        <div>
                            <label style={labelStyle}>1. Corredor</label>
                            <select value={selCorredor} onChange={e => {setSelCorredor(e.target.value); setSelPosicion(''); setSelNivel('');}} style={{...inputStyle, border:'2px solid #1a73e8'}}>
                                <option value="">Seleccione...</option>
                                {corredores.map(c => <option key={c} value={c}>Corredor {c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>2. Posición</label>
                            <select value={selPosicion} onChange={e => {setSelPosicion(e.target.value); setSelNivel('');}} disabled={!selCorredor} style={{...inputStyle, border:'2px solid #1a73e8'}}>
                                <option value="">Seleccione...</option>
                                {posiciones.map(p => <option key={p} value={p}>Posición {p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>3. Nivel (Estante)</label>
                            <select value={selNivel} onChange={e => setSelNivel(e.target.value)} disabled={!selPosicion} style={{...inputStyle, border:'2px solid #1a73e8'}}>
                                <option value="">Seleccione...</option>
                                {niveles.map(n => <option key={n} value={n}>Nivel {n}</option>)}
                            </select>
                        </div>

                        <button onClick={handleGuardarIngresoFormalSincot} disabled={!selNivel} style={{background: selNivel ? '#34a853' : '#ccc', color: 'white', border: 'none', padding: '14px 25px', borderRadius: '6px', fontWeight:'bold', cursor: selNivel ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:'10px'}}>
                            <FaCheckCircle /> INGRESAR PALLET
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default EntryPage;