import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../config/api.js';
import { FaBarcode, FaFileExcel, FaFilePdf, FaMapMarkerAlt, FaSearch, FaSpinner, FaStore, FaWarehouse } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const SerialReportPage = ({ tipo = 'bodega' }) => {
  const [seriales, setSeriales] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const esEnviados = tipo === 'enviados';

  useEffect(() => {
    const cargarSeriales = async () => {
      const token = localStorage.getItem('token');
      const endpoint = esEnviados ? 'enviados' : 'en-bodega';

      try {
        const response = await fetch(`${API_BASE}/inventario/seriales/${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) setSeriales(await response.json());
      } catch (error) {
        console.error('Error cargando seriales:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarSeriales();
  }, [esEnviados]);

  const serialesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return seriales;

    return seriales.filter(item => (
      (item.serial || '').toLowerCase().includes(termino) ||
      (item.sku || '').toLowerCase().includes(termino) ||
      (item.nombre_producto || '').toLowerCase().includes(termino) ||
      (item.pallet_lpn || '').toLowerCase().includes(termino) ||
      (item.masterbox_lpn || '').toLowerCase().includes(termino) ||
      (item.ubicacion_bodega || '').toLowerCase().includes(termino) ||
      (item.numero_egreso || '').toLowerCase().includes(termino) ||
      (item.punto_destino || '').toLowerCase().includes(termino)
    ));
  }, [busqueda, seriales]);

  const titulo = esEnviados ? 'Seriales enviados' : 'Seriales en bodega';
  const subtitulo = esEnviados
    ? 'Equipos serializados que salieron hacia puntos de venta o cliente final.'
    : 'Equipos serializados disponibles actualmente por bodega, ubicación, pallet y MasterBox.';

  const getRowsExport = () => serialesFiltrados.map((item, index) => ({
    '#': index + 1,
    Serial: item.serial || '-',
    Producto: item.nombre_producto || '-',
    SKU: item.sku || '-',
    Pallet: item.pallet_lpn || '-',
    MasterBox: item.masterbox_lpn || '-',
    Bodega: item.bodega_actual || '-',
    Ubicacion: item.ubicacion_bodega || '-',
    NotaEgreso: item.numero_egreso || '-',
    Destino: item.punto_destino || '-',
    FechaEnvio: item.fecha_salida ? new Date(item.fecha_salida).toLocaleString('es-EC') : '-'
  }));

  const descargarExcel = () => {
    const rows = getRowsExport();
    const columnas = esEnviados
      ? ['#', 'Serial', 'Producto', 'SKU', 'Pallet', 'MasterBox', 'NotaEgreso', 'Destino', 'FechaEnvio']
      : ['#', 'Serial', 'Producto', 'SKU', 'Pallet', 'MasterBox', 'Bodega', 'Ubicacion'];
    const worksheet = XLSX.utils.json_to_sheet(rows.map(row => {
      const limpio = {};
      columnas.forEach(col => { limpio[col] = row[col]; });
      return limpio;
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, esEnviados ? 'Seriales enviados' : 'Seriales en bodega');
    XLSX.writeFile(workbook, `${esEnviados ? 'Seriales_Enviados' : 'Seriales_en_Bodega'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const descargarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const fecha = new Date().toLocaleString('es-EC');
    const color = esEnviados ? [217, 48, 37] : [26, 115, 232];
    const rows = getRowsExport();
    const head = esEnviados
      ? [['#', 'Serial', 'Producto', 'SKU', 'Pallet', 'MasterBox', 'Nota Egreso', 'Destino', 'Fecha Envio']]
      : [['#', 'Serial', 'Producto', 'SKU', 'Pallet', 'MasterBox', 'Bodega', 'Ubicacion']];
    const body = rows.map(row => esEnviados
      ? [row['#'], row.Serial, row.Producto, row.SKU, row.Pallet, row.MasterBox, row.NotaEgreso, row.Destino, row.FechaEnvio]
      : [row['#'], row.Serial, row.Producto, row.SKU, row.Pallet, row.MasterBox, row.Bodega, row.Ubicacion]);

    doc.setFontSize(18);
    doc.setTextColor(...color);
    doc.text(titulo.toUpperCase(), 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(`Generado: ${fecha} | Total: ${serialesFiltrados.length}`, 14, 23);

    autoTable(doc, {
      startY: 30,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: color, textColor: 255 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 2: { cellWidth: 45 } }
    });

    doc.save(`${esEnviados ? 'Seriales_Enviados' : 'Seriales_en_Bodega'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><FaSpinner className="fa-spin" size="2em" color="#1a73e8" /></div>;
  }

  return (
    <div style={{ padding: '25px', background: '#f8f9fa', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', borderBottom: '2px solid #f0f2f5', paddingBottom: '18px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', color: esEnviados ? '#d93025' : '#1a73e8', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {esEnviados ? <FaStore /> : <FaWarehouse />} {titulo}
            </h2>
            <p style={{ margin: 0, color: '#5f6368' }}>{subtitulo}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={descargarExcel} style={{ background: '#e6f4ea', color: '#137333', border: '1px solid #e6f4ea', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaFileExcel /> Excel
            </button>
            <button onClick={descargarPDF} style={{ background: '#fce8e6', color: '#d93025', border: '1px solid #fce8e6', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaFilePdf /> PDF
            </button>
            <div style={{ background: esEnviados ? '#fce8e6' : '#e8f0fe', color: esEnviados ? '#d93025' : '#1a73e8', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold' }}>
              {serialesFiltrados.length} seriales
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <FaSearch style={{ position: 'absolute', left: '14px', top: '14px', color: '#80868b' }} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por serial, producto, SKU, pallet, MasterBox, ubicación o destino..."
            style={{ width: '100%', boxSizing: 'border-box', padding: '13px 15px 13px 42px', border: '1px solid #dadce0', borderRadius: '8px', outline: 'none', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', color: '#5f6368', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                <th style={thStyle}>Serial</th>
                <th style={thStyle}>Producto</th>
                <th style={thStyle}>Pallet / MasterBox</th>
                {esEnviados && <th style={thStyle}>Nota Egreso</th>}
                <th style={thStyle}>{esEnviados ? 'Destino' : 'Bodega'}</th>
                <th style={thStyle}>{esEnviados ? 'Fecha envío' : 'Ubicación'}</th>
              </tr>
            </thead>
            <tbody>
              {serialesFiltrados.length === 0 ? (
                <tr><td colSpan={esEnviados ? '6' : '5'} style={{ padding: '35px', textAlign: 'center', color: '#80868b' }}>No hay seriales para mostrar.</td></tr>
              ) : serialesFiltrados.map(item => (
                <tr key={item.id_serial || item.serial} style={{ borderTop: '1px solid #f0f2f5' }}>
                  <td style={tdStyle}><strong style={{ color: '#202124' }}><FaBarcode /> {item.serial}</strong></td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '600', color: '#202124' }}>{item.nombre_producto}</div>
                    <small style={{ color: '#5f6368' }}>{item.sku}</small>
                  </td>
                  <td style={tdStyle}>
                    <div>{item.pallet_lpn || '-'}</div>
                    <small style={{ color: '#b06000' }}>{item.masterbox_lpn || '-'}</small>
                  </td>
                  {esEnviados && <td style={tdStyle}><strong style={{ color: '#d93025' }}>{item.numero_egreso || '-'}</strong></td>}
                  <td style={tdStyle}>
                    {esEnviados ? item.punto_destino || '-' : item.bodega_actual || '-'}
                    {esEnviados && <div><small style={{ color: '#5f6368' }}>{item.motivo_salida || ''}</small></div>}
                  </td>
                  <td style={tdStyle}>
                    {esEnviados
                      ? (item.fecha_salida ? new Date(item.fecha_salida).toLocaleString('es-EC') : '-')
                      : <span style={{ color: '#b06000', fontWeight: 'bold' }}><FaMapMarkerAlt /> {item.ubicacion_bodega || '-'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const thStyle = { padding: '14px', borderBottom: '1px solid #e0e0e0' };
const tdStyle = { padding: '14px', verticalAlign: 'top', color: '#3c4043' };

export default SerialReportPage;
