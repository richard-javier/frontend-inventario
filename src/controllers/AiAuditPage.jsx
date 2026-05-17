import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaCheck, FaTimes, FaSearch, FaBrain, FaExclamationTriangle, FaHistory, FaUserTie, FaSpinner } from 'react-icons/fa';

const AiAuditPage = () => {
    const [alertas, setAlertas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);

    // 1. CARGAMOS LA DATA REAL DE MYSQL
    const cargarAlertas = async () => {
        try {
            const token = localStorage.getItem('token'); // Por si tu ruta requiere token
            const res = await fetch('http://localhost:3001/api/inventario/auditoria-ia', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if(res.ok) {
                const data = await res.json();
                // Blindaje: Asegurarnos de que data sea un array antes de meterlo al estado
                setAlertas(Array.isArray(data) ? data : []);
            } else {
                console.error("Error del servidor al traer auditorías");
                setAlertas([]);
            }
        } catch(e) { 
            console.error("Error de conexión con el backend", e); 
            setAlertas([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { 
        cargarAlertas(); 
    }, []);

    // 2. APROBAMOS EN MYSQL
    const handleAprobar = async (id) => {
        if(window.confirm(`⚠️ ADVERTENCIA: ¿Está seguro de APROBAR el despacho bloqueado #${id}? Se descontará el inventario físicamente.`)) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:3001/api/inventario/auditoria-ia/resolver', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ id_auditoria: id, accion: 'APROBADO' })
                });
                
                if(res.ok) {
                    alert("✅ Despacho APROBADO y extraído del inventario correctamente.");
                    cargarAlertas(); // Recargamos la tabla para ver el cambio
                } else {
                    alert("❌ Error al aprobar el despacho en la base de datos.");
                }
            } catch(e) { alert("Error de red al procesar la solicitud."); }
        }
    };

    // 3. RECHAZAMOS EN MYSQL
    const handleRechazar = async (id) => {
        if(window.confirm(`¿Desea RECHAZAR definitivamente el despacho #${id}? La transacción será anulada.`)) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:3001/api/inventario/auditoria-ia/resolver', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ id_auditoria: id, accion: 'RECHAZADO' })
                });
                
                if(res.ok) {
                    alert("🚫 Despacho RECHAZADO. La transacción ha sido anulada.");
                    cargarAlertas(); // Recargamos la tabla
                } else {
                    alert("❌ Error al rechazar el despacho.");
                }
            } catch(e) { alert("Error de red al procesar la solicitud."); }
        }
    };

    // Filtro buscador
    const filtradas = alertas.filter(a => {
        if (!a) return false;
        const dest = a.destino ? a.destino.toLowerCase() : '';
        const est = a.estado ? a.estado.toLowerCase() : '';
        const usr = a.usuario ? a.usuario.toLowerCase() : '';
        const busq = busqueda.toLowerCase();
        return dest.includes(busq) || est.includes(busq) || usr.includes(busq);
    });

    if (cargando) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#d93025" /></div>;

    return (
        <div style={{ padding: '25px', background: '#f4f6f8', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                
                {/* HEADER DE SEGURIDAD */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: '5px solid #d93025' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ background: '#fce8e6', padding: '15px', borderRadius: '12px', color: '#d93025' }}><FaShieldAlt size="2.5em" /></div>
                        <div>
                            <h2 style={{ margin: 0, color: '#202124', fontSize: '1.6rem' }}>CENTRO DE AUDITORÍA IA</h2>
                            <p style={{ margin: 0, color: '#5f6368', fontSize: '0.9rem' }}>Prevención de Fraude y Control de Anomalías Logísticas</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ background: '#f8f9fa', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#d93025' }}>{alertas.filter(a=>a.estado==='PENDIENTE').length}</div>
                            <div style={{ fontSize: '0.75rem', color: '#5f6368', fontWeight: 'bold' }}>PENDIENTES</div>
                        </div>
                    </div>
                </div>

                {/* TABLA DE AUDITORÍA */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#202124', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}><FaHistory color="#1a73e8"/> Historial de Bloqueos</h3>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <FaSearch style={{ position: 'absolute', left: '12px', top: '12px', color: '#80868b' }} />
                            <input type="text" placeholder="Buscar por destino, estado o usuario..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #dadce0', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa', textAlign: 'left', color: '#5f6368', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '15px 20px' }}>Lote / Fecha</th>
                                    <th style={{ padding: '15px 20px' }}>Usuario Origen</th>
                                    <th style={{ padding: '15px 20px' }}>Destino y Magnitud</th>
                                    <th style={{ padding: '15px 20px' }}>Motor IA (Detección)</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'center' }}>Estado</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'center' }}>Resolución Gerencial</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#80868b'}}>
                                            No hay registros de anomalías detectadas en la base de datos.
                                        </td>
                                    </tr>
                                ) : (
                                    filtradas.map(alerta => (
                                        <tr key={alerta.id} style={{ borderBottom: '1px solid #f0f2f5', background: alerta.estado === 'PENDIENTE' ? '#fffdf7' : 'white' }}>
                                            <td style={{ padding: '15px 20px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#202124' }}>#{alerta.id}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#5f6368' }}>{alerta.fecha}</div>
                                            </td>
                                            <td style={{ padding: '15px 20px', color: '#5f6368', fontWeight: '500' }}>
                                                <FaUserTie style={{ marginRight: '5px', color: '#9aa0a6' }}/> {alerta.usuario}
                                            </td>
                                            <td style={{ padding: '15px 20px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#202124' }}>{alerta.destino}</div>
                                                <div style={{ color: '#d93025', fontWeight: 'bold', fontSize: '0.9rem' }}>{alerta.cantidad} Uds. Solicitadas</div>
                                            </td>
                                            <td style={{ padding: '15px 20px' }}>
                                                <div style={{ background: '#e8f0fe', color: '#1a73e8', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                    <FaBrain /> {alerta.motor}
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                                {alerta.estado === 'PENDIENTE' && <span style={{ background: '#fef7e0', color: '#b06000', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><FaExclamationTriangle/> PENDIENTE</span>}
                                                {alerta.estado === 'APROBADO' && <span style={{ background: '#e6f4ea', color: '#137333', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem' }}>APROBADO</span>}
                                                {alerta.estado === 'RECHAZADO' && <span style={{ background: '#fce8e6', color: '#d93025', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem' }}>RECHAZADO</span>}
                                            </td>
                                            <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                                {alerta.estado === 'PENDIENTE' ? (
                                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                        <button onClick={() => handleAprobar(alerta.id)} style={{ background: '#137333', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', transition: '0.2s' }} title="Autorizar e Ignorar IA"><FaCheck /> Aprobar</button>
                                                        <button onClick={() => handleRechazar(alerta.id)} style={{ background: '#d93025', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', transition: '0.2s' }} title="Bloquear Definitivamente"><FaTimes /> Rechazar</button>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9aa0a6', fontSize: '0.85rem', fontStyle: 'italic' }}>Resolución Cerrada</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AiAuditPage;