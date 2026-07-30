import React, { useState, useEffect } from "react";
import { API_BASE } from '../config/api.js';
import {
  FaSave,
  FaTag,
  FaDatabase,
  FaSpinner,
  FaBoxes,
  FaMicrochip,
} from "react-icons/fa";
import "../css/CreateProduct.css";

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
        `${API_BASE}/inventario/maestros`,
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

  const normalizar = (valor = "") => valor.toString().trim().toUpperCase();

  const getMarcaDesdeModelo = (modelo) => {
    const modeloSeleccionado = diccionarios?.modelosUnicos?.find(
      (item) => normalizar(item.modelo) === normalizar(modelo),
    );

    return (
      modeloSeleccionado?.marca ||
      modeloSeleccionado?.descripcion_marca ||
      modeloSeleccionado?.marca_descripcion ||
      modeloSeleccionado?.fabricante ||
      ""
    );
  };

  const modelosFiltrados = (diccionarios?.modelosUnicos || []).filter((modelo) => {
    const marcaModelo = getMarcaDesdeModelo(modelo.modelo);
    return !formData.marca || !marcaModelo || normalizar(marcaModelo) === normalizar(formData.marca);
  });

  const subCategoriasFiltradas = (diccionarios?.subCategoriasUnicas || []).filter(
    (sub) => normalizar(sub.categoria) === normalizar(formData.categoria),
  );

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

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "modelo") {
      const marcaModelo = getMarcaDesdeModelo(value);
      setFormData((prev) => ({
        ...prev,
        modelo: value,
        marca: marcaModelo || prev.marca,
      }));
      return;
    }

    if (name === "categoria") {
      setFormData((prev) => ({
        ...prev,
        categoria: value,
        sub_categoria: normalizar(value) === normalizar(prev.categoria) ? prev.sub_categoria : "",
      }));
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

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
      const response = await fetch(`${API_BASE}/inventario`, {
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
        const data = await response.json().catch(() => ({}));
        setMensaje({
          texto: `❌ Error: ${data.message || "No se pudo guardar el producto."}`,
          tipo: "error",
        });
      }
    } catch (error) {
      setMensaje({ texto: "❌ Error de red con el servidor.", tipo: "error" });
    }
  };

  const handleGuardarMaestro = async (e) => {
    // ... (Tu código actual de handleGuardarMaestro se mantiene igual)
    e.preventDefault();
  };

  if (!diccionarios)
    return (
      <div className="create-product-loading">
        <FaSpinner className="fa-spin" size="2em" color="#1a73e8" />
      </div>
    );

  return (
    <div className="create-product-page">
      <div className="create-product-header">
        <div>
          <h2><span><FaBoxes /></span> Registro de Nuevo Producto</h2>
          <p>Alta inteligente con SKU interno automático, relación modelo-marca y GTIN opcional.</p>
        </div>
        <div className="create-product-sku">
          <span>SKU interno</span>
          <strong>{formData.sku_generado || "---"}</strong>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`create-product-alert ${mensaje.tipo === "exito" ? "success" : "error"}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-product-form">
        <section className="product-section">
          <div className="product-section-title">
            <FaTag />
            <div>
              <h3>Identificación del fabricante</h3>
              <p>Use Part Number como identificador principal técnico. GTIN queda como apoyo de escaneo.</p>
            </div>
          </div>

          <div className="product-grid">
            <label className="product-field product-field-wide">
              <span>Nombre comercial del equipo *</span>
              <input
                required
                name="nombre_producto"
                value={formData.nombre_producto}
                onChange={handleChange}
                placeholder="Ej: Zt411 Industrial 4-Inch Wide..."
              />
            </label>

            <label className="product-field">
              <span>Part Number *</span>
              <input
                required
                name="part_number"
                value={formData.part_number}
                onChange={handleChange}
                placeholder="Ej: ZT41142-T010000Z"
              />
            </label>

            <label className="product-field">
              <span>Modelo</span>
              <input
                list="modelos_list"
                name="modelo"
                value={formData.modelo}
                onChange={handleChange}
                placeholder="Escriba o elija..."
              />
              <datalist id="modelos_list">
                {modelosFiltrados.map((m, idx) => (
                  <option key={idx} value={m.modelo} />
                ))}
              </datalist>
            </label>

            <label className="product-field">
              <span>Marca *</span>
              <input
                required
                list="marcas_list"
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                placeholder={formData.modelo ? "Se completa al elegir modelo..." : "Escriba para buscar..."}
              />
              <datalist id="marcas_list">
                {diccionarios.marca?.map((m, idx) => (
                  <option key={idx} value={m.descripcion} />
                ))}
              </datalist>
            </label>
          </div>
        </section>

        <section className="product-section product-section-blue">
          <div className="product-section-title">
            <FaDatabase />
            <div>
              <h3>Clasificación logística e IA</h3>
              <p>La subcategoría depende de la categoría, y el SKU se recalcula en vivo.</p>
            </div>
          </div>

          <div className="product-grid product-grid-three">
            <label className="product-field">
              <span>Categoría principal *</span>
              <input
                required
                list="cat_list"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                placeholder="Ej: Printers"
              />
              <datalist id="cat_list">
                {diccionarios.categoriasUnicas?.map((c, idx) => (
                  <option key={idx} value={c.categoria} />
                ))}
              </datalist>
            </label>

            <label className="product-field">
              <span>Subcategoría *</span>
              <input
                required
                list="subcat_list"
                name="sub_categoria"
                value={formData.sub_categoria}
                onChange={handleChange}
                placeholder="Ej: Industrial Printers"
                disabled={!formData.categoria}
              />
              <datalist id="subcat_list">
                {subCategoriasFiltradas.map((s, idx) => (
                    <option key={idx} value={s.sub_categoria} />
                  ))}
              </datalist>
            </label>

            <div className="sku-preview">
              <span>SKU generado</span>
              <strong>{formData.sku_generado || "---"}</strong>
            </div>

            <label className="product-field">
              <span>Código de Barras (GTIN) opcional</span>
              <input
                name="codigo_barras"
                value={formData.codigo_barras}
                onChange={handleChange}
                placeholder="Opcional: EAN/UPC/GTIN si viene en etiqueta"
              />
              <small>Para tus equipos, el Part Number suele ser más importante. GTIN sirve si el proveedor trae código escaneable.</small>
            </label>

            <label className="product-field">
              <span>Precio Ref. ($)</span>
              <input
                required
                type="number"
                step="0.01"
                name="precio_ref"
                value={formData.precio_ref}
                onChange={handleChange}
              />
            </label>
          </div>
        </section>

        <section className="product-section">
          <div className="product-section-title">
            <FaMicrochip />
            <div>
              <h3>Atributos y gestión</h3>
              <p>Datos operativos para inventario, búsqueda y reposición.</p>
            </div>
          </div>

          <div className="product-grid product-grid-four">
            <label className="product-field">
              <span>Color</span>
              <input
                list="colores_list"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="Escriba o elija..."
              />
              <datalist id="colores_list">
                <option value="N/A" />
                {diccionarios.color?.map((c) => (
                  <option key={c.id} value={c.descripcion} />
                ))}
              </datalist>
            </label>

            <label className="product-field">
              <span>Tecnología</span>
              <input
                list="tecnologia_list"
                name="tecnologia"
                value={formData.tecnologia}
                onChange={handleChange}
                placeholder="Escriba o elija..."
              />
              <datalist id="tecnologia_list">
                <option value="N/A" />
                {diccionarios.tecnologia?.map((t) => (
                  <option key={t.id} value={t.descripcion} />
                ))}
              </datalist>
            </label>

            <label className="product-field">
              <span>Status equipo</span>
              <select
                name="id_status"
                value={formData.id_status}
                onChange={handleChange}
              >
                <option value="Nuevo">Nuevo</option>
                <option value="Refabricado">Refabricado</option>
                <option value="Descontinuado">Descontinuado</option>
              </select>
            </label>

            <label className="product-field">
              <span>Propiedad</span>
              <select
                name="id_prop"
                value={formData.id_prop}
                onChange={handleChange}
              >
                <option value="Empresa">Empresa</option>
                <option value="Consignacion">Consignación</option>
              </select>
            </label>

            <label className="product-field product-field-wide">
              <span>Especificaciones</span>
              <textarea
                name="especificaciones"
                value={formData.especificaciones}
                onChange={handleChange}
                rows="3"
                placeholder="Ficha técnica, compatibilidad, accesorios incluidos..."
              />
            </label>
          </div>
        </section>

        <button type="submit" className="create-product-submit">
          <FaSave /> Guardar producto definitivo
        </button>
      </form>
    </div>
  );
};

export default CreateProduct;
