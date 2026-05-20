import React, { useState, useEffect } from 'react';
import { FaTruck, FaWarehouse, FaBox, FaCheckCircle, FaSpinner, FaSearch, FaMapMarkerAlt, FaPallet, FaLayerGroup, FaBars } from 'react-icons/fa';

const EntryPage = () => {
  const [bodegas, setBodegas] = useState([]);
  const [ubicacionesLibres, setUbicacionesLibres] = useState([]);
  const [lotesPendientes, setLotesPendientes] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const [cabecera, setCabecera] = useState({ id_bodega: 'B00' });
  const [loteEscaneado, setLoteEscaneado] = useState('');
  const [loteSeleccionado, setLoteSeleccionado] = useState(null); 

  const [estrategia, setEstrategia] = useState('RACK'); 
  const [selUbicacion, setSelUbicacion] = useState(''); 

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
          if (dataMaestros.ubicaciones) {
              setUbicacionesLibres(dataMaestros.ubicaciones.filter(u => u.estado === 'LIBRE'));
          }
      }
      if (resLotes.ok) {
          const dataLotes = await resLotes.json();
          setLotesPendientes(Array.isArray(dataLotes) ? dataLotes : []);
      }
    } catch (error) { console.error("Error SINCOT:", error); }
    finally { setLoadingInitial(false); }
  };

  useEffect(() => { cargarDatosSincot(); }, []);

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
        setSelUbicacion(''); 
        setEstrategia('RACK');
    } else { 
        alert("❌ Lote o Pallet no encontrado en planificaciones pendientes."); 
    }
  };

  const handleGuardarIngresoFormalSincot = async () => {
    if (!loteSeleccionado) return;
    
    if (!selUbicacion) return alert("⚠️ Debe escribir o seleccionar una ubicación disponible.");

    // CORRECCIÓN: Separamos el string para comparar visual vs base de datos
    const ubicacionValida = ubicacionesLibres.find(u => 
        u.id_ubicacion.split('-')[1] === selUbicacion && 
        u.tipo === estrategia &&
        u.id_bodega === cabecera.id_bodega 
    );
    
    if (!ubicacionValida) return alert("❌ La ubicación ingresada no es válida, pertenece a otra bodega o ya está ocupada.");

    const token = localStorage.getItem('token');
    
    const itemRecibido = {
        id_lote_planificado: loteSeleccionado.id_lote,
        id_producto: loteSeleccionado.id_producto,
        cantidad_ingresar: loteSeleccionado.cantidad_ingresar,
        costo_unitario: loteSeleccionado.costo_unitario || null, 
        id_ubicacion: ubicacionValida.id_ubicacion // ENVIAMOS EL ID COMPLETO (Ej. B00-A01A01)
    };

    try {
      const response = await fetch('http://localhost:3001/api/inventario/ingresos/formal', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cabecera, itemRecibido })
      });
      
      if (response.ok) {
        setMensaje({ texto: `✅ ¡Pallet asegurado en la ubicación ${selUbicacion}!`, tipo: 'exito' });
        setLoteSeleccionado(null); setLoteEscaneado(''); setSelUbicacion('');
        await cargarDatosSincot(); 
        setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
      } else {
        alert("❌ Ocurrió un error al procesar el ingreso.");
      }
    } catch (error) { 
      setMensaje({ texto: "❌ Error de conexión con el servidor.", tipo: 'error' }); 
    }
  };

  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #1a73e8', fontSize: '1.1rem', marginTop: '6px', outline: 'none', fontWeight: 'bold', color: '#202124' };
  const labelStyle = { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.8rem', color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const toggleBtnStyle = (active) => ({ flex: 1, padding: '15px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.2s', background: active ? '#1a73e8' : '#f1f3f4', color: active ? 'white' : '#5f6368', boxShadow: active ? '0 4px 6px rgba(26,115,232,0.2)' : 'none' });

  if (loadingInitial) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#1a73e8" /><p>Inicializando WMS...</p></div>;

  return (
    <div style={{ padding: '25px', background: '#f8f9fa', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', maxWidth: '1200px', margin: '0 auto' }}>
        
        <h2 style={{ color: '#202124', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem' }}>
          <div style={{ background: '#e8f0fe', padding: '10px', borderRadius: '10px', color: '#1a73e8' }}><FaTruck /></div>
          Operación WMS: Recepción y Estiba
        </h2>

        {mensaje.texto && <div style={{ padding: '15px 20px', marginBottom: '25px', borderRadius: '8px', fontWeight: 'bold', background: '#e6f4ea', color: '#137333', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '4px solid #137333' }}><FaCheckCircle size="1.2em"/> {mensaje.texto}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
            <label style={labelStyle}><FaWarehouse/> Bodega Física *</label>
            <select value={cabecera.id_bodega} onChange={e => setCabecera({...cabecera, id_bodega: e.target.value})} style={{...inputStyle, background: 'white'}}>
                {bodegas.map(b => <option key={b.id} value={b.id}>{b.id} - {b.descripcion}</option>)}
            </select>
          </div>

          <div style={{ background: '#e8f0fe', padding: '20px', borderRadius: '12px', border: '1px solid #8ab4f8' }}>
            <label style={{...labelStyle, color: '#1a73e8', marginBottom: '6px'}}>Escáner de Matrícula (LPN)</label>
            <form onSubmit={handleBuscarLoteSincot} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <FaSearch style={{ position: 'absolute', left: '16px', top: '16px', color: '#8ab4f8' }} />
                    <input 
                      type="text" 
                      value={loteEscaneado} 
                      onChange={e => setLoteEscaneado(e.target.value)} 
                      style={{...inputStyle, marginTop: 0, paddingLeft: '45px', height: '50px', backgroundColor: '#202124', color: '#ffffff', border: '2px solid #1a73e8'}} 
                      placeholder="Ej: PLT-PRI-2604001..." 
                    />
                </div>
                <button type="submit" style={{background:'#1a73e8', color:'white', border:'none', padding:'0 30px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem'}}>
                  <FaBox /> PROCESAR
                </button>
            </form>
          </div>
        </div>

        {loteSeleccionado && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                
                <div style={{ background: '#202124', color: 'white', padding: '20px 25px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaPallet color="#fbbc04" /> Detalle del Pallet <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.8rem' }}>{loteSeleccionado.pallet_actual} de {loteSeleccionado.total_pallets}</span>
                        </h3>
                        <p style={{ margin: 0, color: '#9aa0a6', fontSize: '0.9rem' }}>{loteSeleccionado.sku} | {loteSeleccionado.nombre_producto}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', color: '#9aa0a6', textTransform: 'uppercase' }}>CANTIDAD</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fbbc04' }}>{loteSeleccionado.cantidad_ingresar} Uds.</div>
                    </div>
                </div>

                <div style={{ border: '2px solid #202124', borderTop: 'none', padding: '25px', borderRadius: '0 0 12px 12px', background: 'white' }}>
                    
                    <h4 style={{ margin: '0 0 20px 0', color: '#202124', display: 'flex', alignItems: 'center', gap: '10px' }}><FaMapMarkerAlt color="#ea4335"/> Ubicaciones</h4>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                        <button onClick={() => {setEstrategia('RACK'); setSelUbicacion('');}} style={toggleBtnStyle(estrategia === 'RACK')}>
                            <FaBars size="1.2em" /> POSICIÓN FIJA
                        </button>
                        <button onClick={() => {setEstrategia('PISO'); setSelUbicacion('');}} style={toggleBtnStyle(estrategia === 'PISO')}>
                            <FaLayerGroup size="1.2em" /> POSICIÓN MÓVIL
                        </button>
                    </div>

                    <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '100%', maxWidth: '500px' }}>
                            <label style={{...labelStyle, marginBottom: '10px'}}>Asignar Ubicación Física (Disponibles)</label>
                            
                            <input 
                                list="listaUbicaciones" 
                                value={selUbicacion} 
                                onChange={(e) => setSelUbicacion(e.target.value.toUpperCase())} 
                                style={{...inputStyle, background: '#fff9c4', border: '2px solid #fbbc04', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '2px', padding: '15px'}} 
                                placeholder={estrategia === 'RACK' ? "Ej: A01A01" : "Ej: PA0001"}
                            />
                            
                            <datalist id="listaUbicaciones">
                                {ubicacionesLibres
                                    .filter(u => u.tipo === estrategia && (!u.id_bodega || u.id_bodega === cabecera.id_bodega))
                                    .map(u => (
                                    <option key={u.id_ubicacion} value={u.id_ubicacion.split('-')[1]} />
                                ))}
                            </datalist>
                            <p style={{ textAlign: 'center', color: '#80868b', fontSize: '0.85rem', marginTop: '10px' }}>Escriba o seleccione una ubicación de la lista. Las ubicaciones ocupadas no se muestran.</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                        <button 
                            onClick={handleGuardarIngresoFormalSincot} 
                            disabled={!selUbicacion} 
                            style={{ background: selUbicacion ? '#34a853' : '#dadce0', color: 'white', border: 'none', padding: '16px 40px', borderRadius: '8px', fontWeight:'bold', fontSize: '1.1rem', cursor: selUbicacion ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:'10px', transition: 'all 0.3s' }}
                        >
                            <FaCheckCircle size="1.2em" /> CONFIRMAR ESTIBA
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