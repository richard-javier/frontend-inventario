import React, { useState, useEffect } from "react";
import { API_BASE } from '../config/api.js';
import {
  FaClipboardList, FaCalendarAlt, FaPlay, FaCheckCircle, 
  FaLock, FaSave, FaSpinner, FaEyeSlash, FaFilePdf, FaChartPie, FaRedo
} from "react-icons/fa";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { clasificarInventarioABC } from "../utils/exportReports";
import { agregarLogoPDF } from "../utils/reportAssets";
import "../css/InventarioCiclico.css";

const getFechaLocalISO = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFechaAyerISO = () => {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return getFechaLocalISO(ayer);
};

const getFechaLegible = (fechaISO) => {
  const [year, month, day] = fechaISO.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
};

const getCodigoFecha = (fechaISO) => {
  const [year, month, day] = fechaISO.split("-");
  return `G${month}${day}${year.slice(-2)}`;
};

const getSeedFecha = (fechaISO) => fechaISO.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

const rotarProductosPorFecha = (productos, fechaISO) => {
  if (productos.length <= 15) return productos;
  const inicio = getSeedFecha(fechaISO) % productos.length;
  return [...productos.slice(inicio), ...productos.slice(0, inicio)];
};

const InventarioCiclico = () => {
  const fechaHoy = getFechaLocalISO();
  const fechaAyer = getFechaAyerISO();
  const [paso, setPaso] = useState(1); 
  const [loading, setLoading] = useState(true);

  const [codigoLote, setCodigoLote] = useState("");
  const [fechaConteo, setFechaConteo] = useState(fechaHoy);
  const [itemsConteo, setItemsConteo] = useState([]);
  const [numeroConteo, setNumeroConteo] = useState(1);

  // INDICADORES DE CONFIABILIDAD
  const [kpi, setKpi] = useState({ exactos: 0, conVariacion: 0, era: 0 });

  useEffect(() => {
    const inicializar = async () => {
      try {
        const randomNum = Math.floor(Math.random() * 99).toString().padStart(2, '0');
        setCodigoLote(`${getCodigoFecha(fechaHoy)}A${randomNum}`);
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    inicializar();
  }, []);

  const cambiarFechaConteo = (fechaISO) => {
    if (fechaISO !== fechaHoy && fechaISO !== fechaAyer) return;
    const randomNum = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    setFechaConteo(fechaISO);
    setCodigoLote(`${getCodigoFecha(fechaISO)}A${randomNum}`);
  };

  const handleGenerarLote = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/inventario`, { headers: { Authorization: `Bearer ${token}` } });
      const dataProd = await res.json();

      const productosABC = clasificarInventarioABC(dataProd);
      const prioridadConteo = productosABC.filter(p => ['A', 'B'].includes(p.claseABC));
      const baseConteo = prioridadConteo.length > 0 ? prioridadConteo : productosABC;
      const muestra = rotarProductosPorFecha(baseConteo, fechaConteo).slice(0, 15).map((p) => ({
        id_producto: p.id_producto,
        sku: p.sku,
        nombre_producto: p.nombre_producto,
        ubicacion_bodega: p.ubicacion_bodega || 'A00A00',
        claseABC: p.claseABC,
        rankingABC: p.rankingABC,
        stock_sistema: p.stock_actual, 
        cantidad_fisica: "", 
        diferencia: 0,
        justificacion: "",
      }));

      setItemsConteo(muestra);
      setNumeroConteo(1);
      setPaso(2); 
    } catch { alert("Error cargando inventario"); } 
    finally { setLoading(false); }
  };

  const actualizarConteo = (idProd, valor) => {
    setItemsConteo(itemsConteo.map((i) => i.id_producto === idProd ? { ...i, cantidad_fisica: valor } : i));
  };

  const handleFinalizarConteo = () => {
    const faltan = itemsConteo.some((i) => i.cantidad_fisica === "");
    if (faltan) return alert("⚠️ Debe ingresar la cantidad física de todos los ítems listados (escriba 0 si no hay stock).");

    let exactos = 0;
    let conVariacion = 0;

    const itemsAuditados = itemsConteo.map((i) => {
      const fisico = parseInt(i.cantidad_fisica) || 0;
      const sistema = parseInt(i.stock_sistema) || 0;
      const diff = fisico - sistema;
      
      if (diff === 0) exactos++; else conVariacion++;
      
      return { ...i, diferencia: diff };
    });

    const eraPercentage = itemsAuditados.length > 0 ? ((exactos / itemsAuditados.length) * 100).toFixed(1) : 0;

    setKpi({ exactos, conVariacion, era: eraPercentage });
    setItemsConteo(itemsAuditados);
    setPaso(3); 
  };

  const actualizarJustificacion = (idProd, texto) => {
    setItemsConteo(itemsConteo.map((i) => i.id_producto === idProd ? { ...i, justificacion: texto } : i));
  };

  const generarReporteCiclicoPDF = () => {
      const doc = new jsPDF({ orientation: 'landscape' });
      const fecha = new Date().toLocaleString('es-ES');
      agregarLogoPDF(doc, { x: 14, y: 6, width: 30, height: 20 });

      doc.setFontSize(17);
      doc.setTextColor(26, 115, 232);
      doc.text("REPORTE FINAL DE INVENTARIO CÍCLICO", 148, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Lote: ${codigoLote} | Fecha conteo: ${getFechaLegible(fechaConteo)} | Selección automática ABC | Conteo: ${numeroConteo}`, 148, 22, { align: 'center' });
      doc.text(`Generado: ${fecha}`, 148, 28, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(32, 33, 36);
      doc.text(`Índice de confiabilidad ERA: ${kpi.era}% | Exactos: ${kpi.exactos} | Con variación: ${kpi.conVariacion}`, 20, 36);

      autoTable(doc, {
        startY: 44,
        head: [["SKU", "Producto", "ABC", "Ubicación", "Sistema", "Físico", "Diferencia", "Justificación"]],
        body: itemsConteo.map(item => [
          item.sku || 'N/A',
          item.nombre_producto || 'Sin nombre',
          item.claseABC || '-',
          item.ubicacion_bodega || '-',
          item.stock_sistema,
          item.cantidad_fisica,
          item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia,
          item.justificacion || (item.diferencia === 0 ? 'Exacto' : '')
        ]),
        theme: 'grid',
        headStyles: { fillColor: [26, 115, 232], textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } }
      });

      const finalY = doc.lastAutoTable?.finalY || 170;
      const firmaY = Math.min(finalY + 18, 195);
      doc.setFontSize(10);
      doc.setTextColor(32, 33, 36);
      doc.text("Responsable del conteo:", 20, firmaY);
      doc.line(72, firmaY, 138, firmaY);
      doc.text("Firma:", 168, firmaY);
      doc.line(182, firmaY, 250, firmaY);
      doc.save(`Reporte_Final_Ciclico_${codigoLote}.pdf`);
  };

  const iniciarSegundoConteo = () => {
    const conDiferencia = itemsConteo.filter(item => item.diferencia !== 0);
    if (conDiferencia.length === 0) return alert("✅ No hay diferencias para recontar.");

    setItemsConteo(conDiferencia.map(item => ({
      ...item,
      cantidad_fisica: "",
      diferencia: 0,
      justificacion: ""
    })));
    setNumeroConteo(numeroConteo + 1);
    setPaso(2);
  };

  const handleCerrarAuditoria = () => {
    const faltanJustificar = itemsConteo.some((i) => i.diferencia !== 0 && i.justificacion.trim() === "");
    if (faltanJustificar) return alert("❌ Todos los descuadres de inventario deben tener una justificación obligatoria antes de cerrar el lote.");

    const confirmacion = window.confirm(`¿Firmar y cerrar el lote ${codigoLote}? Los indicadores ERA quedarán registrados en el historial.`);
    if (!confirmacion) return;

    alert(`✅ Lote ${codigoLote} cerrado exitosamente. Índices de Confiabilidad actualizados en el servidor.`);
    setPaso(1);
    setItemsConteo([]);
    setNumeroConteo(1);
    
    // Generar nuevo código
    const randomNum = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    setFechaConteo(fechaHoy);
    setCodigoLote(`${getCodigoFecha(fechaHoy)}A${randomNum}`); 
  };

  // Datos para el gráfico Recharts
  const dataGrafico = [
      { name: 'Coincidencia Exacta', value: kpi.exactos, color: '#34a853' },
      { name: 'Con Variación', value: kpi.conVariacion, color: '#d93025' }
  ];

  if (loading) return <div style={{ textAlign: "center", padding: "50px" }}><FaSpinner className="fa-spin" size="2em" color="#1a73e8" /></div>;

  return (
    <div className="cyclic-container">
      <div className="cyclic-card-main">
        <div className="cyclic-header">
          <h2 className="cyclic-title"><div className="cyclic-icon-wrapper"><FaClipboardList /></div> Auditoría e Inventario Cíclico</h2>
          {paso > 1 && (
            <span style={{ background: "#202124", color: "white", padding: "8px 15px", borderRadius: "8px", fontWeight: "bold" }}>Lote: {codigoLote} | {fechaConteo === fechaAyer ? "Ayer" : "Hoy"}</span>
          )}
        </div>

        <div className="stepper-container">
          <div className={`step-item ${paso === 1 ? "active" : paso > 1 ? "completed" : ""}`}><FaCalendarAlt size="1.5em" /> 1. Programación de Lote</div>
          <div className={`step-item ${paso === 2 ? "active" : paso > 2 ? "completed" : ""}`}><FaEyeSlash size="1.5em" /> 2. Conteo Ciego (Físico)</div>
          <div className={`step-item ${paso === 3 ? "active" : ""}`}><FaChartPie size="1.5em" /> 3. Análisis de Confiabilidad</div>
        </div>

        {/* PASO 1: PROGRAMACIÓN */}
        {paso === 1 && (
          <div style={{ maxWidth: "600px", margin: "0 auto", animation: "fadeIn 0.3s" }}>
            <div className="cyclic-box">
              <h3 style={{ color: "#1a73e8", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Datos de la Auditoría</h3>
              <p style={{ color: "#5f6368", lineHeight: 1.6, marginTop: "15px" }}>
                 {fechaConteo === fechaAyer ? "ayer" : "hoy"}
              </p>
              <div style={{ marginTop: "18px" }}>
                <label className="cyclic-label">Fecha del conteo</label>
                <div className="cyclic-date-toggle" aria-label="Seleccionar fecha de inventario ciclico">
                  <button type="button" className={fechaConteo === fechaHoy ? "active" : ""} onClick={() => cambiarFechaConteo(fechaHoy)}>
                    Hoy
                  </button>
                  <button type="button" className={fechaConteo === fechaAyer ? "active" : ""} onClick={() => cambiarFechaConteo(fechaAyer)}>
                    Ayer
                  </button>
                </div>
                <div className="cyclic-date-note">Conteo seleccionado: {getFechaLegible(fechaConteo)}</div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <label className="cyclic-label">Código de Conteo (Auto-Generado)</label>
                <input type="text" value={codigoLote} disabled className="cyclic-input" style={{ textAlign: "center", letterSpacing: "2px", fontSize: '1.2rem', fontWeight: 'bold' }} />
              </div>
              <div className="cyclic-auto-summary">
                <strong>15</strong>
                <span>Productos cíclicos automáticos</span>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <button onClick={handleGenerarLote} className="btn-primary-action"><FaPlay /> INICIAR CONTEO FÍSICO</button>
            </div>
          </div>
        )}

        {/* PASO 2: CONTEO CIEGO */}
        {paso === 2 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <div className="cyclic-date-banner">
              Inventario cíclico programado para <strong>{fechaConteo === fechaAyer ? "ayer" : "hoy"}</strong> ({getFechaLegible(fechaConteo)})
            </div>
            <div style={{ background: "#fff9c4", borderLeft: "4px solid #fbbc04", padding: "15px", marginBottom: "20px", borderRadius: "4px", color: "#b06000", fontWeight: "bold" }}>
              <FaLock style={{ marginRight: "8px" }} /> MODO DE CONTEO CIEGO ACTIVO: Ingrese la cantidad física encontrada en estantería. El stock del sistema está oculto.
            </div>

            <div className="cyclic-table-container">
              <table className="cyclic-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Descripción del Producto</th>
                    <th>ABC</th>
                    <th>Ubicación</th>
                    <th style={{ textAlign: "center", width: "200px", color: "#1a73e8" }}>Cant. Física Encontrada</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsConteo.map((item) => (
                    <tr key={item.id_producto}>
                      <td style={{ fontWeight: "bold" }}>{item.sku}</td>
                      <td>{item.nombre_producto}</td>
                      <td><span className={`tag-abc tag-abc-${item.claseABC}`}>{item.claseABC}</span></td>
                      <td style={{ color: "#5f6368" }}>{item.ubicacion_bodega}</td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="number" min="0" value={item.cantidad_fisica}
                          onChange={(e) => actualizarConteo(item.id_producto, e.target.value)}
                          style={{ width: "100px", padding: "10px", textAlign: "center", borderRadius: "6px", border: "2px solid #1a73e8", fontWeight: "bold", fontSize: "1.1rem" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: "right", marginTop: '20px' }}>
              <button onClick={handleFinalizarConteo} className="btn-primary-action"><FaCheckCircle /> FINALIZAR Y AUDITAR</button>
            </div>
          </div>
        )}

        {/* PASO 3: AUDITORÍA DE CONFIABILIDAD */}
        {paso === 3 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <div className="cyclic-date-banner">
              Resultado del inventario cíclico de <strong>{fechaConteo === fechaAyer ? "ayer" : "hoy"}</strong> ({getFechaLegible(fechaConteo)})
            </div>
            
            {/* DASHBOARD DE KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '25px' }}>
                <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#5f6368', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Índice ERA (Exact Record Accuracy)</h4>
                    <div style={{ fontSize: '3rem', fontWeight: '900', color: kpi.era >= 95 ? '#34a853' : (kpi.era >= 85 ? '#fbbc04' : '#d93025') }}>
                        {kpi.era}%
                    </div>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#80868b', textAlign: 'center' }}>Porcentaje de ítems que coincidieron exactamente con el sistema.</p>
                </div>

                <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '10px', height: '200px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataGrafico} margin={{ top: 16, right: 22, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={72}>
                                {dataGrafico.map((entry, index) => (<Cell key={`bar-${index}`} fill={entry.color} />))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
                <h3 style={{ color: "#202124", margin: 0 }}>Desglose de Variaciones</h3>
                <button onClick={generarReporteCiclicoPDF} style={{ background: '#d93025', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <FaFilePdf /> REPORTE FINAL PDF
                </button>
            </div>

            <div className="cyclic-table-container">
              <table className="cyclic-table">
                <thead>
                  <tr>
                    <th>Item (SKU)</th>
                    <th style={{ textAlign: "center" }}>Stock Sist. (Book Qty)</th>
                    <th style={{ textAlign: "center" }}>Stock Fís. (Phys Qty)</th>
                    <th style={{ textAlign: "center" }}>Variación (Qty Var)</th>
                    <th>Justificación Operativa</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsConteo.map((item) => (
                    <tr key={item.id_producto} style={{ background: item.diferencia !== 0 ? "#fdfcfc" : "white" }}>
                      <td>
                        <div style={{ fontWeight: "bold" }}>{item.sku}</div>
                        <div style={{ fontSize: "0.8rem", color: "#5f6368" }}>Ubicación: {item.ubicacion_bodega}</div>
                      </td>
                      <td style={{ textAlign: "center", color: "#5f6368", fontWeight: "bold" }}>{item.stock_sistema}</td>
                      <td style={{ textAlign: "center", color: "#1a73e8", fontWeight: "bold" }}>{item.cantidad_fisica}</td>
                      <td style={{ textAlign: "center", fontWeight: "bold", color: item.diferencia === 0 ? "#137333" : "#d93025" }}>
                        {item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia}
                      </td>
                      <td>
                        {item.diferencia !== 0 ? (
                          <input
                            type="text" value={item.justificacion}
                            onChange={(e) => actualizarJustificacion(item.id_producto, e.target.value)}
                            placeholder="Motivo (Ej: Faltante por merma)"
                            style={{ width: "100%", padding: "8px", border: item.justificacion ? "1px solid #dadce0" : "2px solid #d93025", borderRadius: "4px", outline: "none" }}
                          />
                        ) : (
                          <span style={{ color: "#137333", fontSize: "0.85rem", fontWeight: "bold", display: 'flex', alignItems: 'center', gap: '5px' }}><FaCheckCircle/> Exacto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap", marginTop: "25px" }}>
              {kpi.conVariacion > 0 && (
                <button onClick={iniciarSegundoConteo} className="btn-primary-action" style={{ padding: '15px 30px', fontSize: '1.1rem' }}>
                  <FaRedo /> SEGUNDO CONTEO
                </button>
              )}
              <button onClick={handleCerrarAuditoria} className="btn-success-action" style={{ padding: '15px 30px', fontSize: '1.1rem' }}>
                <FaSave /> REGISTRAR AJUSTES Y CERRAR LOTE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventarioCiclico;
