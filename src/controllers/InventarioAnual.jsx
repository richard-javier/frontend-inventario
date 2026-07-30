import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config/api.js';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardList,
  FaEyeSlash,
  FaFilePdf,
  FaLock,
  FaPlay,
  FaRedo,
  FaSave,
  FaSpinner
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { agregarLogoPDF } from '../utils/reportAssets';
import '../css/InventarioCiclico.css';

const InventarioAnual = () => {
  const [paso, setPaso] = useState(1);
  const [productos, setProductos] = useState([]);
  const [itemsConteo, setItemsConteo] = useState([]);
  const [codigoLote, setCodigoLote] = useState('');
  const [loading, setLoading] = useState(true);
  const [numeroConteo, setNumeroConteo] = useState(1);
  const [kpi, setKpi] = useState({ exactos: 0, conVariacion: 0, precision: 0 });

  useEffect(() => {
    const fetchInventario = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_BASE}/inventario`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.ok) setProductos(await response.json() || []);

        const hoy = new Date();
        const d = String(hoy.getDate()).padStart(2, '0');
        const m = String(hoy.getMonth() + 1).padStart(2, '0');
        const y = String(hoy.getFullYear()).slice(-2);
        setCodigoLote(`AN${y}${m}${d}`);
      } catch (error) {
        console.error('Error cargando inventario anual', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventario();
  }, []);

  const productosConStock = productos.filter(prod => Number(prod.stock_actual) > 0);
  const totalUnidades = productosConStock.reduce((sum, prod) => sum + Number(prod.stock_actual || 0), 0);

  const iniciarConteo = () => {
    const items = productosConStock.map(prod => ({
      id_producto: prod.id_producto,
      sku: prod.sku,
      nombre_producto: prod.nombre_producto,
      ubicacion_bodega: prod.ubicacion_bodega || 'Sin asignar',
      stock_sistema: Number(prod.stock_actual) || 0,
      cantidad_fisica: '',
      diferencia: 0,
      justificacion: ''
    }));
    setItemsConteo(items);
    setNumeroConteo(1);
    setPaso(2);
  };

  const actualizarConteo = (idProducto, valor) => {
    setItemsConteo(itemsConteo.map(item => item.id_producto === idProducto ? { ...item, cantidad_fisica: valor } : item));
  };

  const actualizarJustificacion = (idProducto, valor) => {
    setItemsConteo(itemsConteo.map(item => item.id_producto === idProducto ? { ...item, justificacion: valor } : item));
  };

  const finalizarConteo = () => {
    const faltan = itemsConteo.some(item => item.cantidad_fisica === '');
    if (faltan) return alert('⚠️ Debe ingresar la cantidad física de todos los productos. Escriba 0 si no encontró stock.');

    let exactos = 0;
    let conVariacion = 0;
    const auditados = itemsConteo.map(item => {
      const fisico = Number(item.cantidad_fisica) || 0;
      const sistema = Number(item.stock_sistema) || 0;
      const diferencia = fisico - sistema;
      if (diferencia === 0) exactos++; else conVariacion++;
      return { ...item, diferencia };
    });

    setItemsConteo(auditados);
    setKpi({
      exactos,
      conVariacion,
      precision: auditados.length > 0 ? ((exactos / auditados.length) * 100).toFixed(1) : 0
    });
    setPaso(3);
  };

  const cerrarInventario = () => {
    const faltanJustificar = itemsConteo.some(item => item.diferencia !== 0 && item.justificacion.trim() === '');
    if (faltanJustificar) return alert('❌ Todo faltante o sobrante debe tener justificación antes de cerrar el inventario anual.');
    alert(`✅ Inventario anual ${codigoLote} cerrado. Diferencias listas para revisión.`);
    setPaso(1);
    setItemsConteo([]);
    setNumeroConteo(1);
  };

  const iniciarSegundoConteo = () => {
    const conDiferencia = itemsConteo.filter(item => item.diferencia !== 0);
    if (conDiferencia.length === 0) return alert('✅ No hay diferencias para recontar.');

    setItemsConteo(conDiferencia.map(item => ({
      ...item,
      cantidad_fisica: '',
      diferencia: 0,
      justificacion: ''
    })));
    setNumeroConteo(numeroConteo + 1);
    setPaso(2);
  };

  const generarReporteAnualPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const fecha = new Date().toLocaleString('es-ES');
    agregarLogoPDF(doc, { x: 14, y: 6, width: 30, height: 20 });

    doc.setFontSize(17);
    doc.setTextColor(217, 83, 79);
    doc.text('REPORTE FINAL DE INVENTARIO ANUAL', 148, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`Lote: ${codigoLote} | Conteo: ${numeroConteo} | Generado: ${fecha}`, 148, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(32, 33, 36);
    doc.text(`Índice de confiabilidad: ${kpi.precision}% | Exactos: ${kpi.exactos} | Con diferencia: ${kpi.conVariacion}`, 20, 32);

    autoTable(doc, {
      startY: 40,
      head: [['SKU', 'Producto', 'Ubicación', 'Sistema', 'Físico', 'Diferencia', 'Justificación']],
      body: itemsConteo.map(item => [
        item.sku || 'N/A',
        item.nombre_producto || 'Sin nombre',
        item.ubicacion_bodega || '-',
        item.stock_sistema,
        item.cantidad_fisica,
        item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia,
        item.justificacion || (item.diferencia === 0 ? 'Exacto' : '')
      ]),
      theme: 'grid',
      headStyles: { fillColor: [217, 83, 79], textColor: 255 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } }
    });

    const finalY = doc.lastAutoTable?.finalY || 170;
    const firmaY = Math.min(finalY + 18, 195);
    doc.setFontSize(10);
    doc.setTextColor(32, 33, 36);
    doc.text('Responsable del conteo:', 20, firmaY);
    doc.line(72, firmaY, 138, firmaY);
    doc.text('Firma:', 168, firmaY);
    doc.line(182, firmaY, 250, firmaY);
    doc.save(`Reporte_Final_Anual_${codigoLote}.pdf`);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><FaSpinner className="fa-spin" size="2em" color="#d9534f" /></div>;
  }

  return (
    <div className="cyclic-container">
      <div className="cyclic-card-main">
        <div className="cyclic-header">
          <h2 className="cyclic-title"><div className="cyclic-icon-wrapper annual-icon-wrapper"><FaClipboardList /></div> Inventario Anual</h2>
          {paso > 1 && <span style={{ background: '#202124', color: 'white', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold' }}>Lote: {codigoLote}</span>}
        </div>

        <div className="stepper-container">
          <div className={`step-item ${paso === 1 ? 'active' : paso > 1 ? 'completed' : ''}`}><FaCalendarAlt size="1.5em" /> 1. Preparación</div>
          <div className={`step-item ${paso === 2 ? 'active' : paso > 2 ? 'completed' : ''}`}><FaEyeSlash size="1.5em" /> 2. Conteo Ciego</div>
          <div className={`step-item ${paso === 3 ? 'active' : ''}`}><FaCheckCircle size="1.5em" /> 3. Diferencias</div>
        </div>

        {paso === 1 && (
          <>
            <div className="cyclic-box">
              <h3 style={{ color: '#202124', marginTop: 0 }}>Preparación del conteo anual</h3>
              <p style={{ color: '#5f6368', lineHeight: 1.6 }}>
                El sistema prepara automáticamente todos los productos con stock para el inventario anual, sin escoger bodega. El contador no ve el stock del sistema; después el módulo compara conteo físico contra sistema y muestra faltantes o sobrantes.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '15px', marginTop: '20px' }}>
                <div className="cyclic-box" style={{ marginBottom: 0 }}>
                  <strong style={{ fontSize: '1.8rem', color: '#202124' }}>{productosConStock.length}</strong>
                  <div style={{ color: '#5f6368', fontWeight: 'bold' }}>SKUs con stock</div>
                </div>
                <div className="cyclic-box" style={{ marginBottom: 0 }}>
                  <strong style={{ fontSize: '1.8rem', color: '#202124' }}>{totalUnidades.toLocaleString()}</strong>
                  <div style={{ color: '#5f6368', fontWeight: 'bold' }}>Unidades en sistema</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={iniciarConteo} className="btn-primary-action"><FaPlay /> Iniciar conteo anual</button>
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <div style={{ background: '#fff9c4', borderLeft: '4px solid #fbbc04', padding: '15px', marginBottom: '20px', borderRadius: '4px', color: '#b06000', fontWeight: 'bold' }}>
              <FaLock style={{ marginRight: '8px' }} /> CONTEO CIEGO: ingrese solo lo encontrado físicamente. El stock del sistema está oculto.
            </div>
            <div className="cyclic-table-container">
              <table className="cyclic-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Ubicación</th>
                    <th style={{ textAlign: 'center', width: '200px' }}>Cant. Física Encontrada</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsConteo.map(item => (
                    <tr key={item.id_producto}>
                      <td style={{ fontWeight: 'bold' }}>{item.sku || 'N/A'}</td>
                      <td>{item.nombre_producto || 'Sin nombre'}</td>
                      <td style={{ color: '#5f6368' }}>{item.ubicacion_bodega}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="number" min="0" value={item.cantidad_fisica} onChange={(e) => actualizarConteo(item.id_producto, e.target.value)} style={{ width: '100px', padding: '10px', textAlign: 'center', borderRadius: '6px', border: '2px solid #d9534f', fontWeight: 'bold', fontSize: '1.1rem' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button onClick={finalizarConteo} className="btn-primary-action"><FaCheckCircle /> Finalizar y comparar</button>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div className="cyclic-box" style={{ marginBottom: 0 }}><strong style={{ fontSize: '1.8rem', color: '#137333' }}>{kpi.exactos}</strong><div style={{ color: '#5f6368', fontWeight: 'bold' }}>Exactos</div></div>
              <div className="cyclic-box" style={{ marginBottom: 0 }}><strong style={{ fontSize: '1.8rem', color: '#d93025' }}>{kpi.conVariacion}</strong><div style={{ color: '#5f6368', fontWeight: 'bold' }}>Con diferencia</div></div>
              <div className="cyclic-box" style={{ marginBottom: 0 }}><strong style={{ fontSize: '1.8rem', color: kpi.precision >= 95 ? '#137333' : (kpi.precision >= 85 ? '#b06000' : '#d93025') }}>{kpi.precision}%</strong><div style={{ color: '#5f6368', fontWeight: 'bold' }}>Índice de confiabilidad</div></div>
            </div>
            <div className="cyclic-table-container">
              <table className="cyclic-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th style={{ textAlign: 'center' }}>Sistema</th>
                    <th style={{ textAlign: 'center' }}>Físico</th>
                    <th style={{ textAlign: 'center' }}>Diferencia</th>
                    <th>Justificación</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsConteo.map(item => (
                    <tr key={item.id_producto}>
                      <td style={{ fontWeight: 'bold' }}>{item.sku || 'N/A'}</td>
                      <td>{item.nombre_producto || 'Sin nombre'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.stock_sistema}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.cantidad_fisica}</td>
                      <td style={{ textAlign: 'center', color: item.diferencia === 0 ? '#137333' : '#d93025', fontWeight: 'bold' }}>{item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia}</td>
                      <td>
                        {item.diferencia === 0 ? (
                          <span style={{ color: '#137333', fontWeight: 'bold' }}>Exacto</span>
                        ) : (
                          <input type="text" value={item.justificacion} onChange={(e) => actualizarJustificacion(item.id_producto, e.target.value)} placeholder="Motivo de faltante o sobrante" style={{ width: '100%', padding: '8px', border: item.justificacion ? '1px solid #dadce0' : '2px solid #d93025', borderRadius: '4px' }} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap', marginTop: '25px' }}>
              <button onClick={generarReporteAnualPDF} className="btn-primary-action annual-pdf-button"><FaFilePdf /> Reporte final PDF</button>
              {kpi.conVariacion > 0 && <button onClick={iniciarSegundoConteo} className="btn-primary-action"><FaRedo /> Segundo conteo</button>}
              <button onClick={cerrarInventario} className="btn-success-action"><FaSave /> Cerrar inventario anual</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InventarioAnual;
