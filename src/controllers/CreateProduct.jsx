import React, { useState } from 'react';
import { FaSave, FaBarcode, FaBox, FaMapMarkerAlt } from 'react-icons/fa';

const CreateProduct = ({ onProductCreated }) => {
  const [formData, setFormData] = useState({
    nombre_producto: '', marca: '', modelo: '', color: '',
    codigo_barras: '', stock_actual: 0, stock_minimo: 5, stock_maximo: 50,
    ubicacion_bodega: ''
  });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('http://localhost:3001/api/inventario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje({ texto: '✅ Producto guardado correctamente', tipo: 'exito' });
        // Limpiar formulario
        setFormData({
          nombre_producto: '', marca: '', modelo: '', color: '',
          codigo_barras: '', stock_actual: 0, stock_minimo: 5, stock_maximo: 50,
          ubicacion_bodega: ''
        });
        if(onProductCreated) onProductCreated(); // Actualizar lista si es necesario
      } else {
        setMensaje({ texto: `❌ Error: ${data.message}`, tipo: 'error' });
      }
    } catch (error) {
      setMensaje({ texto: '❌ Error de conexión con el servidor', tipo: 'error' });
    }
  };

  // Estilos inline simples para mantener el orden (puedes pasarlos a CSS luego)
  const inputStyle = { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '100%' };
  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem', color: '#555' };
  const groupStyle = { marginBottom: '15px' };

  return (
    <div style={{ maxWidth: '800px', background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ borderBottom: '2px solid #f0f2f5', paddingBottom: '10px', marginBottom: '20px' }}>
        <FaBox /> Nuevo Producto - Catálogo
      </h2>

      {mensaje.texto && (
        <div style={{ 
          padding: '10px', marginBottom: '20px', borderRadius: '5px',
          background: mensaje.tipo === 'exito' ? '#d4edda' : '#f8d7da',
          color: mensaje.tipo === 'exito' ? '#155724' : '#721c24'
        }}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Columna 1: Datos Básicos */}
        <div>
          <h4 style={{color: '#4285f4'}}>Información General</h4>
          <div style={groupStyle}>
            <label style={labelStyle}>Nombre del Producto *</label>
            <input required name="nombre_producto" value={formData.nombre_producto} onChange={handleChange} style={inputStyle} placeholder="Ej: Pantalla LED 50''" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Marca</label>
              <input name="marca" value={formData.marca} onChange={handleChange} style={inputStyle} placeholder="Ej: Samsung" />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Modelo</label>
              <input name="modelo" value={formData.modelo} onChange={handleChange} style={inputStyle} placeholder="Ej: UN50T" />
            </div>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Color</label>
            <input name="color" value={formData.color} onChange={handleChange} style={inputStyle} placeholder="Ej: Negro" />
          </div>
        </div>

        {/* Columna 2: Logística */}
        <div>
          <h4 style={{color: '#4285f4'}}>Control y Trazabilidad</h4>
          <div style={groupStyle}>
            <label style={labelStyle}><FaBarcode /> Código de Barras (Único) *</label>
            <input required name="codigo_barras" value={formData.codigo_barras} onChange={handleChange} style={inputStyle} placeholder="Escanee o escriba..." />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}><FaMapMarkerAlt /> Ubicación en Bodega *</label>
            <input required name="ubicacion_bodega" value={formData.ubicacion_bodega} onChange={handleChange} style={inputStyle} placeholder="Ej: Pasillo A - Estante 2" />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Stock Inicial</label>
              <input type="number" name="stock_actual" value={formData.stock_actual} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Mínimo (IA)</label>
              <input type="number" name="stock_minimo" value={formData.stock_minimo} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Máximo</label>
              <input type="number" name="stock_maximo" value={formData.stock_maximo} onChange={handleChange} style={inputStyle} />
            </div>
          </div>
        </div>

        <button type="submit" style={{ 
          gridColumn: '1 / -1', padding: '15px', background: '#4285f4', color: 'white', 
          border: 'none', borderRadius: '5px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' 
        }}>
          <FaSave /> GUARDAR PRODUCTO EN CATÁLOGO
        </button>
      </form>
    </div>
  );
};

export default CreateProduct;