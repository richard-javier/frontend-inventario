import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api.js';
import { FaHistory, FaSearch, FaArrowDown, FaArrowUp, FaCalendarAlt, FaUserTie, FaBox, FaClipboardList, FaFilePdf, FaFileExcel, FaFilter, FaTimes, FaMapMarkerAlt } from 'react-icons/fa'; // <-- ¡Aquí está agregado FaMapMarkerAlt!
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const HistoryPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistorial = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/inventario/historial`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMovimientos(data);
      }
    } catch (error) {
      console.error("Error de red:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorial();
  }, []);

  const movimientosFiltrados = movimientos.filter(mov => {
    const termino = busqueda.toLowerCase().trim();
    const textoGlobal = `${mov.nombre_producto} ${mov.codigo_barras} ${mov.origen_destino} ${mov.documento_motivo} ${mov.responsable} ${mov.tipo_movimiento} ${mov.observaciones}`.toLowerCase();
    const coincideTexto = !busqueda || textoGlobal.includes(termino);

    let coincideFecha = true;
    if (fechaInicio || fechaFin) {
        const fechaMov = new Date(mov.fecha);
        if (fechaInicio) {
            const inicio = new Date(fechaInicio);
            inicio.setHours(0, 0, 0, 0); 
            inicio.setMinutes(inicio.getMinutes() + inicio.getTimezoneOffset());
            if (fechaMov < inicio) coincideFecha = false;
        }
        if (fechaFin) {
            const fin = new Date(fechaFin);
            fin.setHours(23, 59, 59, 999); 
            fin.setMinutes(fin.getMinutes() + fin.getTimezoneOffset());
            if (fechaMov > fin) coincideFecha = false;
        }
    }
    return coincideTexto && coincideFecha;
  });

  const formatearFecha = (fechaSQL) => {
    const fecha = new Date(fechaSQL);
    return fecha.toLocaleString('es-ES', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute:'2-digit' 
    });
  };

  const limpiarFiltros = () => {
      setBusqueda('');
      setFechaInicio('');
      setFechaFin('');
  };

  // PDF
  const generarPDFReporte = () => {
    if (movimientosFiltrados.length === 0) return alert("No hay datos para exportar.");
    const doc = new jsPDF('landscape'); 
    doc.setFontSize(18);
    doc.setTextColor(26, 115, 232);
    doc.text("SINCOT - KARDEX: REPORTE DE INGRESOS Y EGRESOS", 148, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    const periodoTexto = (fechaInicio || fechaFin) ? `Período: ${fechaInicio || 'Inicio'} al ${fechaFin || 'Hoy'}` : `Reporte Histórico Completo`;
    doc.text(periodoTexto, 148, 27, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 148, 33, { align: 'center' });
    doc.line(20, 38, 275, 38);

    const columns = ["Fecha", "Tipo", "Producto", "Cant.", "Origen / Destino", "Documento/Motivo", "Responsable"];
    const rows = movimientosFiltrados.map(mov => [
        formatearFecha(mov.fecha), mov.tipo_movimiento, `${mov.nombre_producto}\n(SKU: ${mov.codigo_barras})`,
        mov.tipo_movimiento === 'INGRESO' ? `+${mov.cantidad}` : `-${mov.cantidad}`,
        mov.origen_destino || 'N/A', mov.documento_motivo || 'N/A', mov.responsable
    ]);

    autoTable(doc, {
      startY: 45, head: [columns], body: rows, theme: 'grid',
      headStyles: { fillColor: [32, 33, 36], textColor: 255 }, styles: { fontSize: 8 },
      columnStyles: { 3: { halign: 'center', fontStyle: 'bold' }, 1: { halign: 'center', fontStyle: 'bold' } },
      didParseCell: function (data) {
          if (data.column.index === 1 && data.section === 'body') data.cell.styles.textColor = data.cell.raw === 'INGRESO' ? [19, 115, 51] : [217, 48, 37];
          if (data.column.index === 3 && data.section === 'body') data.cell.styles.textColor = data.cell.raw.startsWith('+') ? [19, 115, 51] : [217, 48, 37];
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setFontSize(9); doc.text(`Página ${i} de ${pageCount}`, 275, 200, { align: 'right' });
    }
    doc.save(`Kardex_Movimientos_${new Date().getTime()}.pdf`);
  };

  // EXCEL
  const generarExcelReporte = () => {
    if (movimientosFiltrados.length === 0) return alert("No hay datos para exportar.");
    const dataExcel = movimientosFiltrados.map(mov => ({
        "Fecha y Hora": formatearFecha(mov.fecha), "Tipo de Movimiento": mov.tipo_movimiento,
        "Producto": mov.nombre_producto, "SKU / Identificador": mov.codigo_barras,
        "Cantidad": mov.tipo_movimiento === 'INGRESO' ? mov.cantidad : -mov.cantidad,
        "Origen / Destino": mov.origen_destino || 'N/A', "Ref. Documental": mov.documento_motivo || 'N/A',
        "Usuario Responsable": mov.responsable, "Observaciones": mov.observaciones || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kardex");
    XLSX.writeFile(workbook, `Kardex_Movimientos_${new Date().getTime()}.xlsx`);
  };

  const inputStyle = { padding: '12px 15px', borderRadius: '8px', border: '1px solid #5f6368', fontSize: '0.95rem', outline: 'none', backgroundColor: '#202124', color: '#ffffff', flex: 1, colorScheme: 'dark' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#5f6368', textTransform: 'uppercase', marginBottom: '5px' };

  return (
    <div style={{ padding: '25px', background: '#f4f6f8', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', maxWidth: '1400px', margin: '0 auto' }}>
            
            <div style={{ borderBottom: '2px solid #f0f2f5', paddingBottom: '20px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h2 style={{ color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '12px', marginTop: 0, marginBottom: '8px', fontSize: '1.6rem' }}>
                        <div style={{ background: '#e8f0fe', padding: '10px', borderRadius: '10px', color: '#1a73e8' }}><FaHistory /></div>
                        Kardex: Trazabilidad de Movimientos
                    </h2>
                    <p style={{ color: '#5f6368', fontSize: '0.95rem', margin: 0 }}>Registro histórico y auditable de ingresos y salidas físicas de bodega.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={generarExcelReporte} style={{ background: '#e6f4ea', color: '#137333', border: '1px solid #e6f4ea', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }}><FaFileExcel /> Excel</button>
                    <button onClick={generarPDFReporte} style={{ background: '#fce8e6', color: '#d93025', border: '1px solid #fce8e6', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }}><FaFilePdf /> Descargar PDF</button>
                </div>
            </div>

            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #e0e0e0', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
                <div style={{ flex: 2, minWidth: '250px' }}>
                    <label style={labelStyle}>Búsqueda General</label>
                    <div style={{ position: 'relative' }}>
                        <FaSearch style={{ position: 'absolute', left: '16px', top: '14px', color: '#8ab4f8' }} />
                        <input type="text" placeholder="Buscar SKU, responsable, documento..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ ...inputStyle, width: '100%', paddingLeft: '45px', boxSizing: 'border-box' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', flex: 2, minWidth: '300px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}><FaCalendarAlt style={{marginRight: '5px'}}/> Desde la fecha:</label>
                        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}><FaCalendarAlt style={{marginRight: '5px'}}/> Hasta la fecha:</label>
                        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={inputStyle} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {(busqueda || fechaInicio || fechaFin) && (
                        <button onClick={limpiarFiltros} style={{ background: 'transparent', border: '1px solid #dadce0', color: '#5f6368', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}><FaTimes /> Limpiar</button>
                    )}
                    <div style={{ background: '#202124', padding: '12px 20px', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}>{movimientosFiltrados.length} Registros</div>
                </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px', background: 'white' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', color: '#5f6368', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '16px', borderBottom: '2px solid #dadce0' }}>Fecha y Hora</th>
                            <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', textAlign: 'center' }}>Movimiento</th>
                            <th style={{ padding: '16px', borderBottom: '2px solid #dadce0' }}>Producto / SKU</th>
                            <th style={{ padding: '16px', borderBottom: '2px solid #dadce0', textAlign: 'center' }}>Cant.</th>
                            <th style={{ padding: '16px', borderBottom: '2px solid #dadce0' }}>Destino / Ref. Operativa</th>
                            <th style={{ padding: '16px', borderBottom: '2px solid #dadce0' }}>Usuario Resp.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#80868b' }}>Cargando historial auditable...</td></tr>
                        ) : movimientosFiltrados.length > 0 ? (
                            movimientosFiltrados.map((mov, index) => {
                                const esIngreso = mov.tipo_movimiento === 'INGRESO';
                                return (
                                    <tr key={index} style={{ borderBottom: '1px solid #f0f2f5', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                                        <td style={{ padding: '16px', color: '#3c4043', fontWeight: '500', fontSize: '0.9rem' }}>{formatearFecha(mov.fecha)}</td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <span style={{ background: esIngreso ? '#e6f4ea' : '#fce8e6', color: esIngreso ? '#137333' : '#d93025', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                {esIngreso ? <FaArrowDown /> : <FaArrowUp />} {mov.tipo_movimiento}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#202124', fontSize: '0.95rem' }}>{mov.nombre_producto}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#80868b', marginTop: '4px' }}><FaBox style={{display:'inline', marginRight:'4px'}}/>{mov.codigo_barras}</div>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: esIngreso ? '#137333' : '#d93025' }}>
                                            {esIngreso ? '+' : '-'}{mov.cantidad}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: '600', color: '#3c4043' }}><FaMapMarkerAlt style={{display:'inline', color:'#8ab4f8', marginRight:'6px'}}/>{mov.origen_destino || 'N/A'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#5f6368', marginTop: '4px' }}><FaClipboardList style={{display:'inline', color:'#8ab4f8', marginRight:'6px'}}/>Ref: {mov.documento_motivo}</div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f1f3f4', padding: '6px 12px', borderRadius: '8px', color: '#202124', fontSize: '0.9rem', fontWeight: '500' }}>
                                                <FaUserTie color="#8ab4f8" /> {mov.responsable}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#80868b' }}>No se encontraron registros en este período.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default HistoryPage;