import React, { useState } from 'react';
import { FaBarcode, FaTruck, FaUser, FaClipboardCheck, FaSave, FaBox } from 'react-icons/fa';

const EntryPage = () => {
  // Estado para búsqueda
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [productoEncontrado, setProductoEncontrado] = useState(null);
  
  // Estado para el formulario de ingreso
  const [datosIngreso, setDatosIngreso] = useState({
    cantidad: '',
    placa_vehiculo: '',
    nombre_chofer: '',
    observaciones: ''
  });

  // 1. FUNCIÓN BUSCAR PRODUCTO (Al dar Enter en el escáner)
  const buscarProducto = async (e) => {
    e.preventDefault();
    if (!codigoBusqueda) return;

    const token = localStorage.getItem('token');
    try {
      // Reusamos la API de obtener todos y filtramos (o podrías crear una API de búsqueda específica)
      const response = await fetch('http://localhost:3001/api/inventario', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      // Buscamos exacto por código
      const encontrado = data.find(p => p.codigo_barras === codigoBusqueda.trim());
      
      if (encontrado) {
        setProductoEncontrado(encontrado);
        setDatosIngreso({ ...datosIngreso, cantidad: '' }); // Limpiar cantidad previa
      } else {
        alert("❌ Producto no encontrado. Verifique el código o créelo primero.");
        setProductoEncontrado(null);
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    }
  };

  // 2. FUNCIÓN GUARDAR INGRESO
  const handleGuardarIngreso = async (e) => {
    e.preventDefault();
    if(!productoEncontrado) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:3001/api/inventario/ingreso', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_producto: productoEncontrado.id_producto,
          ...datosIngreso
        })
      });

      if (response.ok) {
        alert(`✅ Ingreso Exitoso.\nEl nuevo stock de "${productoEncontrado.nombre_producto}" ha aumentado.`);
        // Limpiar todo para el siguiente producto
        setProductoEncontrado(null);
        setCodigoBusqueda('');
        setDatosIngreso({ cantidad: '', placa_vehiculo: '', nombre_chofer: '', observaciones: '' });
      } else {
        const data = await response.json();
        alert("Error: " + data.message);
      }
    } catch (error) {
      alert("Error al procesar ingreso");
    }
  };

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      
      <div style={{ borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', marginBottom: '20px' }}>
        <h2 style={{ color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaTruck /> Registro de Ingreso de Mercadería
        </h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Recepción de proveedores y actualización de stock (Trazabilidad de Entrada).</p>
      </div>

      {/* --- PASO 1: ESCANEO --- */}
      <div style={{ background: '#e8f0fe', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <form onSubmit={buscarProducto} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FaBarcode style={{ position: 'absolute', left: '15px', top: '15px', color: '#1a73e8' }} />
            <input 
              type="text" 
              placeholder="Escanee el Código de Barras del producto..." 
              value={codigoBusqueda}
              onChange={(e) => setCodigoBusqueda(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '6px', border: '2px solid #1a73e8', fontSize: '1.1rem', outline: 'none' }}
              autoFocus 
            />
          </div>
          <button type="submit" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '0 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            BUSCAR
          </button>
        </form>
      </div>

      {/* --- PASO 2: FORMULARIO DE INGRESO (Solo si se encontró producto) --- */}
      {productoEncontrado && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', animation: 'fadeIn 0.5s' }}>
          
          {/* Tarjeta del Producto (Resumen) */}
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', height: 'fit-content' }}>
            <h3 style={{ marginTop: 0, color: '#333' }}><FaBox /> Producto Detectado</h3>
            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', color: '#666', fontSize: '0.85rem' }}>Nombre:</label>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{productoEncontrado.nombre_producto}</div>
            </div>
            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', color: '#666', fontSize: '0.85rem' }}>Detalles:</label>
              <div>{productoEncontrado.marca} - {productoEncontrado.modelo}</div>
            </div>
            <div style={{ margin: '15px 0', background: 'white', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
              <label style={{ display: 'block', color: '#666', fontSize: '0.85rem' }}>Stock Actual (Sistema):</label>
              <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#1a73e8' }}>{productoEncontrado.stock_actual} Unid.</div>
            </div>
          </div>

          {/* Formulario de Entrada */}
          <form onSubmit={handleGuardarIngreso}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Datos de la Recepción</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Cantidad a Ingresar *</label>
              <input 
                type="number" min="1" required 
                value={datosIngreso.cantidad}
                onChange={(e) => setDatosIngreso({...datosIngreso, cantidad: e.target.value})}
                style={{ width: '100%', padding: '12px', fontSize: '1.2rem', borderRadius: '5px', border: '2px solid #28a745' }}
                placeholder="0"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555' }}><FaTruck /> Placa Vehículo (Opcional)</label>
                <input 
                  type="text" 
                  value={datosIngreso.placa_vehiculo}
                  onChange={(e) => setDatosIngreso({...datosIngreso, placa_vehiculo: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                  placeholder="Ej: GBA-1234"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555' }}><FaUser /> Nombre Chofer/Entrega</label>
                <input 
                  type="text" 
                  value={datosIngreso.nombre_chofer}
                  onChange={(e) => setDatosIngreso({...datosIngreso, nombre_chofer: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#555' }}><FaClipboardCheck /> Observaciones</label>
              <textarea 
                rows="3"
                value={datosIngreso.observaciones}
                onChange={(e) => setDatosIngreso({...datosIngreso, observaciones: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                placeholder="Ej: Compra según factura #001..."
              />
            </div>

            <button type="submit" style={{ width: '100%', padding: '15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <FaSave /> CONFIRMAR INGRESO AL STOCK
            </button>
          </form>

        </div>
      )}
    </div>
  );
};

export default EntryPage;