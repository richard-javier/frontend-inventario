import React, { useState, useEffect } from "react";
import {
  FaSave,
  FaTag,
  FaDatabase,
  FaBarcode,
  FaSpinner,
  FaSearch,
  FaPlus,
  FaTimes,
  FaBoxes,
  FaMicrochip,
} from "react-icons/fa";

const CreateProduct = ({ onProductCreated }) => {
  const [diccionarios, setDiccionarios] = useState(null);
  const [mostrarModal, setShowModal] = useState(false);
  const [maestroData, setMaestroData] = useState({
    tipo_maestro: "marca",
    codigo: "",
    descripcion: "",
  });
  const [mensajeModal, setMensajeModal] = useState("");

  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });

  // Estado unificado con los campos del Excel y los de Hardware
  const [formData, setFormData] = useState({
    nombre_producto: "",
    part_number: "",
    modelo: "",
    marca: "",
    categoria: "",
    sub_categoria: "",
    codigo_barras: "",
    precio_ref: 0,
    tecnologia: "N/A",
    color: "N/A",
    id_status: "Nuevo",
    id_prop: "Empresa",
    especificaciones: "",
    stock_minimo: 5,
    stock_maximo: 50,
    sku_generado: "",
  });

  const cargarMaestros = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        "http://localhost:3001/api/inventario/maestros",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      setDiccionarios(data);
    } catch (error) {
      setMensaje({
        texto: "Error al conectar con la Base de Datos.",
        tipo: "error",
      });
    }
  };

  useEffect(() => {
    cargarMaestros();
  }, []);

  // Constructor de SKU Dinámico en tiempo real (CAT-SUB-MAR)
  useEffect(() => {
    if (formData.categoria && formData.sub_categoria && formData.marca) {
      const catStr = formData.categoria.substring(0, 3).toUpperCase() || "---";
      const subStr =
        formData.sub_categoria.substring(0, 3).toUpperCase() || "---";
      const marStr = formData.marca.substring(0, 3).toUpperCase() || "---";

      setFormData((prev) => ({
        ...prev,
        sku_generado: `${catStr}-${subStr}-${marStr}-AUTO`,
      }));
    }
  }, [formData.categoria, formData.sub_categoria, formData.marca]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });
    const token = localStorage.getItem("token");

    // El payload coincide exactamente con la nueva tabla de MySQL
    const payload = {
      // Enviaremos el prefijo, y el backend asignará el número final (ej. 001)
      sku_interno_prefix: formData.sku_generado.replace("-AUTO", ""),
      part_number: formData.part_number,
      nombre: formData.nombre_producto,
      modelo: formData.modelo,
      marca: formData.marca,
      categoria: formData.categoria,
      sub_categoria: formData.sub_categoria,
      codigo_barras: formData.codigo_barras || null,
      precio_ref: formData.precio_ref,
      tecnologia: formData.tecnologia,
      color: formData.color,
      status_equipo: formData.id_status,
      propiedad: formData.id_prop,
      descripcion: formData.especificaciones,
      stock_actual: 0,
      stock_minimo: formData.stock_minimo,
      stock_maximo: formData.stock_maximo,
    };

    try {
      const response = await fetch("http://localhost:3001/api/inventario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await response.json();
        setMensaje({
          texto: `✅ Producto creado. SKU Asignado: ${data.sku_final}`,
          tipo: "exito",
        });
        if (onProductCreated) onProductCreated();
      } else {
        const data = await response.json();
        setMensaje({ texto: `❌ Error: ${data.message}`, tipo: "error" });
      }
    } catch (error) {
      setMensaje({ texto: "❌ Error de red con el servidor.", tipo: "error" });
    }
  };

  const handleGuardarMaestro = async (e) => {
    // ... (Tu código actual de handleGuardarMaestro se mantiene igual)
    e.preventDefault();
  };

  const inputStyle = {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    width: "100%",
    boxSizing: "border-box",
    fontSize: "0.9rem",
  };
  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontWeight: "bold",
    fontSize: "0.8rem",
    color: "#555",
    textTransform: "uppercase",
  };
  const sectionCardStyle = {
    background: "#f8f9fa",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid #eaeaea",
  };

  if (!diccionarios)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <FaSpinner className="fa-spin" size="2em" color="#1a73e8" />
      </div>
    );

  return (
    <div
      style={{
        maxWidth: "1000px",
        background: "white",
        padding: "30px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #f0f2f5",
          paddingBottom: "15px",
          marginBottom: "25px",
        }}
      >
        <h2 style={{ color: "#1a73e8", margin: 0 }}>
          <FaBoxes /> Registro de Nuevo Producto
        </h2>
      </div>

      {mensaje.texto && (
        <div
          style={{
            padding: "15px",
            marginBottom: "20px",
            borderRadius: "6px",
            fontWeight: "bold",
            background: mensaje.tipo === "exito" ? "#e6f4ea" : "#fce8e6",
            color: mensaje.tipo === "exito" ? "#137333" : "#c5221f",
          }}
        >
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* SECCIÓN A: IDENTIFICACIÓN PRINCIPAL Y FABRICANTE */}
        <div style={sectionCardStyle}>
          <h4 style={{ margin: "0 0 15px 0", color: "#333" }}>
            <FaTag /> 1. Datos de Identificación (Fabricante)
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "15px",
            }}
          >
            <div style={{ gridColumn: "span 3" }}>
              <label style={labelStyle}>Nombre Comercial del Equipo *</label>
              <input
                required
                name="nombre_producto"
                value={formData.nombre_producto}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ej: Zt411 Industrial 4-Inch Wide..."
              />
            </div>

            <div>
              <label style={labelStyle}>Part Number *</label>
              <input
                required
                name="part_number"
                value={formData.part_number}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ej: ZT41142-T010000Z"
              />
            </div>
            <div>
              <label style={labelStyle}>Modelo</label>
              <input
                list="modelos_list"
                name="modelo"
                value={formData.modelo}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Escriba o elija..."
              />
              <datalist id="modelos_list">
                {diccionarios.modelosUnicos?.map((m, idx) => (
                  <option key={idx} value={m.modelo} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Marca *</label>
              <input
                required
                list="marcas_list"
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Escriba para buscar..."
              />
              <datalist id="marcas_list">
                {diccionarios.marca?.map((m, idx) => (
                  <option key={idx} value={m.descripcion} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* SECCIÓN B: LOGÍSTICA E IA */}
        <div
          style={{
            ...sectionCardStyle,
            background: "#f0f4f8",
            borderColor: "#d9e2ec",
          }}
        >
          <h4 style={{ margin: "0 0 15px 0", color: "#1a73e8" }}>
            <FaDatabase /> 2. Clasificación Logística e IA
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "15px",
              alignItems: "center",
            }}
          >
            <div>
              <label style={labelStyle}>Categoría Principal *</label>
              <input
                required
                list="cat_list"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ej: Printers"
              />
              <datalist id="cat_list">
                {diccionarios.categoriasUnicas?.map((c, idx) => (
                  <option key={idx} value={c.categoria} />
                ))}
              </datalist>
            </div>

            <div>
              <label style={labelStyle}>Sub-Categoría *</label>
              <input
                required
                list="subcat_list"
                name="sub_categoria"
                value={formData.sub_categoria}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ej: Industrial Printers"
                disabled={!formData.categoria}
              />
              <datalist id="subcat_list">
                {diccionarios.subCategoriasUnicas
                  ?.filter(
                    (sub) =>
                      sub.categoria?.trim().toUpperCase() ===
                      formData.categoria?.trim().toUpperCase(),
                  )
                  .map((s, idx) => (
                    <option key={idx} value={s.sub_categoria} />
                  ))}
              </datalist>
            </div>

            {/* PREVIEW DEL SKU AUTOMÁTICO */}
            <div
              style={{
                background: "white",
                border: "2px dashed #1a73e8",
                padding: "10px",
                borderRadius: "6px",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  color: "#1a73e8",
                }}
              >
                SKU INTERNO GENERADO:
              </span>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "900",
                  marginTop: "5px",
                }}
              >
                {formData.sku_generado || "---"}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Código de Barras (GTIN)</label>
              <input
                name="codigo_barras"
                value={formData.codigo_barras}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Lector láser..."
              />
            </div>
            <div>
              <label style={labelStyle}>Precio Ref. ($)</label>
              <input
                required
                type="number"
                step="0.01"
                name="precio_ref"
                value={formData.precio_ref}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN C: ATRIBUTOS DE HARDWARE Y GESTIÓN */}
        <div style={sectionCardStyle}>
          <h4 style={{ margin: "0 0 15px 0", color: "#333" }}>
            <FaMicrochip /> 3. Atributos Secundarios y Gestión
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "15px",
            }}
          >
            <div>
              <label style={labelStyle}>Color</label>
              <input
                list="colores_list"
                name="color"
                value={formData.color}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Escriba o elija..."
              />
              <datalist id="colores_list">
                <option value="N/A" />
                {diccionarios.color?.map((c) => (
                  <option key={c.id} value={c.descripcion} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Tecnología</label>
              <input
                list="tecnologia_list"
                name="tecnologia"
                value={formData.tecnologia}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Escriba o elija..."
              />
              <datalist id="tecnologia_list">
                <option value="N/A" />
                {diccionarios.tecnologia?.map((t) => (
                  <option key={t.id} value={t.descripcion} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Status Equipo</label>
              <select
                name="id_status"
                value={formData.id_status}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="Nuevo">Nuevo</option>
                <option value="Refabricado">Refabricado</option>
                <option value="Descontinuado">Descontinuado</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Propiedad</label>
              <select
                name="id_prop"
                value={formData.id_prop}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="Empresa">Empresa</option>
                <option value="Consignacion">Consignación</option>
              </select>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <label style={labelStyle}>
                Especificaciones (Ficha técnica para el Modal)
              </label>
              <textarea
                name="especificaciones"
                value={formData.especificaciones}
                onChange={handleChange}
                rows="2"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "16px",
            background: "#1a73e8",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "1.1rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          <FaSave style={{ marginRight: "10px" }} /> GUARDAR PRODUCTO DEFINITIVO
        </button>
      </form>
    </div>
  );
};

export default CreateProduct;
