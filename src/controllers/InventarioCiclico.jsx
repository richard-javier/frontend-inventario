import React, { useState, useEffect } from "react";
import {
  FaClipboardList,
  FaWarehouse,
  FaCalendarAlt,
  FaPlay,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaSave,
  FaSpinner,
  FaEyeSlash,
  FaSearch,
} from "react-icons/fa";
import "../css/InventarioCiclico.css";

const InventarioCiclico = () => {
  const [paso, setPaso] = useState(1); // 1: Programación, 2: Conteo Ciego, 3: Auditoría QISS
  const [loading, setLoading] = useState(true);
  const [bodegas, setBodegas] = useState([]);

  // ESTADOS DEL LOTE DE CONTEO
  const [codigoLote, setCodigoLote] = useState("");
  const [bodegaSelect, setBodegaSelect] = useState("");
  const [itemsConteo, setItemsConteo] = useState([]);

  // 1. CARGA INICIAL Y GENERACIÓN DE CÓDIGO (Según PDF: DDMMAAAA + Letra)
  useEffect(() => {
    const inicializar = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(
          "http://localhost:3001/api/inventario/maestros",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.bodegas) setBodegas(data.bodegas);
        }

        // Generar Código Automático (Ej: 150526A)
        const hoy = new Date();
        const d = String(hoy.getDate()).padStart(2, "0");
        const m = String(hoy.getMonth() + 1).padStart(2, "0");
        const y = String(hoy.getFullYear()).slice(-2);
        setCodigoLote(`${d}${m}${y}A`);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    inicializar();
  }, []);

  // 2. INICIAR CONTEO (Busca productos de la bodega)
  const handleGenerarLote = async () => {
    if (!bodegaSelect) return alert("⚠️ Seleccione una bodega a auditar.");

    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      // Simulamos traer el stock actual de esa bodega
      const res = await fetch("http://localhost:3001/api/inventario", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataProd = await res.json();

      // Filtramos productos que tengan stock (para la simulación tomamos 5 para auditar)
      const productosAuditar = dataProd.slice(0, 5).map((p) => ({
        id_producto: p.id_producto,
        sku: p.sku,
        nombre_producto: p.nombre_producto,
        stock_sistema: p.stock_actual, // Esto se oculta en el paso 2
        cantidad_fisica: "", // El bodeguero llena esto
        diferencia: 0,
        justificacion: "",
      }));

      setItemsConteo(productosAuditar);
      setPaso(2); // Pasamos al conteo ciego
    } catch (error) {
      alert("Error cargando inventario");
    } finally {
      setLoading(false);
    }
  };

  // 3. ACTUALIZAR CONTEO FÍSICO
  const actualizarConteo = (idProd, valor) => {
    setItemsConteo(
      itemsConteo.map((i) =>
        i.id_producto === idProd ? { ...i, cantidad_fisica: valor } : i,
      ),
    );
  };

  // 4. FINALIZAR CONTEO CIEGO Y PASAR A AUDITORÍA
  const handleFinalizarConteo = () => {
    // Validar que todo se haya contado
    const faltan = itemsConteo.some((i) => i.cantidad_fisica === "");
    if (faltan)
      return alert(
        "⚠️ Debe ingresar la cantidad física de todos los ítems listados.",
      );

    // Calcular diferencias para el QISS
    const itemsAuditados = itemsConteo.map((i) => {
      const fisico = parseInt(i.cantidad_fisica) || 0;
      const diff = fisico - parseInt(i.stock_sistema);
      return { ...i, diferencia: diff };
    });

    setItemsConteo(itemsAuditados);
    setPaso(3); // Pasamos a la revisión
  };

  const actualizarJustificacion = (idProd, texto) => {
    setItemsConteo(
      itemsConteo.map((i) =>
        i.id_producto === idProd ? { ...i, justificacion: texto } : i,
      ),
    );
  };

  // 5. CERRAR LOTE Y GUARDAR EN BD
  const handleCerrarAuditoria = () => {
    // Verificar que todos los errores tengan justificación (Regla QISS)
    const faltanJustificar = itemsConteo.some(
      (i) => i.diferencia !== 0 && i.justificacion.trim() === "",
    );
    if (faltanJustificar)
      return alert(
        "❌ ALERTA QISS: Todos los descuadres de inventario deben tener una justificación obligatoria antes de cerrar el lote (Plazo 48h).",
      );

    const confirmacion = window.confirm(
      `¿Firmar y cerrar el lote ${codigoLote}? Se registrarán los ajustes de inventario.`,
    );
    if (!confirmacion) return;

    // Aquí harías el POST a tu backend para guardar la auditoría
    console.log("Lote Cerrado:", {
      codigo_lote: codigoLote,
      bodega: bodegaSelect,
      detalles: itemsConteo,
    });

    alert(
      `✅ Lote ${codigoLote} cerrado exitosamente. Índices de Confiabilidad actualizados.`,
    );
    // Resetear pantalla
    setPaso(1);
    setBodegaSelect("");
    setItemsConteo([]);
    setCodigoLote(codigoLote.replace("A", "B")); // Simula el siguiente código
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <FaSpinner className="fa-spin" size="2em" color="#1a73e8" />
      </div>
    );

  return (
    <div className="cyclic-container">
      <div className="cyclic-card-main">
        <div className="cyclic-header">
          <h2 className="cyclic-title">
            <div className="cyclic-icon-wrapper">
              <FaClipboardList />
            </div>{" "}
            Auditoría e Inventario Cíclico
          </h2>
          {paso > 1 && (
            <span
              style={{
                background: "#202124",
                color: "white",
                padding: "8px 15px",
                borderRadius: "8px",
                fontWeight: "bold",
              }}
            >
              Lote: {codigoLote}
            </span>
          )}
        </div>

        {/* INDICADOR DE PASOS */}
        <div className="stepper-container">
          <div
            className={`step-item ${paso === 1 ? "active" : paso > 1 ? "completed" : ""}`}
          >
            <FaCalendarAlt size="1.5em" /> 1. Programación de Lote
          </div>
          <div
            className={`step-item ${paso === 2 ? "active" : paso > 2 ? "completed" : ""}`}
          >
            <FaEyeSlash size="1.5em" /> 2. Conteo Ciego (Físico)
          </div>
          <div className={`step-item ${paso === 3 ? "active" : ""}`}>
            <FaSearch size="1.5em" /> 3. Control QISS y Cierre
          </div>
        </div>

        {/* PASO 1: PROGRAMACIÓN */}
        {paso === 1 && (
          <div
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              animation: "fadeIn 0.3s",
            }}
          >
            <div className="cyclic-box">
              <h3
                style={{
                  color: "#1a73e8",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "10px",
                }}
              >
                Datos de la Auditoría
              </h3>
              <div style={{ marginTop: "20px" }}>
                <label className="cyclic-label">
                  Código de Conteo (Auto-Generado ISO)
                </label>
                <input
                  type="text"
                  value={codigoLote}
                  disabled
                  className="cyclic-input"
                  style={{ textAlign: "center", letterSpacing: "2px" }}
                />
              </div>
              <div style={{ marginTop: "20px" }}>
                <label className="cyclic-label">
                  <FaWarehouse /> Bodega a Auditar *
                </label>
                <select
                  value={bodegaSelect}
                  onChange={(e) => setBodegaSelect(e.target.value)}
                  className="cyclic-input"
                >
                  <option value="">-- Seleccione Bodega --</option>
                  {bodegas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} - {b.descripcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleGenerarLote}
                className="btn-primary-action"
              >
                <FaPlay /> INICIAR CONTEO FÍSICO
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: CONTEO CIEGO */}
        {paso === 2 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <div
              style={{
                background: "#fff9c4",
                borderLeft: "4px solid #fbbc04",
                padding: "15px",
                marginBottom: "20px",
                borderRadius: "4px",
                color: "#b06000",
                fontWeight: "bold",
              }}
            >
              <FaLock style={{ marginRight: "8px" }} /> MODO DE CONTEO CIEGO
              ACTIVO: Ingrese la cantidad física encontrada en estantería. El
              stock del sistema está oculto por seguridad.
            </div>

            <div className="cyclic-table-container">
              <table className="cyclic-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Descripción del Producto</th>
                    <th
                      style={{
                        textAlign: "center",
                        width: "200px",
                        color: "#1a73e8",
                      }}
                    >
                      Cant. Física Encontrada
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemsConteo.map((item) => (
                    <tr key={item.id_producto}>
                      <td style={{ fontWeight: "bold" }}>{item.sku}</td>
                      <td>{item.nombre_producto}</td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          min="0"
                          value={item.cantidad_fisica}
                          onChange={(e) =>
                            actualizarConteo(item.id_producto, e.target.value)
                          }
                          style={{
                            width: "100px",
                            padding: "10px",
                            textAlign: "center",
                            borderRadius: "6px",
                            border: "2px solid #1a73e8",
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={handleFinalizarConteo}
                className="btn-primary-action"
              >
                <FaCheckCircle /> FINALIZAR Y COMPARAR (AUDITORÍA)
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: AUDITORÍA Y QISS */}
        {paso === 3 && (
          <div style={{ animation: "fadeIn 0.3s" }}>
            <h3 style={{ color: "#202124", marginBottom: "15px" }}>
              Resultados del Cruce de Inventario
            </h3>

            <div className="cyclic-table-container">
              <table className="cyclic-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: "center" }}>Stock Sistema</th>
                    <th style={{ textAlign: "center" }}>Stock Físico</th>
                    <th style={{ textAlign: "center" }}>Diferencia</th>
                    <th>Estado (Sist. QISS)</th>
                    <th>Justificación Operativa</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsConteo.map((item) => (
                    <tr
                      key={item.id_producto}
                      style={{
                        background: item.diferencia !== 0 ? "#fdfcfc" : "white",
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: "bold" }}>{item.sku}</div>
                        <div style={{ fontSize: "0.8rem", color: "#5f6368" }}>
                          {item.nombre_producto}
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          color: "#5f6368",
                          fontWeight: "bold",
                        }}
                      >
                        {item.stock_sistema}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          color: "#1a73e8",
                          fontWeight: "bold",
                        }}
                      >
                        {item.cantidad_fisica}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          color: item.diferencia === 0 ? "#137333" : "#d93025",
                        }}
                      >
                        {item.diferencia > 0
                          ? `+${item.diferencia}`
                          : item.diferencia}
                      </td>
                      <td>
                        {item.diferencia === 0 ? (
                          <span className="tag-qiss-ok">
                            <FaCheckCircle /> Coincide
                          </span>
                        ) : (
                          <span className="tag-qiss-alert">
                            <FaExclamationTriangle /> QISS Abierto
                          </span>
                        )}
                      </td>
                      <td>
                        {item.diferencia !== 0 ? (
                          <input
                            type="text"
                            value={item.justificacion}
                            onChange={(e) =>
                              actualizarJustificacion(
                                item.id_producto,
                                e.target.value,
                              )
                            }
                            placeholder="Obligatorio (Ej: Faltante por merma)"
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: item.justificacion
                                ? "1px solid #dadce0"
                                : "2px solid #d93025",
                              borderRadius: "4px",
                              outline: "none",
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              color: "#9aa0a6",
                              fontSize: "0.85rem",
                              fontStyle: "italic",
                            }}
                          >
                            No requiere
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "20px",
              }}
            >
              <div style={{ color: "#5f6368", fontSize: "0.9rem" }}>
                * Los ajustes por diferencias requerirán revisión de Gerencia
                según norma SEQ-IT-AL-005.
              </div>
              <button
                onClick={handleCerrarAuditoria}
                className="btn-success-action"
              >
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
