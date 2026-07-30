import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API_BASE, IA_BASE } from '../config/api.js';
import {
    FaBell,
    FaBrain,
    FaChartLine,
    FaChartBar,
    FaChartPie,
    FaCheckCircle,
    FaExclamationTriangle,
    FaFilePdf,
    FaRobot,
    FaShoppingCart,
    FaSpinner,
    FaTimes,
    FaWarehouse
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generarOrdenCompraPDF } from '../utils/generadorPDF.js';
import '../css/DashboardPage.css';

const API_NODE = `${API_BASE}`;
const API_IA = `${IA_BASE}`;
const MES_ACTUAL = new Date().getMonth() + 1;
const ANIO_ACTUAL = new Date().getFullYear();

const DashboardPage = () => {
    const [productos, setProductos] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);
    const [prediccionesRF, setPrediccionesRF] = useState({});
    const [estadoModelo, setEstadoModelo] = useState({ status: 'checking', mensaje: 'Conectando con XGBoost' });
    const notifRef = useRef(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) fetchDatosIniciales(storedToken);

        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifications(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDatosIniciales = async (token) => {
        try {
            const [resProd, resHist] = await Promise.all([
                fetch(`${API_NODE}/inventario`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_NODE}/inventario/historial`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (resProd.ok) {
                const dataP = await resProd.json();
                setProductos(Array.isArray(dataP) ? dataP : []);
            }

            if (resHist.ok) {
                const dataH = await resHist.json();
                setHistorial(Array.isArray(dataH) ? dataH : []);
            }
        } catch (error) {
            console.error('Error al cargar dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const activosReales = useMemo(
        () => productos.filter((p) => p.estado !== 'INACTIVO'),
        [productos]
    );

    const inventario = useMemo(() => {
        const agotados = activosReales.filter((p) => Number(p.stock_actual) === 0 && Number(p.stock_minimo) > 0);
        const criticos = activosReales.filter((p) => Number(p.stock_actual) > 0 && Number(p.stock_actual) <= Number(p.stock_minimo));
        const bajos = activosReales.filter((p) => Number(p.stock_actual) > Number(p.stock_minimo) && Number(p.stock_actual) <= Number(p.stock_minimo) + 3);
        const saludables = activosReales.filter((p) => Number(p.stock_actual) > Number(p.stock_minimo) + 3);
        const alertas = [...agotados, ...criticos].sort((a, b) => Number(a.stock_actual) - Number(b.stock_actual));

        return { agotados, criticos, bajos, saludables, alertas };
    }, [activosReales]);

    const alertasKey = useMemo(
        () => inventario.alertas.map((p) => `${p.id_producto}:${p.sku}:${p.stock_actual}`).join('|'),
        [inventario.alertas]
    );

    useEffect(() => {
        if (!alertasKey) {
            setEstadoModelo({ status: 'idle', mensaje: 'Sin alertas para analizar' });
            setPrediccionesRF({});
            return;
        }

        let cancelado = false;

        const cargarPrediccionesRF = async () => {
            setEstadoModelo({ status: 'checking', mensaje: 'Analizando alertas con XGBoost' });

            try {
                const resSkus = await fetch(`${API_IA}/skus_entrenados`);
                if (!resSkus.ok) throw new Error('No se pudo consultar el servicio IA');

                const dataSkus = await resSkus.json();
                const skusEntrenados = Array.isArray(dataSkus.skus) ? dataSkus.skus : [];
                const productosEntrenados = inventario.alertas.filter((p) => skusEntrenados.includes(p.sku)).slice(0, 20);

                if (productosEntrenados.length === 0) {
                    if (!cancelado) {
                        setPrediccionesRF({});
                        setEstadoModelo({ status: 'warning', mensaje: 'Alertas sin SKU entrenado en XGBoost' });
                    }
                    return;
                }

                const resultados = await Promise.allSettled(
                    productosEntrenados.map(async (producto) => {
                        const precio = Number(producto.precio_ref || producto.precio || 0);
                        const resPred = await fetch(`${API_IA}/predecir_demanda`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                codigo: producto.sku,
                                mes: MES_ACTUAL,
                                anio: ANIO_ACTUAL,
                                precio,
                                motor_ia: 'XGB'
                            })
                        });

                        if (!resPred.ok) throw new Error(`Predicción fallida para ${producto.sku}`);
                        const data = await resPred.json();
                        return [producto.id_producto, data];
                    })
                );

                const predicciones = {};
                resultados.forEach((resultado) => {
                    if (resultado.status === 'fulfilled') {
                        const [idProducto, data] = resultado.value;
                        predicciones[idProducto] = data;
                    }
                });

                if (!cancelado) {
                    setPrediccionesRF(predicciones);
                    setEstadoModelo({
                        status: Object.keys(predicciones).length > 0 ? 'online' : 'warning',
                        mensaje: Object.keys(predicciones).length > 0
                            ? `XGBoost activo: ${Object.keys(predicciones).length} alertas priorizadas`
                            : 'XGBoost respondió sin predicciones utilizables'
                    });
                }
            } catch (error) {
                console.error('XGBoost no disponible:', error);
                if (!cancelado) {
                    setPrediccionesRF({});
                    setEstadoModelo({ status: 'offline', mensaje: 'XGBoost sin conexión, usando reposición por stock máximo' });
                }
            }
        };

        cargarPrediccionesRF();
        return () => {
            cancelado = true;
        };
    }, [alertasKey, inventario.alertas]);

    const dataGrafica = useMemo(() => {
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        const ultimos7Dias = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return { fechaKey: d.toISOString().split('T')[0], name: diasSemana[d.getDay()], ingresos: 0, salidas: 0 };
        });

        historial.forEach((mov) => {
            if (!mov.fecha) return;
            const dia = ultimos7Dias.find((d) => d.fechaKey === mov.fecha.split('T')[0]);
            if (!dia) return;

            if (mov.tipo_movimiento === 'INGRESO') dia.ingresos += Number(mov.cantidad || 0);
            else dia.salidas += Number(mov.cantidad || 0);
        });

        return ultimos7Dias;
    }, [historial]);

    const valorPatrimonial = activosReales.reduce(
        (acc, p) => acc + (Number(p.stock_actual) * Number(p.precio_ref || p.precio || 0)),
        0
    );

    const formatoMoneda = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(valorPatrimonial);
    const alertasConIA = inventario.alertas.filter((p) => prediccionesRF[p.id_producto]).length;
    const totalItems = activosReales.length || 1;
    const saludOperativa = Math.round((inventario.saludables.length / totalItems) * 100);
    const salidasRecientes = dataGrafica.reduce((sum, d) => sum + d.salidas, 0);
    const ingresosRecientes = dataGrafica.reduce((sum, d) => sum + d.ingresos, 0);

    const calcularCantidadSugerida = (producto) => {
        const prediccion = prediccionesRF[producto.id_producto];
        if (prediccion?.cantidad_estimada !== undefined) {
            return Math.max(1, Math.ceil(Number(prediccion.cantidad_estimada) * 1.15));
        }

        const stockMaximo = Number(producto.stock_maximo || 0);
        const stockActual = Number(producto.stock_actual || 0);
        return Math.max(1, stockMaximo > stockActual ? stockMaximo - stockActual : Number(producto.stock_minimo || 1));
    };

    const solicitarProducto = (producto) => {
        const cantidadSugerida = calcularCantidadSugerida(producto);
        const demandaBase = prediccionesRF[producto.id_producto]?.cantidad_estimada ?? Math.ceil(cantidadSugerida / 1.15);
        const evaluacion = prediccionesRF[producto.id_producto];
        generarOrdenCompraPDF(producto, 'Actual', demandaBase, evaluacion?.motor_utilizado, evaluacion?.metricas_evaluacion);
    };

    const productosPriorizados = inventario.alertas
        .map((producto) => ({
            ...producto,
            cantidadSugerida: calcularCantidadSugerida(producto),
            demandaIA: prediccionesRF[producto.id_producto]?.cantidad_estimada,
            maeModelo: prediccionesRF[producto.id_producto]?.metricas_evaluacion?.mae
        }))
        .sort((a, b) => b.cantidadSugerida - a.cantidadSugerida)
        .slice(0, 6);

    const porcAgotado = (inventario.agotados.length / totalItems) * 100;
    const porcCritico = (inventario.criticos.length / totalItems) * 100;
    const porcBajo = (inventario.bajos.length / totalItems) * 100;
    const donutGradient = `conic-gradient(#d93025 0% ${porcAgotado}%, #f9ab00 ${porcAgotado}% ${porcAgotado + porcCritico}%, #fbbc04 ${porcAgotado + porcCritico}% ${porcAgotado + porcCritico + porcBajo}%, #34a853 ${porcAgotado + porcCritico + porcBajo}% 100%)`;

    if (loading) {
        return (
            <div className="dash-loading">
                <FaSpinner className="fa-spin" size="2em" />
                <span>Cargando dashboard...</span>
            </div>
        );
    }

    return (
        <div className="dash-container">
            <div className="dash-wrapper">
                <section className="dash-hero">
                    <div className="dash-hero-copy">
                        <span className="dash-eyebrow"><FaWarehouse /> Centro de Control SINCOT</span>
                        <h1>Dashboard Gerencial</h1>
                        <p>Priorización de reposición, salud del inventario y estimación de demanda con XGBoost.</p>
                    </div>

                    <div className="dash-hero-actions" ref={notifRef}>
                        <div className={`model-pill ${estadoModelo.status}`}>
                            <span className="model-dot" />
                            {estadoModelo.mensaje}
                        </div>

                        <button
                            className={`notification-btn ${inventario.alertas.length > 0 ? 'has-alerts' : ''}`}
                            onClick={() => setShowNotifications(!showNotifications)}
                            type="button"
                            title="Alertas de reposicion"
                            aria-label="Alertas de reposicion"
                        >
                            <FaBell />
                            {inventario.alertas.length > 0 && <span>{inventario.alertas.length}</span>}
                        </button>

                        {showNotifications && (
                            <div className="notification-panel">
                                <div className="notification-head">
                                    <h3><FaExclamationTriangle /> Solicitudes sugeridas</h3>
                                    <button onClick={() => setShowNotifications(false)} type="button" title="Cerrar"><FaTimes /></button>
                                </div>

                                <div className="notification-list">
                                    {inventario.alertas.length > 0 ? inventario.alertas.map((p) => (
                                        <div key={p.id_producto} className="notification-item">
                                            <div>
                                                <strong>{p.sku}</strong>
                                                <span>{p.nombre_producto}</span>
                                            </div>
                                            <div className="notification-actions">
                                                <span className={Number(p.stock_actual) === 0 ? 'stock-badge out' : 'stock-badge critical'}>Stock {p.stock_actual}</span>
                                                <button onClick={() => solicitarProducto(p)} type="button">
                                                    <FaFilePdf /> Solicitar
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="empty-state">No hay productos agotados o criticos.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="ai-command-card">
                    <div className="ai-command-icon"><FaBrain /></div>
                    <div>
                        <span>XGBoost · menor RMSE en la evaluación</span>
                        <h2>{inventario.alertas.length} productos requieren reposicion</h2>
                        <p>
                            El modelo prioriza agotados y críticos. {alertasConIA > 0
                                ? `${alertasConIA} productos tienen demanda estimada por IA.`
                                : 'Cuando el servicio Python este disponible, se calculara demanda proyectada automaticamente.'}
                        </p>
                    </div>
                    <div className="ai-command-metrics">
                        <strong>{salidasRecientes}</strong>
                        <span>salidas 7 dias</span>
                        <strong>{ingresosRecientes}</strong>
                        <span>ingresos 7 dias</span>
                    </div>
                </section>

                <section className="metrics-grid">
                    <article className="metric-card valorado">
                        <span>Stock valorado</span>
                        <strong>{formatoMoneda}</strong>
                    </article>
                    <article className="metric-card agotados">
                        <span>Agotados reales</span>
                        <strong>{inventario.agotados.length}</strong>
                    </article>
                    <article className="metric-card critico">
                        <span>Stock critico</span>
                        <strong>{inventario.criticos.length}</strong>
                    </article>
                    <article className="metric-card saludable">
                        <span>Salud operativa</span>
                        <strong>{saludOperativa}%</strong>
                    </article>
                </section>

                <section className="replenishment-card">
                    <div className="section-head">
                        <div>
                            <h2><FaShoppingCart /> Solicitar reposicion prioritaria</h2>
                            <p>Productos agotados y en estado critico listos para generar orden de compra.</p>
                        </div>
                        <span>{productosPriorizados.length} sugerencias visibles</span>
                    </div>

                    <div className="replenishment-table-wrap">
                        <table className="replenishment-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Estado</th>
                                    <th>Demanda IA</th>
                                    <th>Sugerido</th>
                                    <th>Accion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productosPriorizados.length > 0 ? productosPriorizados.map((producto) => (
                                    <tr key={producto.id_producto}>
                                        <td>
                                            <strong>{producto.sku}</strong>
                                            <span>{producto.nombre_producto}</span>
                                        </td>
                                        <td>
                                            <span className={Number(producto.stock_actual) === 0 ? 'stock-badge out' : 'stock-badge critical'}>
                                                {Number(producto.stock_actual) === 0 ? 'Agotado' : 'Critico'} · {producto.stock_actual} u.
                                            </span>
                                        </td>
                                        <td>
                                            {producto.demandaIA !== undefined ? (
                                                <div className="rf-value">
                                                    <strong>{producto.demandaIA} u.</strong>
                                                    <span>MAE: {producto.maeModelo ?? 'N/D'} u.</span>
                                                </div>
                                            ) : (
                                                <span className="muted">Fallback stock max.</span>
                                            )}
                                        </td>
                                        <td><strong>{producto.cantidadSugerida} u.</strong></td>
                                        <td>
                                            <button className="request-btn" onClick={() => solicitarProducto(producto)} type="button">
                                                <FaFilePdf /> Generar orden
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="empty-row"><FaCheckCircle /> No hay solicitudes pendientes.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="charts-grid">
                    <article className="chart-box trend-chart">
                        <h3><FaChartBar /> Trazabilidad semanal</h3>
                        <div className="chart-canvas">
                            <ResponsiveContainer>
                                <BarChart data={dataGrafica}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e8eb" />
                                    <XAxis dataKey="name" fontSize={12} stroke="#667085" axisLine={false} tickLine={false} />
                                    <YAxis fontSize={12} stroke="#667085" axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f5f7fa' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e6e8eb' }} />
                                    <Legend />
                                    <Bar dataKey="ingresos" fill="#34a853" name="Ingresos" radius={[4, 4, 0, 0]} barSize={26} />
                                    <Bar dataKey="salidas" fill="#2563eb" name="Despachos" radius={[4, 4, 0, 0]} barSize={26} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <article className="chart-box health-card">
                        <h3><FaChartPie /> Salud del inventario</h3>
                        <div className="donut" style={{ background: donutGradient }}>
                            <div>
                                <strong>{activosReales.length}</strong>
                                <span>items</span>
                            </div>
                        </div>
                        <div className="legend-list">
                            <span><i className="ok" /> Saludable</span>
                            <span><i className="low" /> Bajo</span>
                            <span><i className="critical" /> Critico</span>
                            <span><i className="out" /> Agotado</span>
                        </div>
                    </article>

                    <article className="chart-box risk-card">
                        <h3><FaChartLine /> Prioridad por IA</h3>
                        {productosPriorizados.length > 0 ? productosPriorizados.slice(0, 4).map((producto) => (
                            <div key={producto.id_producto} className="risk-item">
                                <div className="risk-header">
                                    <span>{producto.sku}</span>
                                    <strong>{producto.cantidadSugerida} u.</strong>
                                </div>
                                <div className="risk-bar-bg">
                                    <div
                                        className={Number(producto.stock_actual) === 0 ? 'risk-bar-fill out' : 'risk-bar-fill critical'}
                                        style={{ width: `${Math.min(100, (producto.cantidadSugerida / Math.max(1, productosPriorizados[0].cantidadSugerida)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )) : (
                            <p className="empty-state">Inventario estable.</p>
                        )}
                    </article>
                </section>
            </div>
        </div>
    );
};

export default DashboardPage;
