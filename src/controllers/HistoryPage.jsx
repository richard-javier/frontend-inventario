import React, { useState, useEffect } from 'react';
import { FaHistory, FaSearch, FaArrowDown, FaArrowUp, FaCalendarAlt, FaUserTie, FaBox, FaClipboardList, FaFilePdf } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const HistoryPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistorial = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:3001/api/inventario/historial', {
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

  // Buscador multifuncional
  const movimientosFiltrados = movimientos.filter(mov => {
    if (!busqueda) return true;
    const termino = busqueda.toLowerCase().trim();
    const textoGlobal = `${mov.nombre_producto} ${mov.codigo_barras} ${mov.origen_destino} ${mov.documento_motivo} ${mov.responsable} ${mov.tipo_movimiento} ${mov.observaciones}`.toLowerCase();
    return textoGlobal.includes(termino);
  });

  const formatearFecha = (fechaSQL) => {
    const fecha = new Date(fechaSQL);
    return fecha.toLocaleString('es-ES', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute:'2-digit' 
    });
  };

  // --- NUEVA FUNCIÓN: GENERAR REPORTE PDF DEL KARDEX ---
  const generarPDFReporte = () => {
    if (movimientosFiltrados.length === 0) {
        return alert("No hay datos para exportar.");
    }

    const doc = new jsPDF('landscape'); // 'landscape' para que la tabla ancha quepa bien

    // Encabezado Corporativo
    doc.setFontSize(18);
    doc.setTextColor(26, 115, 232);
    doc.text("SINCOT - REPORTE DE INGRESOS Y EGRESOS DE PRODUCTOS", 148, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Sistema de Gestión de Inventarios.", 148, 27, { align: 'center' });
    doc.text(`Fecha del Reporte: ${new Date().toLocaleString()}`, 148, 33, { align: 'center' });
    doc.line(20, 38, 275, 38);

    // Preparar los datos para la tabla
    const columns = ["Fecha", "Tipo", "Producto", "Cant.", "Origen / Destino", "Documento/Motivo", "Responsable"];
    const rows = movimientosFiltrados.map(mov => [
        formatearFecha(mov.fecha),
        mov.tipo_movimiento,
        `${mov.nombre_producto}\n(${mov.codigo_barras})`,
        mov.tipo_movimiento === 'INGRESO' ? `+${mov.cantidad}` : `-${mov.cantidad}`,
        mov.origen_destino || 'N/A',
        mov.documento_motivo || 'N/A',
        mov.responsable
    ]);

    autoTable(doc, {
      startY: 45,
      head: [columns],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [33, 37, 41] }, // Gris oscuro para profesionalismo
      styles: { fontSize: 8 },
      columnStyles: {
          3: { halign: 'center', fontStyle: 'bold' }, // Cantidad centrada y negrita
          1: { halign: 'center' }
      },
      didParseCell: function (data) {
          // Pintar verde los ingresos y rojo las salidas en el PDF
          if (data.column.index === 1 && data.section === 'body') {
              if (data.cell.raw === 'INGRESO') {
                  data.cell.styles.textColor = [19, 115, 51]; // Verde
              } else {
                  data.cell.styles.textColor = [217, 48, 37]; // Rojo
              }
          }
      }
    });

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.text(`Página ${i} de ${pageCount}`, 275, 200, { align: 'right' });
    }

    doc.save(`Reporte_HISTORIAL_SINCOT_${new Date().getTime()}.pdf`);
  };

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      
      {/* CABECERA */}
      <div style={{ borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <h2 style={{ color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '5px' }}>
                <FaHistory /> Historial de Movimientos De Productos.
            </h2>
            <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
                Registro de trazabilidad de entradas y salidas.
            </p>
        </div>
        {/* BOTÓN NUEVO PARA PDF */}
        <button 
            onClick={generarPDFReporte}
            style={{ background: '#d93025', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 4px rgba(217, 48, 37, 0.3)' }}
        >
            <FaFilePdf /> DESCARGAR REPORTE PDF
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FaSearch style={{ position: 'absolute', left: '15px', top: '12px', color: '#1a73e8' }} />
          <input 
            type="text" 
            placeholder="Buscar por producto, código, proveedor, responsable..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ background: '#343a40', padding: '10px 20px', borderRadius: '6px', color: 'white', fontWeight: 'bold' }}>
            {movimientosFiltrados.length} Registros
        </div>
      </div>

      {/* TABLA DE KARDEX */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
          <thead>
            <tr style={{ background: '#343a40', color: 'white', textAlign: 'left', fontSize: '0.9rem' }}>
              <th style={{ padding: '12px' }}><FaCalendarAlt /> Fecha y Hora</th>
              <th style={{ padding: '12px' }}>Tipo</th>
              <th style={{ padding: '12px' }}><FaBox /> Producto / Código</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Cant.</th>
              <th style={{ padding: '12px' }}><FaClipboardList /> Origen / Destino / Documento</th>
              <th style={{ padding: '12px' }}><FaUserTie /> Usuario Resp.</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center' }}>Cargando historial...</td></tr>
            ) : movimientosFiltrados.length > 0 ? (
              movimientosFiltrados.map((mov, index) => {
                const esIngreso = mov.tipo_movimiento === 'INGRESO';
                
                return (
                  <tr key={index} style={{ borderBottom: '1px solid #eee', fontSize: '0.9rem', background: index % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                    
                    <td style={{ padding: '12px', color: '#555', fontWeight: '500' }}>
                        {formatearFecha(mov.fecha)}
                    </td>
                    
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                          background: esIngreso ? '#e6f4ea' : '#fce8e6', 
                          color: esIngreso ? '#137333' : '#c5221f', 
                          padding: '5px 10px', 
                          borderRadius: '20px', 
                          fontWeight: 'bold', 
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                      }}>
                        {esIngreso ? <FaArrowDown /> : <FaArrowUp />}
                        {mov.tipo_movimiento}
                      </span>
                    </td>
                    
                    <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>{mov.nombre_producto}</div>
                        <div style={{ fontSize: '0.8rem', color: '#666', fontFamily: 'monospace' }}>{mov.codigo_barras}</div>
                    </td>
                    
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: esIngreso ? '#137333' : '#c5221f' }}>
                        {esIngreso ? '+' : '-'}{mov.cantidad}
                    </td>
                    
                    <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '500', color: '#333' }}>{mov.origen_destino || 'N/A'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>Ref: {mov.documento_motivo}</div>
                        {mov.observaciones && <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>Obs: {mov.observaciones}</div>}
                    </td>

                    <td style={{ padding: '12px', color: '#444' }}>
                        {mov.responsable}
                    </td>
                    
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No hay registros de movimientos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default HistoryPage;