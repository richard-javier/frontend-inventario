import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api.js';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaTrash, FaWarehouse, FaFilePdf, FaClipboardCheck, FaBrain, FaExclamationTriangle, FaBarcode, FaSpinner } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { agregarLogoPDF } from '../utils/reportAssets';
import '../css/OutputPage.css'; 

const OutputPage = () => {
    const navigate = useNavigate();
    const [bodegas, setBodegas] = useState([]);
    const [productos, setProductos] = useState([]); 
    const [lotes, setLotes] = useState([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [alertaIA, setAlertaIA] = useState(null);
    const [avisoCorreoIA, setAvisoCorreoIA] = useState(null);

    const [cabecera, setCabecera] = useState(() => {
        const saved = localStorage.getItem('temp_out_cab_simple');
        return saved ? JSON.parse(saved) : { punto_destino: '', motivo: 'VENTA A CLIENTE', transportista: '', placa_vehiculo: '', observaciones: '' };
    });

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
            const [resMaestros, resProd, resLotes] = await Promise.all([
                fetch(`${API_BASE}/inventario/maestros`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/inventario`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/inventario/lotes`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (resMaestros.ok) {
                const dataM = await resMaestros.json();
                if (dataM.bodegas) setBodegas(dataM.bodegas.filter(b => b.id !== 'B00'));
            }
            if (resProd.ok) {
                const dataProd = await resProd.json();
                setProductos(dataProd.filter(p => Number(p.stock_actual) > 0));
            }
            if (resLotes.ok) {
                const dataLotes = await resLotes.json();
                setLotes(Array.isArray(dataLotes) ? dataLotes : []);
            }
        } catch (error) { console.error("Error cargando maestros:", error); }
        finally { setLoadingInitial(false); }
    };

    useEffect(() => { cargarDatos(); }, []);

    const normalizar = (valor) => (valor ?? '').toString().trim().toUpperCase();
    const productoEstaEnBodega = (producto, bodega) => normalizar(producto?.ubicacion_bodega).startsWith(`${bodega}-`);
    const getCodigoUbicacion = (ubicacion = '') => ubicacion.includes('-') ? ubicacion.split('-')[1] : ubicacion;

    const buscarProductoDisponibleDelLote = (lote) => {
        const skuLote = normalizar(lote?.sku);
        const nombreLote = normalizar(lote?.nombre_producto);

        return productos.find(p => (
            Number(p.stock_actual) > 0 &&
            productoEstaEnBodega(p, bodegaOrigen) &&
            (
                normalizar(p.sku) === skuLote ||
                (nombreLote && normalizar(p.nombre_producto) === nombreLote)
            )
        ));
    };

    const buscarPorCodigoEscaneado = (codigo) => {
        const val = normalizar(codigo);

        if (val.startsWith('PLT-') || val.startsWith('MB-')) {
            const campoLote = val.startsWith('PLT-') ? 'lote_pallet' : 'lote_masterbox';
            const lote = lotes
                .filter(l => val.startsWith(normalizar(l[campoLote])))
                .sort((a, b) => normalizar(b[campoLote]).length - normalizar(a[campoLote]).length)[0];
            if (!lote) return null;

            const producto = buscarProductoDisponibleDelLote(lote);
            if (!producto) return { lote, producto: null };

            return { lote, producto };
        }

        const producto = productos.find(p => (
            Number(p.stock_actual) > 0 &&
            productoEstaEnBodega(p, bodegaOrigen) &&
            (normalizar(p.sku) === val || normalizar(p.codigo_barras) === val || normalizar(p.part_number) === val)
        ));

        return producto ? { lote: null, producto } : null;
    };

    const handleScan = (e) => {
        e.preventDefault();
        const val = escaneo.trim().toUpperCase();
        
        if (!val) return;
        if (!bodegaOrigen) return alert("⚠️ Seleccione la Bodega de Origen antes de escanear.");

        if (listaSalida.some(item => normalizar(item.codigo) === val)) {
            setEscaneo('');
            return alert(`❌ El código ${val} ya fue escaneado en esta lista.`);
        }

        const resultadoEscaneo = buscarPorCodigoEscaneado(val);
        if (!resultadoEscaneo) {
            setEscaneo('');
            return alert(`❌ No existe un lote/producto para el código ${val}. Revise que el LPN pertenezca al producto correcto.`);
        }
        if (!resultadoEscaneo.producto) {
            setEscaneo('');
            return alert(`❌ El código ${val} pertenece a un lote, pero ese producto no tiene stock disponible en ${bodegaOrigen}.`);
        }

        const { lote, producto: prodSimulado } = resultadoEscaneo;
        
        let tipoItem = 'UNIDAD/SERIE';
        let cantidadFinal = 1;
        let cantidad_embalaje = 1;
        let embalaje_resumen = '1 UNIDAD';
        let embalaje_desglose = 'Unidad Suelta';
        
        // 🚀 LÓGICA INTELIGENTE CON DESGLOSE LOGÍSTICO Y VALIDACIÓN
        if (val.startsWith('PLT-')) {
            tipoItem = 'PALLET';
            const numPLT = prompt(`📦 ESCANEO DE PALLET\n\n¿Cuántos PALLETS va a retirar bajo el LPN ${val}?`, "1");
            if (!numPLT || isNaN(numPLT) || parseInt(numPLT) <= 0) { setEscaneo(''); return; }

            const mbPorPLT = prompt(`¿Cuántas MASTERBOXES contiene CADA Pallet?`, lote?.total_pallets ? Math.ceil(Number(lote.total_mb || 0) / Number(lote.total_pallets || 1)).toString() : "10");
            if (!mbPorPLT || isNaN(mbPorPLT) || parseInt(mbPorPLT) <= 0) { setEscaneo(''); return; }

            const undPorMB = prompt(`¿Cuántas UNIDADES INDIVIDUALES contiene CADA MasterBox?`, lote?.unidades_por_mb ? lote.unidades_por_mb.toString() : "20");
            if (!undPorMB || isNaN(undPorMB) || parseInt(undPorMB) <= 0) { setEscaneo(''); return; }

            cantidad_embalaje = parseInt(numPLT);
            cantidadFinal = cantidad_embalaje * parseInt(mbPorPLT) * parseInt(undPorMB);
            
            embalaje_resumen = `${cantidad_embalaje} PALLET(S)`;
            embalaje_desglose = `${cantidad_embalaje} PLT -> ${parseInt(mbPorPLT)} MB/PLT -> ${parseInt(undPorMB)} Uds/MB`;

        } else if (val.startsWith('MB-')) {
            tipoItem = 'MASTERBOX';
            const numMB = prompt(`📦 ESCANEO DE MASTERBOX\n\n¿Cuántas MASTERBOXES va a retirar bajo este código?`, "1");
            if (!numMB || isNaN(numMB) || parseInt(numMB) <= 0) { setEscaneo(''); return; }

            const numUnd = prompt(`¿Cuántas UNIDADES INDIVIDUALES contiene CADA MasterBox?`, lote?.unidades_por_mb ? lote.unidades_por_mb.toString() : "20");
            if (!numUnd || isNaN(numUnd) || parseInt(numUnd) <= 0) { setEscaneo(''); return; }

            cantidad_embalaje = parseInt(numMB);
            cantidadFinal = cantidad_embalaje * parseInt(numUnd);
            
            embalaje_resumen = `${cantidad_embalaje} MASTERBOX(ES)`;
            embalaje_desglose = `${cantidad_embalaje} MB -> ${parseInt(numUnd)} Uds/MB`;
        }

        if (cantidadFinal > Number(prodSimulado.stock_actual)) {
            setEscaneo('');
            return alert(`❌ Stock insuficiente en ${bodegaOrigen}. Disponible: ${prodSimulado.stock_actual} unidades para ${prodSimulado.nombre_producto}.`);
        }

        const ubicacionLimpia = prodSimulado.ubicacion_bodega && prodSimulado.ubicacion_bodega !== 'Por Asignar'
            ? getCodigoUbicacion(prodSimulado.ubicacion_bodega)
            : 'Sin Asignar';

        const nuevoItem = {
            id: new Date().getTime(),
            id_producto: prodSimulado.id_producto,
            nombre_producto: prodSimulado.nombre_producto,
            sku: prodSimulado.sku,
            codigo: val,
            tipo: tipoItem,
            ubicacion_extraccion: ubicacionLimpia,
            embalaje_resumen: embalaje_resumen,
            embalaje_desglose: embalaje_desglose,
            cantidad: cantidadFinal, // Cantidad en unidades ya multiplicada
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
            const response = await fetch(`${API_BASE}/inventario/salida`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload) 
            });
            
            if (!response.ok) {
                const textResponse = await response.text();
                let errorData;
                try { errorData = JSON.parse(textResponse); } 
                catch { return alert(`❌ Error del Servidor: ${textResponse}`); }
                
                if (errorData.message && errorData.message.includes("ALERTA DE IA")) {
                    setAlertaIA(errorData.message);
                    setAvisoCorreoIA(errorData.correo_enviado === false ? (errorData.correo_mensaje || 'No se pudo enviar el correo de auditoría IA.') : null);
                    return; 
                }
                return alert(`❌ Error: ${errorData.message}`);
            }

            const dataSalida = await response.json();
            const numeroEgreso = dataSalida.numero_egreso || `NE-${Date.now()}`;

            alert("✅ DESPACHO Y EXTRACCIÓN PROCESADOS CORRECTAMENTE.");
            setAlertaIA(null);
            setAvisoCorreoIA(null);

            const guiaRemision = {
                numero_guia: `GUI-${numeroEgreso.replace(/[^A-Z0-9]/gi, '-')}`,
                numero_egreso: numeroEgreso,
                fecha_emision: new Date().toISOString().split('T')[0],
                fecha_inicio_traslado: new Date().toISOString().split('T')[0],
                fecha_fin_traslado: new Date().toISOString().split('T')[0],
                emisor_nombre: 'ZB SOLUCIONES S.A.S.',
                ruc_empresa: '0993378674001',
                matriz: 'GUAYAS / GUAYAQUIL / GUAYAQUIL / N/A Y SOLAR 20',
                correo_empresa: 'ventas03@zbsoluciones.com',
                telefono_empresa: '099720152',
                punto_partida: '',
                punto_destino: cabecera.punto_destino,
                codigo_destino: '',
                telefono: '',
                motivo: cabecera.motivo,
                descripcion: '',
                transportista: cabecera.transportista,
                ruc_transportista: '',
                placa_vehiculo: cabecera.placa_vehiculo,
                correo_transportista: '',
                destinatario: cabecera.punto_destino,
                ruc_destinatario: '',
                direccion_destinatario: cabecera.punto_destino,
                correo_destinatario: '',
                ruta: '',
                doc_sustento: numeroEgreso,
                fecha_emision_doc_sustento: new Date().toISOString().split('T')[0],
                observaciones: cabecera.observaciones,
                items: listaSalida,
                firmas: {
                    entregadoPor: '',
                    recibidoTransportista: '',
                    recibidoCliente: ''
                }
            };
            localStorage.setItem('ultima_guia_remision', JSON.stringify(guiaRemision));
            
            generarPDFSalida(cabecera, bodegaOrigen, listaSalida, numeroEgreso); 
            
            setListaSalida([]); setBodegaOrigen(''); 
            setCabecera({ punto_destino: '', motivo: 'VENTA A CLIENTE', transportista: '', placa_vehiculo: '', observaciones: '' });
            localStorage.removeItem('temp_out_cab_simple');
            localStorage.removeItem('temp_out_list_simple');
            await cargarDatos(); 
            navigate('/remission-guide');
            
        } catch (error) { 
            console.error("Error en React:", error);
            alert(`Error interno en el navegador: ${error.message}`); 
        }
    };

    // 🚀 GENERADOR DE PDF (SÓLO COPIA COMERCIAL)
    const generarPDFSalida = (infoCabecera, bodegaOG, items, numeroEgreso = 'NE-SIN-SECUENCIAL') => {
        try {
            const doc = new jsPDF();
            const fechaActual = new Date().toLocaleString('es-EC');
            const totalUnidades = items.reduce((acc, i) => acc + parseInt(i.cantidad), 0);

            // ==========================================
            // NOTA PÚBLICA (COPIA CLIENTE)
            // ==========================================
            agregarLogoPDF(doc, { x: 20, y: 7, width: 28, height: 18 });
            doc.setFontSize(22); doc.setTextColor(217, 48, 37); doc.text("ZB SOLUCIONES SAS", 105, 15, { align: 'center' });
            doc.setFontSize(14); doc.setTextColor(32, 33, 36); doc.text("NOTA DE EGRESO", 105, 23, { align: 'center' });
            doc.setFontSize(10); doc.setTextColor(217, 48, 37); doc.text(numeroEgreso, 105, 29, { align: 'center' });
            doc.setFontSize(9); doc.setTextColor(100); doc.text("Documento de despacho y trazabilidad", 105, 34, { align: 'center' });
            doc.line(20, 38, 190, 38);

            doc.setFontSize(10); doc.setTextColor(0); doc.setFont('', 'bold'); doc.text("DATOS LOGÍSTICOS:", 20, 46); doc.setFont('', 'normal');
            doc.text(`Destino / Cliente: ${infoCabecera.punto_destino}`, 20, 52);
            doc.text(`Motivo de Salida: ${infoCabecera.motivo}`, 20, 58);
            doc.text(`Transportista: ${infoCabecera.transportista || 'N/A'}`, 20, 64);
            doc.text(`Fecha y Hora: ${fechaActual}`, 130, 52);

            // Columnas limpias, sin SKUs, LPNs ni ubicaciones
            const colPub = ["Item", "Producto / Descripción", "Embalaje Comercial", "Cant. Uds", "Subtotal"];
            const rowPub = items.map((item, index) => [ (index+1).toString(), item.nombre_producto, item.embalaje_resumen, `${item.cantidad}`, `$${(item.cantidad * item.precio).toFixed(2)}` ]);

            autoTable(doc, { 
                startY: 72, head: [colPub], body: rowPub, theme: 'grid', 
                headStyles: { fillColor: [217, 48, 37], textColor: 255 }, 
                styles: { fontSize: 8, cellPadding: 4 }, 
                columnStyles: { 3: { halign: 'center' }, 4: { halign: 'right', fontStyle: 'bold' } } 
            });

            let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 100;
            doc.setFont('', 'bold'); doc.text(`TOTAL PIEZAS ENTREGADAS: ${totalUnidades}`, 20, finalY);
            doc.setFont('', 'normal'); doc.text("Observaciones:", 20, finalY + 15); doc.setFontSize(9); doc.setTextColor(80); doc.text(infoCabecera.observaciones || "Ninguna.", 20, finalY + 22, { maxWidth: 170 });
            doc.setTextColor(0); doc.text("_________________________", 25, finalY + 55); doc.text("Entregado por", 38, finalY + 60); doc.text("_________________________", 145, finalY + 55); doc.text("Recibido Conforme", 152, finalY + 60);

            doc.save(`${numeroEgreso}_Nota_Egreso.pdf`);
        } catch (pdfError) {
            console.error("Error generando PDF:", pdfError);
            alert("El despacho se guardó en BD, pero falló la generación del PDF.");
        }
    };

    if (loadingInitial) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#d93025" /></div>;

    return (
        <div className="out-container">
            
            {alertaIA && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(14, 18, 27, 0.78)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
                    <div style={{ background: '#ffffff', borderRadius: '8px', maxWidth: '720px', width: '100%', textAlign: 'left', overflow: 'hidden', boxShadow: '0 26px 70px rgba(0, 0, 0, 0.34)', border: '1px solid rgba(255,255,255,0.72)' }}>
                        <div style={{ background: '#b3261e', color: 'white', padding: '18px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 800, fontSize: '0.95rem' }}>
                                <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                                    <FaExclamationTriangle />
                                </span>
                                <span>OPERACIÓN BLOQUEADA POR I.A.</span>
                            </div>
                            <span style={{ border: '1px solid rgba(255,255,255,0.45)', borderRadius: '999px', padding: '6px 10px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>AUDITORÍA PENDIENTE</span>
                        </div>

                        <div style={{ padding: '34px 40px 36px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '22px' }}>
                                <div style={{ width: '76px', height: '76px', borderRadius: '18px', background: '#fce8e6', color: '#b3261e', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                                    <FaBrain size="2.45em" />
                                </div>
                                <div>
                                    <h2 style={{ color: '#202124', fontSize: '1.6rem', lineHeight: 1.15, margin: '2px 0 8px 0', letterSpacing: 0 }}>Despacho retenido</h2>
                                    <p style={{ color: '#5f6368', fontSize: '0.98rem', lineHeight: 1.55, margin: 0 }}>El modelo de anomalías detuvo esta salida antes de descontar inventario. La operación requiere revisión y aprobación de Gerencia.</p>
                                </div>
                            </div>

                            <div style={{ background: '#fff5f4', padding: '18px 20px', borderRadius: '8px', margin: '26px 0 18px', border: '1px solid #f4b8b3' }}>
                                <div style={{ color: '#8c1d18', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Detalle de seguridad</div>
                                <p style={{ color: '#b3261e', fontSize: '0.95rem', lineHeight: 1.55, margin: 0 }}>{alertaIA}</p>
                                {avisoCorreoIA && <p style={{ color: '#8c1d18', fontSize: '0.9rem', lineHeight: 1.45, margin: '10px 0 0 0', fontWeight: 700 }}>{avisoCorreoIA}</p>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', margin: '0 0 28px' }}>
                                <div style={{ background: '#f8fafd', border: '1px solid #e3e8ef', borderRadius: '8px', padding: '12px 14px' }}>
                                    <strong style={{ display: 'block', color: '#202124', fontSize: '0.82rem', marginBottom: '4px' }}>Inventario</strong>
                                    <span style={{ color: '#5f6368', fontSize: '0.82rem' }}>Sin descuento</span>
                                </div>
                                <div style={{ background: '#f8fafd', border: '1px solid #e3e8ef', borderRadius: '8px', padding: '12px 14px' }}>
                                    <strong style={{ display: 'block', color: '#202124', fontSize: '0.82rem', marginBottom: '4px' }}>Correo</strong>
                                    <span style={{ color: '#5f6368', fontSize: '0.82rem' }}>Gerencia notificada</span>
                                </div>
                                <div style={{ background: '#f8fafd', border: '1px solid #e3e8ef', borderRadius: '8px', padding: '12px 14px' }}>
                                    <strong style={{ display: 'block', color: '#202124', fontSize: '0.82rem', marginBottom: '4px' }}>Estado</strong>
                                    <span style={{ color: '#5f6368', fontSize: '0.82rem' }}>Pendiente de autorización</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setAlertaIA(null); setAvisoCorreoIA(null); setListaSalida([]); setEscaneo(''); }} style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '13px 28px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', minWidth: '150px', boxShadow: '0 10px 22px rgba(26, 115, 232, 0.25)' }}>Entendido</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="out-card-main">
                <div className="out-header">
                    <h2 className="out-title"><div className="out-icon-wrapper"><FaSignOutAlt /></div> Despacho Rápido de Mercadería</h2>
                </div>

                <div className="out-box" style={{ background: 'white', marginBottom: '25px' }}>
                    <h3 style={{ marginTop: 0, color: '#d93025', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #f0f2f5', paddingBottom: '10px' }}><FaClipboardCheck /> 1. Datos del Destino</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div><label className="out-label">Destino / Cliente *</label><input type="text" value={cabecera.punto_destino} onChange={e => setCabecera({...cabecera, punto_destino: e.target.value})} className="out-input" style={{borderColor: '#d93025'}} /></div>
                        <div><label className="out-label">Motivo</label><select value={cabecera.motivo} onChange={e => setCabecera({...cabecera, motivo: e.target.value})} className="out-input"><option>VENTA A CLIENTE FINAL</option><option>TRANSFERENCIA EXTERNA</option><option>DEVOLUCION A PROVEEDOR</option><option>MANTENIMIENTO/REPARACION</option></select></div>
                        <div><label className="out-label">Transportista</label><input type="text" value={cabecera.transportista} onChange={e => setCabecera({...cabecera, transportista: e.target.value})} className="out-input" /></div>
                        <div><label className="out-label">Placa Vehículo</label><input type="text" value={cabecera.placa_vehiculo} onChange={e => setCabecera({...cabecera, placa_vehiculo: e.target.value})} className="out-input" /></div>
                    </div>
                </div>

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

                <div style={{ border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden', marginBottom: '25px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa', color: '#5f6368', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '15px' }}>LPN / Serie</th>
                                <th style={{ padding: '15px' }}>Producto Detalle</th>
                                <th style={{ padding: '15px', color: '#1a73e8' }}>Desglose Físico</th>
                                <th style={{ padding: '15px', textAlign: 'center', width: '100px' }}>Cant. Total</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Quitar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaSalida.length === 0 ? (
                                <tr><td colSpan="5" style={{textAlign:'center', padding:'40px', color:'#9aa0a6'}}>Escanee productos para preparar la extracción y despacho.</td></tr>
                            ) : (
                                listaSalida.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f0f2f5' }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold', color: '#202124', fontSize: '1.1rem' }}>
                                        <span className={item.tipo === 'PALLET' ? 'tag-pallet' : item.tipo === 'MASTERBOX' ? 'tag-masterbox' : 'tag-unidad'} style={{display: 'block', marginBottom: '5px', width: 'fit-content'}}>
                                            {item.tipo}
                                        </span>
                                        {item.codigo}
                                    </td>
                                    <td style={{ padding: '15px', color: '#5f6368' }}>{item.nombre_producto} <br/><small>{item.sku}</small></td>
                                    <td style={{ padding: '15px', fontWeight: 'bold', color: '#1a73e8' }}>
                                        {item.embalaje_desglose}<br/>
                                        <small style={{color: '#9aa0a6'}}>Extracción: {item.ubicacion_extraccion}</small>
                                    </td>
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
