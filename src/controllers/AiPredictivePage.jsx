import React, { useState, useEffect } from 'react';
import { FaBrain, FaSearch, FaDollarSign, FaChartLine, FaSpinner, FaExclamationTriangle, FaRobot, FaArrowUp, FaArrowDown, FaCrosshairs, FaMicrochip, FaTags, FaFilePdf, FaCogs } from 'react-icons/fa';
import { generarOrdenCompraPDF } from '../utils/generadorPDF.js'; 

const AiPredictivePage = () => {
    const [listaCompleta, setListaCompleta] = useState([]);
    const [productosIA, setProductosIA] = useState([]); 
    
    const [busqueda, setBusqueda] = useState('');
    const [mostrarDropdown, setMostrarDropdown] = useState(false);
    
    const [productoSelect, setProductoSelect] = useState(null);
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(2026);
    const [precioManual, setPrecioManual] = useState('');
    
    // NUEVO: Estado para el selector del motor de IA
    const [motorIa, setMotorIa] = useState('RF'); 
    
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [productosCriticos, setProductosCriticos] = useState([]);

    useEffect(() => {
        const cargarDatos = async () => {
            const token = localStorage.getItem('token');
            try {
                // 1. Cargar inventario de Node.js
                const resDB = await fetch('http://localhost:3001/api/inventario', { headers: { 'Authorization': `Bearer ${token}` } });
                const dataDB = await resDB.json();
                const inventarioSeguro = Array.isArray(dataDB) ? dataDB : [];
                setListaCompleta(inventarioSeguro);

                // 2. Cargar SKUs entrenados de Python (¡Asegúrate de que app_ia.py esté corriendo!)
                const resIA = await fetch('http://localhost:5000/skus_entrenados');
                const dataIA = await resIA.json();
                const skusEntrenados = Array.isArray(dataIA.skus) ? dataIA.skus : [];

                const filtradosIA = inventarioSeguro.filter(p => p && p.sku && skusEntrenados.includes(p.sku));
                setProductosIA(filtradosIA);

                const criticos = filtradosIA.filter(p => Number(p.stock_actual) < 15).slice(0, 5);
                setProductosCriticos(criticos);
            } catch (error) { 
                console.error("Error de conexión. Verifique que Node.js y Python estén corriendo.", error); 
            }
        };
        cargarDatos();
    }, []);

    const seleccionarProducto = (prod) => {
        setProductoSelect(prod);
        setPrecioManual(prod.precio_ref || prod.precio || 0); 
        setBusqueda(`${prod.sku} - ${prod.nombre_producto}`);
        setMostrarDropdown(false);
    };

    const seleccionarYAnalizar = async (prod) => {
        seleccionarProducto(prod);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setCargando(true);
        setResultado(null);
        
        // Usamos el precio manual si el usuario lo editó, sino el del producto
        const precioReal = precioManual || prod.precio_ref || prod.precio || 0;

        try {
            // Se envía el parámetro motor_ia a Python
            const res = await fetch('http://localhost:5000/predecir_demanda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    codigo: prod.sku, 
                    mes: parseInt(mes), 
                    anio: parseInt(anio), 
                    precio: parseFloat(precioReal),
                    motor_ia: motorIa 
                })
            });
            const data = await res.json();
            
            setTimeout(() => { 
                let estrategiaPrecio = { sugerencia: "Mantener Precio de Mercado", color: "#1a73e8", icono: <FaTags />, nuevoPrecio: parseFloat(precioReal) };
                if (data.cantidad_estimada > 50 || parseInt(mes) === 11 || parseInt(mes) === 12) {
                    estrategiaPrecio = { sugerencia: "Alta Demanda Estacional: Aumento Premium (+12%)", color: "#137333", icono: <FaArrowUp />, nuevoPrecio: parseFloat(precioReal) * 1.12 };
                } else if (data.cantidad_estimada < 10) {
                    estrategiaPrecio = { sugerencia: "Baja Demanda Proyectada: Descuento (-15%)", color: "#d93025", icono: <FaArrowDown />, nuevoPrecio: parseFloat(precioReal) * 0.85 };
                }
                setResultado({ ...data, estrategiaPrecio }); 
                setCargando(false); 
            }, 1000);
        } catch (error) { setCargando(false); }
    };

    const ejecutarSimulacion = async (e) => {
        e.preventDefault();
        if(!productoSelect) return;
        seleccionarYAnalizar(productoSelect);
    };

    const productosFiltrados = productosIA ? productosIA.filter(p => {
        if (!p) return false;
        const skuS = p.sku ? String(p.sku).toLowerCase() : '';
        const nomS = p.nombre_producto ? String(p.nombre_producto).toLowerCase() : '';
        const busqS = busqueda ? String(busqueda).toLowerCase() : '';
        return skuS.includes(busqS) || nomS.includes(busqS);
    }) : [];

    const obtenerNombreMes = (numeroMes) => {
        const meses = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return meses[parseInt(numeroMes)] || "";
    };

    return (
        <div style={{ padding: '25px', background: '#f4f6f8', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                
                {/* HEADER */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ background: '#e8f0fe', padding: '15px', borderRadius: '12px', color: '#1a73e8' }}><FaBrain size="2.5em" /></div>
                        <div>
                            <h2 style={{ margin: 0, color: '#202124', fontSize: '1.6rem' }}>SINCOT NEURAL ENGINE</h2>
                            <p style={{ margin: 0, color: '#5f6368', fontSize: '0.9rem' }}>Modelo Predictivo Multi-Variable y Precios Dinámicos</p>
                        </div>
                    </div>
                    <div style={{ background: '#e6f4ea', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ceead6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', background: '#137333', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '0.85rem', color: '#137333', fontWeight: 'bold' }}>MODELO ENTRENADO</span>
                    </div>
                </div>

                {/* BLOQUE SUPERIOR */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px', marginBottom: '25px' }}>
                    
                    {/* CONFIGURACIÓN */}
                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e0e0e0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                        <h3 style={{ marginTop: 0, color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', fontSize: '1.2rem' }}>
                            <FaMicrochip /> Parámetros del Oráculo
                        </h3>
                        
                        <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5f6368' }}>DICCIONARIO DE PRODUCTOS IA</label>
                            <div style={{ position: 'relative', marginTop: '8px' }}>
                                <FaSearch style={{ position: 'absolute', left: '12px', top: '14px', color: '#80868b' }} />
                                <input type="text" placeholder="SKU o Nombre..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setMostrarDropdown(true); }} onFocus={() => setMostrarDropdown(true)} style={{ width: '100%', padding: '12px 12px 12px 35px', borderRadius: '8px', border: '2px solid #e8f0fe', background: '#f8f9fa', color: '#202124', boxSizing: 'border-box', outline: 'none', fontSize: '1rem' }} />
                            </div>
                            {mostrarDropdown && busqueda && (
                                <div style={{ position: 'absolute', width: '100%', background: 'white', border: '1px solid #dadce0', borderRadius: '8px', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                                    {productosFiltrados.map(p => (
                                        <div key={p.id_producto} onClick={() => seleccionarProducto(p)} style={{ padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #f0f2f5', fontSize: '0.9rem', color: '#202124' }} onMouseOver={e => e.target.style.background = '#f8f9fa'} onMouseOut={e => e.target.style.background = 'transparent'}>
                                            <strong style={{color: '#1a73e8'}}>{p.sku}</strong> - {p.nombre_producto}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* NUEVO: SELECTOR MULTI-MODELO */}
                        <div style={{ marginBottom: '20px', padding: '15px', background: '#e8f0fe', borderRadius: '8px', border: '1px solid #8ab4f8' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '8px' }}><FaCogs /> MOTOR DE INFERENCIA ANALÍTICA</label>
                            <select value={motorIa} onChange={e => setMotorIa(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #1a73e8', background: 'white', color: '#202124', marginTop: '8px', boxSizing:'border-box', fontSize: '1rem', fontWeight: 'bold' }}>
                                <option value="RF">Random Forest Regressor (R²: 0.82)</option>
                                <option value="XGB">XGBoost Regressor (R²: 0.23)</option>
                                <option value="LR">Regresión Lineal Múltiple (R²: -0.02)</option>
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5f6368' }}>PRECIO BASE ($)</label>
                                <input type="number" step="0.01" value={precioManual} onChange={e => setPrecioManual(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #dadce0', background: 'white', color: '#202124', marginTop: '8px', boxSizing:'border-box', fontSize: '1rem' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5f6368' }}>ESTACIONALIDAD</label>
                                <select value={mes} onChange={e => setMes(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #dadce0', background: 'white', color: '#202124', marginTop: '8px', boxSizing:'border-box', fontSize: '1rem' }}>
                                    <option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option><option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option><option value="7">Julio</option><option value="8">Agosto</option><option value="9">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                                </select>
                            </div>
                        </div>

                        <button onClick={ejecutarSimulacion} disabled={!productoSelect || cargando} style={{ width: '100%', background: (!productoSelect || cargando) ? '#dadce0' : '#1a73e8', color: (!productoSelect || cargando) ? '#80868b' : 'white', padding: '15px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: (!productoSelect || cargando) ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                            {cargando ? <FaSpinner className="fa-spin" /> : <FaBrain />} {cargando ? 'PROCESANDO...' : 'SIMULAR ESCENARIO'}
                        </button>
                    </div>

                    {/* RESULTADOS */}
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e0e0e0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05 }}><FaChartLine size="20em" color="#1a73e8" /></div>
                        
                        {!resultado ? (
                            <div style={{ margin: 'auto', textAlign: 'center', zIndex: 1, padding: '40px' }}>
                                <FaRobot size="5em" color="#dadce0" />
                                <h3 style={{ color: '#5f6368', fontSize: '1.3rem', margin: '15px 0' }}>Esperando Parámetros</h3>
                                <p style={{ color: '#80868b', fontSize: '1rem' }}>Seleccione un SKU y un Motor de IA para comenzar la predicción.</p>
                            </div>
                        ) : (
                            <div style={{ padding: '30px', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', height: '100%' }}>
                                <div style={{ flex: '1 1 200px', textAlign: 'center', borderRight: '2px solid #f0f2f5', paddingRight: '20px' }}>
                                    <span style={{ color: '#5f6368', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>MOTOR UTILIZADO</span>
                                    <div style={{ background: '#e8f0fe', color: '#1a73e8', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', display: 'inline-block' }}>{resultado.motor_utilizado}</div>
                                    <br/>
                                    <span style={{ color: '#5f6368', fontWeight: 'bold', fontSize: '1rem', textTransform: 'uppercase' }}>Demanda Proyectada</span>
                                    <div style={{ fontSize: '6rem', fontWeight: '900', color: '#1a73e8', margin: '10px 0', lineHeight: '1' }}>{resultado.cantidad_estimada}</div>
                                    <div style={{ background: '#e8f0fe', display: 'inline-block', padding: '6px 12px', borderRadius: '20px', color: '#1a73e8', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '20px' }}>
                                        Unidades para el mes de {obtenerNombreMes(mes)}
                                    </div>
                                    
                                    <button 
                                        onClick={() => generarOrdenCompraPDF(productoSelect, obtenerNombreMes(mes), resultado.cantidad_estimada)} 
                                        style={{ width: '100%', background: '#137333', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(19, 115, 51, 0.2)' }}
                                    >
                                        <FaFilePdf size="1.2em"/> Descargar Orden PDF
                                    </button>
                                </div>

                                <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ background: '#f8f9fa', border: `2px solid ${resultado.estrategiaPrecio.color}`, padding: '20px', borderRadius: '12px' }}>
                                        <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#202124' }}>{resultado.estrategiaPrecio.icono} Estrategia de Precio</h4>
                                        <p style={{ color: resultado.estrategiaPrecio.color, fontWeight: 'bold', margin: '0 0 10px 0' }}>{resultado.estrategiaPrecio.sugerencia}</p>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px' }}>
                                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#202124', lineHeight: '1' }}>${resultado.estrategiaPrecio.nuevoPrecio.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div style={{ flex: 1, background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                                            <span style={{ color: '#5f6368', fontSize: '0.8rem', fontWeight: 'bold' }}>Confianza del Modelo</span>
                                            <div style={{ fontSize: '1.4rem', color: resultado.confianza > 70 ? '#137333' : '#d93025', fontWeight: 'bold' }}>{resultado.confianza}%</div>
                                        </div>
                                        <div style={{ flex: 1, background: '#fce8e6', padding: '15px', borderRadius: '12px', border: '1px solid #fad2cf', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <span style={{ color: '#d93025', fontSize: '0.8rem', fontWeight: 'bold' }}>Sugerencia de Compra</span>
                                            <div style={{ fontSize: '1.4rem', color: '#d93025', fontWeight: 'bold', margin: '5px 0' }}>{Math.ceil(resultado.cantidad_estimada * 1.15)} Uds</div>
                                            <div style={{ color: '#ea4335', fontSize: '0.7rem', lineHeight: '1.2' }}>Demanda ({resultado.cantidad_estimada}) <br/>+ 15% Stock Seguridad</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* TABLA INFERIOR: RADAR DE ABASTECIMIENTO CRÍTICO */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div style={{ background: '#fce8e6', padding: '20px', borderBottom: '1px solid #fad2cf', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaExclamationTriangle color="#d93025" size="1.4em" />
                        <h3 style={{ margin: 0, color: '#d93025', fontSize: '1.2rem' }}>Radar de Abastecimiento Crítico</h3>
                    </div>
                    
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa', textAlign: 'left', color: '#5f6368', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '15px 20px' }}>SKU / Producto</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'center' }}>Stock Físico</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'center' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productosCriticos.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#80868b', fontStyle: 'italic' }}>Stock óptimo en todos los productos entrenados.</td>
                                    </tr>
                                ) : (
                                    productosCriticos.map(p => (
                                        <tr key={p.id_producto} style={{ borderBottom: '1px solid #f0f2f5' }}>
                                            <td style={{ padding: '15px 20px' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#202124' }}>{p.nombre_producto}</div>
                                                <small style={{ color: '#1a73e8', fontSize: '0.85rem' }}>{p.sku}</small>
                                            </td>
                                            <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                                <span style={{ background: '#fce8e6', color: '#d93025', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', display: 'inline-block' }}>
                                                    {p.stock_actual} Uds restantes
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                                <button onClick={() => seleccionarYAnalizar(p)} style={{ background: '#e8f0fe', color: '#1a73e8', border: '1px solid #1a73e8', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                    <FaCrosshairs /> Auto-Analizar con I.A.
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AiPredictivePage;