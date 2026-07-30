import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/api.js';
import { useSearchParams } from 'react-router-dom';
import { FaShieldAlt, FaCheck, FaTimes, FaSearch, FaBrain, FaExclamationTriangle, FaHistory, FaUserTie, FaSpinner, FaBoxOpen, FaMapMarkerAlt } from 'react-icons/fa';

const AiAuditPage = () => {
    const [alertas, setAlertas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const accionDesdeCorreoProcesada = useRef(false);

    const cargarAlertas = async () => {
        try {
            const token = localStorage.getItem('token'); 
            const res = await fetch(`${API_BASE}/inventario/auditoria-ia`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if(res.ok) {
                const data = await res.json();
                setAlertas(Array.isArray(data) ? data : []);
            } else {
                setAlertas([]);
            }
        } catch(e) { 
            setAlertas([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargarAlertas(); }, []);

    const handleAprobar = async (id) => {
        if(window.confirm(`⚠️ ADVERTENCIA: ¿Está seguro de APROBAR el despacho bloqueado #${id}? Se descontará el inventario físicamente.`)) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/inventario/auditoria-ia/resolver`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ id_auditoria: id, accion: 'APROBADO' })
                });
                
                if(res.ok) {
                    alert("✅ Despacho APROBADO y extraído del inventario correctamente.");
                    cargarAlertas(); 
                } else {
                    alert("❌ Error al aprobar el despacho en la base de datos.");
                }
            } catch(e) { alert("Error de red al procesar la solicitud."); }
        }
    };

    const handleRechazar = async (id) => {
        if(window.confirm(`¿Desea RECHAZAR definitivamente el despacho #${id}? La transacción será anulada.`)) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/inventario/auditoria-ia/resolver`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ id_auditoria: id, accion: 'RECHAZADO' })
                });
                
                if(res.ok) {
                    alert("🚫 Despacho RECHAZADO. La transacción ha sido anulada.");
                    cargarAlertas(); 
                } else {
                    alert("❌ Error al rechazar el despacho.");
                }
            } catch(e) { alert("Error de red al procesar la solicitud."); }
        }
    };

    useEffect(() => {
        if (cargando || accionDesdeCorreoProcesada.current) return;

        const idAuditoria = searchParams.get('auditoria');
        const accion = searchParams.get('accion');
        if (!idAuditoria || !accion) return;

        const auditoria = alertas.find(a => String(a.id) === String(idAuditoria));
        if (!auditoria) return;

        accionDesdeCorreoProcesada.current = true;
        setBusqueda(String(idAuditoria));
        setSearchParams({ auditoria: idAuditoria });

        if (auditoria.estado !== 'PENDIENTE') {
            alert(`La auditoría #${idAuditoria} ya está en estado ${auditoria.estado}.`);
            return;
        }

        if (accion === 'aprobar') {
            handleAprobar(idAuditoria);
        }

        if (accion === 'rechazar' || accion === 'denegar') {
            handleRechazar(idAuditoria);
        }
    }, [alertas, cargando, searchParams, setSearchParams]);

    const filtradas = alertas.filter(a => {
        if (!a) return false;
        const dest = a.destino ? a.destino.toLowerCase() : '';
        const est = a.estado ? a.estado.toLowerCase() : '';
        const usr = a.usuario ? a.usuario.toLowerCase() : '';
        const id = a.id ? String(a.id).toLowerCase() : '';
        const busq = busqueda.toLowerCase();
        return dest.includes(busq) || est.includes(busq) || usr.includes(busq) || id.includes(busq);
    });
    const auditoriaEnlazada = searchParams.get('auditoria');

    if (cargando) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#d93025" /></div>;

    return (
        <div style={{ padding: '25px', background: '#f4f6f8', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                
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

                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#202124', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}><FaHistory color="#1a73e8"/> Historial de Bloqueos</h3>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <FaSearch style={{ position: 'absolute', left: '12px', top: '12px', color: '#80868b' }} />
                            <input type="text" placeholder="Buscar por destino, estado o usuario..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #dadce0', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa', textAlign: 'left', color: '#5f6368', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '15px 20px' }}>Lote / Fecha</th>
                                    <th style={{ padding: '15px 20px' }}>Usuario Origen</th>
                                    <th style={{ padding: '15px 20px' }}>Ruta (Bodega ➔ Destino)</th>
                                    <th style={{ padding: '15px 20px' }}>Mercadería Retenida</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'center' }}>Estado</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'center' }}>Resolución</th>
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
                                        <tr key={alerta.id} style={{ borderBottom: '1px solid #f0f2f5', background: String(alerta.id) === String(auditoriaEnlazada) ? '#e8f0fe' : alerta.estado === 'PENDIENTE' ? '#fffdf7' : 'white' }}>
                                            <td style={{ padding: '15px 20px', verticalAlign: 'top' }}>
                                                <div style={{ fontWeight: 'bold', color: '#202124' }}>#{alerta.id}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#5f6368' }}>{alerta.fecha}</div>
                                                <div style={{ background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                                    <FaBrain /> {alerta.motor}
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px 20px', color: '#5f6368', fontWeight: 'bold', verticalAlign: 'top' }}>
                                                <FaUserTie style={{ marginRight: '5px', color: '#9aa0a6' }}/> {alerta.usuario}
                                            </td>
                                            <td style={{ padding: '15px 20px', verticalAlign: 'top' }}>
                                                <div style={{ fontSize: '0.85rem', color: '#5f6368', marginBottom: '4px' }}><strong>De:</strong> Bodega {alerta.bodega_origen}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#d93025' }}><strong>Hacia:</strong> {alerta.destino}</div>
                                            </td>
                                            <td style={{ padding: '15px 20px', verticalAlign: 'top' }}>
                                                {/* Caja con Scroll para los productos */}
                                                <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #f0f2f5', padding: '8px', borderRadius: '6px', background: '#fafafa' }}>
                                                    {alerta.productos && alerta.productos.length > 0 ? (
                                                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#3c4043', fontSize: '0.85rem' }}>
                                                            {alerta.productos.map((prod, idx) => (
                                                                <li key={idx} style={{ marginBottom: '4px' }}>
                                                                    <strong>{prod.cantidad}x</strong> {prod.nombre_producto} 
                                                                    <div style={{ fontSize: '0.75rem', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <FaMapMarkerAlt /> Ubicación: {prod.ubicacion_extraccion} | LPN: {prod.codigo}
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <span style={{ color: '#9aa0a6', fontSize: '0.85rem' }}>Sin detalles del payload</span>
                                                    )}
                                                </div>
                                                <div style={{ color: '#d93025', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '6px', textAlign: 'right' }}>
                                                    TOTAL BLOQUEADO: {alerta.cantidad} Uds.
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px 20px', textAlign: 'center', verticalAlign: 'top' }}>
                                                {alerta.estado === 'PENDIENTE' && <span style={{ background: '#fef7e0', color: '#b06000', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><FaExclamationTriangle/> PENDIENTE</span>}
                                                {alerta.estado === 'APROBADO' && <span style={{ background: '#e6f4ea', color: '#137333', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem' }}>APROBADO</span>}
                                                {alerta.estado === 'RECHAZADO' && <span style={{ background: '#fce8e6', color: '#d93025', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem' }}>RECHAZADO</span>}
                                            </td>
                                            <td style={{ padding: '15px 20px', textAlign: 'center', verticalAlign: 'top' }}>
                                                {alerta.estado === 'PENDIENTE' ? (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexDirection: 'column' }}>
                                                        <button onClick={() => handleAprobar(alerta.id)} style={{ background: '#137333', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: '0.2s' }} title="Autorizar e Ignorar IA"><FaCheck /> Aprobar</button>
                                                        <button onClick={() => handleRechazar(alerta.id)} style={{ background: '#d93025', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: '0.2s' }} title="Bloquear Definitivamente"><FaTimes /> Rechazar</button>
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
