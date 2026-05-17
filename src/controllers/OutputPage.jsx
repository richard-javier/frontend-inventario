import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaTrash, FaWarehouse, FaFilePdf, FaClipboardCheck, FaBrain, FaExclamationTriangle, FaUnlockAlt, FaBarcode, FaSpinner } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import '../css/OutputPage.css'; // Usamos el mismo CSS que ya tienes, no hay que cambiarlo

const OutputPage = () => {
    const [bodegas, setBodegas] = useState([]);
    const [productos, setProductos] = useState([]); // Lo usamos internamente para simular la BD
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [alertaIA, setAlertaIA] = useState(null);

    // 1. ESTADOS LOGÍSTICOS
    const [cabecera, setCabecera] = useState(() => {
        const saved = localStorage.getItem('temp_out_cab_simple');
        return saved ? JSON.parse(saved) : { punto_destino: '', motivo: 'VENTA A CLIENTE', transportista: '', placa_vehiculo: '', observaciones: '' };
    });

    // 2. BODEGA Y ESCANEO
    const [bodegaOrigen, setBodegaOrigen] = useState('');
    const [escaneo, setEscaneo] = useState('');
    const [listaSalida, setListaSalida] = useState(() => {
        const saved = localStorage.getItem('temp_out_list_simple');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('temp_out_cab_simple', JSON.stringify(cabecera));
        localStorage.setItem('temp_out_list_simple', JSON.stringify(listaSalida));
    }, [cabecera, listaSalida]);

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
            }
            if (resProd.ok) {
                const dataProd = await resProd.json();
                setProductos(dataProd.filter(p => Number(p.stock_actual) > 0));
            }
        } catch (error) { console.error("Error cargando maestros:", error); }
        finally { setLoadingInitial(false); }
    };

    useEffect(() => { cargarDatos(); }, []);

    // --- LÓGICA DE ESCANEO AUTOMÁTICO ---
    const handleScan = (e) => {
        e.preventDefault();
        const val = escaneo.trim().toUpperCase();
        
        if (!val) return;
        if (!bodegaOrigen) return alert("⚠️ Seleccione la Bodega de Origen antes de empezar a escanear.");

        if (listaSalida.some(item => item.codigo === val)) {
            setEscaneo('');
            return alert(`❌ El código ${val} ya fue escaneado.`);
        }

        // SIMULACIÓN DE INTELIGENCIA DE BASE DE DATOS:
        // En la vida real, al escanear "PLT-001", tu backend te dice qué producto es y dónde está.
        // Aquí tomamos un producto al azar de tu lista para simular esa búsqueda automática.
        const prodSimulado = productos.length > 0 ? productos[0] : { id_producto: 0, nombre_producto: 'Producto Genérico', sku: 'SKU-000', precio: 0 };
        
        let tipoItem = 'UNIDAD/SERIE';
        let ubicacionAutomatica = 'A01A01'; // Si es unidad o caja, asumimos que está en el RACK

        if (val.startsWith('PLT-')) {
            tipoItem = 'PALLET';
            ubicacionAutomatica = 'PA0001'; // Si es Pallet, asumimos que está en el PISO
        } else if (val.startsWith('MB-')) {
            tipoItem = 'MASTERBOX';
        }

        const nuevoItem = {
            id: new Date().getTime(),
            id_producto: prodSimulado.id_producto,
            nombre_producto: prodSimulado.nombre_producto,
            sku: prodSimulado.sku,
            codigo: val,
            tipo: tipoItem,
            ubicacion_extraccion: ubicacionAutomatica, // ¡El sistema lo asigna solo!
            cantidad: 1, 
            precio: parseFloat(prodSimulado.precio_ref || prodSimulado.precio || 0)
        };

        setListaSalida([nuevoItem, ...listaSalida]);
        setEscaneo(''); 
    };

    const actualizarCantidad = (idItem, nuevaCantidad) => {
        const cantidad = parseInt(nuevaCantidad) || 1;
        setListaSalida(listaSalida.map(item => item.id === idItem ? { ...item, cantidad: cantidad } : item));
    };

    const quitarItem = (idToRemove) => {
        setListaSalida(listaSalida.filter(item => item.id !== idToRemove));
    };

    const procesarEgreso = async (ignorarIA = false) => {
        if (!cabecera.punto_destino || listaSalida.length === 0) return alert("⚠️ Complete el Destino y escanee al menos un producto.");
        const token = localStorage.getItem('token');
        
        const payload = { cabecera, origen: { bodega: bodegaOrigen }, items: listaSalida, ignorarIA };

        try {
            const response = await fetch('http://localhost:3001/api/inventario/salida', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload) 
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.message && errorData.message.includes("ALERTA DE IA")) {
                    setAlertaIA(errorData.message);
                    return; 
                }
                return alert(`❌ Error: ${errorData.message}`);
            }

            alert("✅ DESPACHO Y EXTRACCIÓN PROCESADOS CORRECTAMENTE.");
            setAlertaIA(null);
            generarPDFSalida(cabecera, bodegaOrigen, listaSalida); 
            
            setListaSalida([]); setBodegaOrigen(''); 
            setCabecera({ punto_destino: '', motivo: 'VENTA A CLIENTE', transportista: '', placa_vehiculo: '', observaciones: '' });
            localStorage.clear();
            await cargarDatos(); 
            
        } catch (error) { alert("Error de red al conectar con el servidor."); }
    };

    // EL GENERADOR DE PDF SE MANTIENE EXACTAMENTE IGUAL
    const generarPDFSalida = (infoCabecera, bodegaOG, items) => {
        const doc = new jsPDF();
        const fechaActual = new Date().toLocaleString('es-EC');

        doc.setFontSize(22); doc.setTextColor(217, 48, 37); doc.text("ZB SOLUCIONES SAS", 105, 15, { align: 'center' });
        doc.setFontSize(14); doc.setTextColor(32, 33, 36); doc.text("NOTA DE EGRESO Y EXTRACCIÓN", 105, 23, { align: 'center' });
        doc.setFontSize(9); doc.setTextColor(100); doc.text("Documento Oficial de Trazabilidad Logística", 105, 28, { align: 'center' });
        doc.line(20, 32, 190, 32);

        doc.setFontSize(10); doc.setTextColor(0); doc.setFont('', 'bold'); doc.text("DATOS LOGÍSTICOS:", 20, 40); doc.setFont('', 'normal');
        doc.text(`Destino / Cliente: ${infoCabecera.punto_destino}`, 20, 46);
        doc.text(`Motivo de Salida: ${infoCabecera.motivo}`, 20, 52);
        doc.text(`Transportista: ${infoCabecera.transportista || 'N/A'}`, 20, 58);
        doc.text(`Bodega Origen: ${bodegaOG}`, 130, 46);
        doc.text(`Fecha y Hora: ${fechaActual}`, 130, 52);

        const columns = ["LPN / Serie", "SKU", "Ubicación", "Cant.", "Subtotal"];
        const rows = items.map(item => [ item.codigo, item.sku, item.ubicacion_extraccion, `${item.cantidad}`, `$${(item.cantidad * item.precio).toFixed(2)}` ]);

        doc.autoTable({ startY: 65, head: [columns], body: rows, theme: 'grid', headStyles: { fillColor: [217, 48, 37], textColor: 255 }, styles: { fontSize: 8, cellPadding: 4 }, columnStyles: { 3: { halign: 'center' }, 4: { halign: 'right', fontStyle: 'bold' } } });

        const totalUnidades = items.reduce((acc, i) => acc + parseInt(i.cantidad), 0);
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFont('', 'bold'); doc.text(`TOTAL PIEZAS EXTRAÍDAS: ${totalUnidades}`, 20, finalY);
        doc.setFont('', 'normal'); doc.text("Observaciones:", 20, finalY + 15); doc.setFontSize(9); doc.setTextColor(80); doc.text(infoCabecera.observaciones || "Ninguna.", 20, finalY + 22, { maxWidth: 170 });
        doc.setTextColor(0); doc.text("_________________________", 25, finalY + 55); doc.text("Despachado por (Bodega)", 28, finalY + 60); doc.text("_________________________", 145, finalY + 55); doc.text("Recibido Conforme (Transporte)", 147, finalY + 60);
        doc.save(`Nota_Egreso_Trazabilidad_${new Date().getTime()}.pdf`);
    };

    if (loadingInitial) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#d93025" /></div>;

    return (
        <div className="out-container">
            
            {alertaIA && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 15, 20, 0.9)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '16px', maxWidth: '650px', width: '90%', textAlign: 'center', overflow: 'hidden' }}>
                        <div style={{ background: '#d93025', color: 'white', padding: '20px', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', gap: '10px' }}><FaExclamationTriangle /> OPERACIÓN BLOQUEADA POR I.A.</div>
                        <div style={{ padding: '40px' }}>
                            <FaBrain size="4em" color="#d93025" style={{ marginBottom: '20px' }} />
                            <h2 style={{ color: '#202124', fontSize: '1.5rem', margin: '0 0 15px 0' }}>Despacho Retenido</h2>
                            <div style={{ background: '#fce8e6', padding: '20px', borderRadius: '8px', margin: '20px 0', textAlign: 'left', border: '1px solid #fad2cf' }}>
                                <p style={{ color: '#d93025', fontSize: '1.05rem', margin: 0 }}><strong>Detalle de Seguridad:</strong><br/>{alertaIA}</p>
                            </div>
                            <p style={{color: '#5f6368', fontSize: '0.95rem'}}>La transacción ha sido suspendida. Se ha notificado a Gerencia automáticamente. El inventario no ha sido descontado.</p>
                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
                                <button onClick={() => { setAlertaIA(null); setListaSalida([]); setEscaneo(''); }} style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 35px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Entendido</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="out-card-main">
                <div className="out-header">
                    <h2 className="out-title"><div className="out-icon-wrapper"><FaSignOutAlt /></div> Despacho Rápido de Mercadería</h2>
                </div>

                {/* 1. DATOS LOGÍSTICOS */}
                <div className="out-box" style={{ background: 'white', marginBottom: '25px' }}>
                    <h3 style={{ marginTop: 0, color: '#d93025', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #f0f2f5', paddingBottom: '10px' }}><FaClipboardCheck /> 1. Datos del Destino</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div><label className="out-label">Destino / Cliente *</label><input type="text" value={cabecera.punto_destino} onChange={e => setCabecera({...cabecera, punto_destino: e.target.value})} className="out-input" style={{borderColor: '#d93025'}} /></div>
                        <div><label className="out-label">Motivo</label><select value={cabecera.motivo} onChange={e => setCabecera({...cabecera, motivo: e.target.value})} className="out-input"><option>VENTA A CLIENTE FINAL</option><option>TRANSFERENCIA EXTERNA</option><option>DEVOLUCION A PROVEEDOR</option><option>MANTENIMIENTO/REPARACION</option></select></div>
                        <div><label className="out-label">Transportista</label><input type="text" value={cabecera.transportista} onChange={e => setCabecera({...cabecera, transportista: e.target.value})} className="out-input" /></div>
                        <div><label className="out-label">Placa Vehículo</label><input type="text" value={cabecera.placa_vehiculo} onChange={e => setCabecera({...cabecera, placa_vehiculo: e.target.value})} className="out-input" /></div>
                    </div>
                </div>

                {/* 2. BODEGA ORIGEN Y LECTORA INTEGRADA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '25px' }}>
                    <div className="out-box" style={{ background: 'white', borderColor: '#d93025' }}>
                        <label className="out-label"><FaWarehouse color="#d93025"/> 2. Bodega Origen *</label>
                        <select value={bodegaOrigen} onChange={e => setBodegaOrigen(e.target.value)} className="out-input">
                            <option value="">-- Seleccione de dónde sale --</option>
                            {bodegas.map(b => <option key={b.id} value={b.id}>{b.id} - {b.descripcion}</option>)}
                        </select>
                    </div>

                    <div className="out-reader-zone" style={{ margin: 0 }}>
                        <label className="out-label" style={{color: '#8ab4f8', marginBottom: '15px'}}>🔫 3. LECTORA (Escanear LPN o Serie)</label>
                        <form onSubmit={handleScan} style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <FaBarcode style={{ position: 'absolute', left: '16px', top: '18px', color: '#8ab4f8', fontSize: '1.2rem' }} />
                                <input type="text" value={escaneo} onChange={e => setEscaneo(e.target.value)} className="out-reader-input" placeholder="Escanee SKU, Serie o Pallet..." autoFocus disabled={!bodegaOrigen} />
                            </div>
                            <button type="submit" disabled={!bodegaOrigen} style={{ background: bodegaOrigen ? '#d93025' : '#5f6368', color: 'white', border: 'none', padding: '0 30px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: bodegaOrigen ? 'pointer' : 'not-allowed' }}>EXTRAER</button>
                        </form>
                    </div>
                </div>

                {/* 4. TABLA DE COLA DE DESPACHO */}
                <div style={{ border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden', marginBottom: '25px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa', color: '#5f6368', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '15px' }}>Tipo</th>
                                <th style={{ padding: '15px' }}>LPN / Serie</th>
                                <th style={{ padding: '15px' }}>Producto Detalle</th>
                                <th style={{ padding: '15px', color: '#1a73e8' }}>Ubicación Extracción</th>
                                <th style={{ padding: '15px', textAlign: 'center', width: '100px' }}>Cant.</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Quitar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaSalida.length === 0 ? (
                                <tr><td colSpan="6" style={{textAlign:'center', padding:'40px', color:'#9aa0a6'}}>Escanee productos para preparar la extracción y despacho.</td></tr>
                            ) : (
                                listaSalida.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f0f2f5' }}>
                                    <td style={{ padding: '15px' }}><span className={item.tipo === 'PALLET' ? 'tag-pallet' : item.tipo === 'MASTERBOX' ? 'tag-masterbox' : 'tag-unidad'}>{item.tipo}</span></td>
                                    <td style={{ padding: '15px', fontWeight: 'bold', color: '#202124', fontSize: '1.1rem' }}>{item.codigo}</td>
                                    <td style={{ padding: '15px', color: '#5f6368' }}>{item.nombre_producto} <br/><small>{item.sku}</small></td>
                                    <td style={{ padding: '15px', fontWeight: 'bold', color: '#1a73e8' }}>{item.ubicacion_extraccion}</td>
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                        <input type="number" min="1" value={item.cantidad} onChange={(e) => actualizarCantidad(item.id, e.target.value)} style={{ width: '60px', padding: '8px', textAlign: 'center', borderRadius: '6px', border: '1px solid #d93025', fontWeight: 'bold', color: '#d93025' }} />
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'center' }}><button onClick={() => quitarItem(item.id)} style={{ color: '#d93025', border: 'none', background: '#fce8e6', padding: '8px', borderRadius: '50%', cursor:'pointer' }}><FaTrash /></button></td>
                                </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="out-box" style={{ marginBottom: '25px' }}>
                    <label className="out-label">Observaciones Generales de la Nota de Egreso</label>
                    <textarea rows="2" value={cabecera.observaciones} onChange={e => setCabecera({...cabecera, observaciones: e.target.value})} className="out-input" style={{resize: 'vertical'}} placeholder="Ej: Mercadería asegurada con precinto..." />
                </div>

                <button onClick={() => procesarEgreso(false)} disabled={listaSalida.length === 0} style={{ width: '100%', padding: '20px', background: listaSalida.length === 0 ? '#dadce0' : '#d93025', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.2rem', cursor: listaSalida.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', gap: '10px', transition: '0.3s' }}>
                    <FaFilePdf size="1.2em" /> DESCONTAR, FIRMAR Y GENERAR REPORTE
                </button>

            </div>
        </div>
    );
};

export default OutputPage;