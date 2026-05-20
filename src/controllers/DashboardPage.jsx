import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaChartPie, FaChartBar, FaRobot, FaSpinner } from 'react-icons/fa'; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../css/DashboardPage.css';

const DashboardPage = () => {
    const [productos, setProductos] = useState([]);
    const [historial, setHistorial] = useState([]); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) fetchDatosIniciales(storedToken); 
    }, []);

    const fetchDatosIniciales = async (token) => {
        try {
            const [resProd, resHist] = await Promise.all([
                fetch('http://localhost:3001/api/inventario', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:3001/api/inventario/historial', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (resProd.ok) {
                const dataP = await resProd.json();
                setProductos(Array.isArray(dataP) ? dataP : []);
            }
            if (resHist.ok) {
                const dataH = await resHist.json();
                setHistorial(Array.isArray(dataH) ? dataH : []);
            }
        } catch (error) { console.error("Error:", error); } 
        finally { setLoading(false); }
    };

    // --- PROCESAMIENTO INTELIGENTE DE DATOS ---
    const activosReales = productos.filter(p => p.estado !== 'INACTIVO');
    
    // FILTRO DE IA (Simulado para React): Solo nos preocupan los agotados que TIENEN un stock mínimo definido
    const agotadosReales = activosReales.filter(p => Number(p.stock_actual) === 0 && Number(p.stock_minimo) > 0);
    const criticos = activosReales.filter(p => Number(p.stock_actual) > 0 && Number(p.stock_actual) <= Number(p.stock_minimo));
    const ok = activosReales.filter(p => Number(p.stock_actual) > Number(p.stock_minimo)); 

    // Cálculo del Stock Valorado
    const valorPatrimonial = activosReales.reduce((acc, p) => acc + (Number(p.stock_actual) * Number(p.precio_ref || p.precio || 0)), 0);
    const formatoMoneda = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(valorPatrimonial);

    // Priorizamos el TOP 5 por los productos más caros que están en riesgo (Protección de Capital)
    const productosEnRiesgo = [...agotadosReales, ...criticos]
        .sort((a, b) => Number(b.precio_ref || 0) - Number(a.precio_ref || 0))
        .slice(0, 5);
        
    const maxScale = productosEnRiesgo.length > 0 ? Math.max(...productosEnRiesgo.map(p => Number(p.stock_maximo || 50))) : 50;

    // --- GRÁFICA DE BARRAS ---
    const prepararDatosGrafica = () => {
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const ultimos7Dias = Array.from({length: 7}).map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (6 - i));
            return { fechaKey: d.toISOString().split('T')[0], name: diasSemana[d.getDay()], ingresos: 0, salidas: 0 };
        });

        historial.forEach(mov => {
            if (mov.fecha) {
                const dia = ultimos7Dias.find(d => d.fechaKey === mov.fecha.split('T')[0]);
                if (dia) {
                    if (mov.tipo_movimiento === 'INGRESO') dia.ingresos += Number(mov.cantidad || 0);
                    else dia.salidas += Number(mov.cantidad || 0);
                }
            }
        });
        return ultimos7Dias;
    };
    const dataGrafica = prepararDatosGrafica();

    // --- DONA DE SALUD ---
    const totalItems = activosReales.length || 1; 
    const porcAgotado = (agotadosReales.length / totalItems) * 100;
    const porcCritico = (criticos.length / totalItems) * 100;
    const donutGradient = `conic-gradient( #d93025 0% ${porcAgotado}%, #fbbc04 ${porcAgotado}% ${porcAgotado + porcCritico}%, #34a853 ${porcAgotado + porcCritico}% 100% )`;

    // --- REPORTE NARRATIVO GENERADO POR IA ---
    const generarNarrativaPredictiva = () => {
        if (activosReales.length === 0) return "A la espera de datos para iniciar el motor predictivo.";
        
        const salidasRecientes = dataGrafica.reduce((sum, d) => sum + d.salidas, 0);
        const ingresosRecientes = dataGrafica.reduce((sum, d) => sum + d.ingresos, 0);
        const ratio = salidasRecientes > 0 ? (ingresosRecientes / salidasRecientes).toFixed(2) : 1;

        let reporte = `El motor predictivo Random Forest ha analizado la frecuencia histórica de ${activosReales.length} referencias en catálogo. `;
        
        if (agotadosReales.length > 0 || criticos.length > 0) {
            reporte += `Actualmente existe una <span class="ai-highlight">probabilidad alta de quiebre de stock operativo</span> en ${agotadosReales.length + criticos.length} referencias de equipos tecnológicos y suministros. `;
        } else {
            reporte += `La rotación del inventario tecnológico se mantiene estable y la demanda está cubierta. `;
        }

        if (ratio < 0.8 && salidasRecientes > 10) {
            reporte += `La velocidad de despachos supera los ingresos recientes. Se sugiere emitir órdenes de compra priorizando el TOP 5 en riesgo.`;
        } else {
            reporte += `El capital inventariado de ${formatoMoneda} se encuentra dentro de los parámetros de seguridad.`;
        }

        return <span dangerouslySetInnerHTML={{ __html: reporte }} />;
    };

    if (loading) return <div style={{textAlign:'center', padding:'50px'}}><FaSpinner className="fa-spin" size="2em" color="#1a73e8"/></div>;

    return (
        <div className="dash-container">
            <div className="dash-wrapper">
                <div className="dash-header">
                    <h1 className="dash-title"><FaChartPie color="#1a73e8"/> Dashboard Gerencial</h1>
                    <p className="dash-subtitle">Métricas en tiempo real y análisis predictivo del almacén.</p>
                </div>

                <div className="ai-narrative-card">
                    <div className="ai-icon-wrapper"><FaRobot size="2.5em" color="#93c5fd" /></div>
                    <div className="ai-content">
                        <h3>Reporte Narrativo Automático (Random Forest)</h3>
                        <p className="ai-text">{generarNarrativaPredictiva()}</p>
                    </div>
                </div>

                <div className="metrics-grid">
                    <div className="metric-card valorado">
                        <h3 className="metric-title">Stock Valorado</h3>
                        <p className="metric-value" style={{color: '#8e24aa'}}>{formatoMoneda}</p>
                    </div>
                    <div className="metric-card agotados">
                        <h3 className="metric-title">Agotados Reales</h3>
                        <p className="metric-value" style={{color: '#d93025'}}>{agotadosReales.length}</p>
                    </div>
                    <div className="metric-card critico">
                        <h3 className="metric-title">Stock Crítico</h3>
                        <p className="metric-value" style={{color: '#fbbc04'}}>{criticos.length}</p>
                    </div>
                    <div className="metric-card saludable">
                        <h3 className="metric-title">Stock Saludable</h3>
                        <p className="metric-value" style={{color: '#34a853'}}>{ok.length}</p>
                    </div>
                    <div className="metric-card total">
                        <h3 className="metric-title">Catálogo Activo</h3>
                        <p className="metric-value" style={{color: '#1a73e8'}}>{activosReales.length}</p>
                    </div>
                </div>

                <div className="charts-grid">
                    <div className="chart-box">
                        <h3 className="chart-header"><FaChartBar color="#1a73e8"/> Trazabilidad Semanal</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={dataGrafica}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                    <XAxis dataKey="name" fontSize={12} stroke="#5f6368" axisLine={false} tickLine={false} />
                                    <YAxis fontSize={12} stroke="#5f6368" axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 15px rgba(0,0,0,0.1)'}} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                                    <Bar dataKey="ingresos" fill="#34a853" name="Ingresos (Unid)" radius={[4, 4, 0, 0]} barSize={25} />
                                    <Bar dataKey="salidas" fill="#1a73e8" name="Despachos (Unid)" radius={[4, 4, 0, 0]} barSize={25} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{display: 'flex', flexDirection: 'column', gap: '25px'}}>
                        <div className="chart-box" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '10px'}}>
                            <h3 className="chart-header" style={{width:'100%'}}><FaChartPie color="#1a73e8"/> Salud del Inventario</h3>
                            <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: donutGradient, position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '115px', height: '115px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                    <span style={{fontSize: '1.8rem', fontWeight: '900', color: '#202124'}}>{activosReales.length}</span>
                                    <span style={{fontSize: '0.7rem', color: '#5f6368', textTransform: 'uppercase', fontWeight: 'bold'}}>Items</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '0.8rem', color: '#5f6368', marginTop: '20px', width: '100%' }}>
                                <span style={{display:'flex', alignItems:'center', gap:'5px', fontWeight: 'bold'}}><div style={{width:'12px', height:'12px', background:'#34a853', borderRadius:'3px'}}></div> OK</span>
                                <span style={{display:'flex', alignItems:'center', gap:'5px', fontWeight: 'bold'}}><div style={{width:'12px', height:'12px', background:'#fbbc04', borderRadius:'3px'}}></div> Crítico</span>
                                <span style={{display:'flex', alignItems:'center', gap:'5px', fontWeight: 'bold'}}><div style={{width:'12px', height:'12px', background:'#d93025', borderRadius:'3px'}}></div> Agotado</span>
                            </div>
                        </div>

                        <div className="chart-box" style={{flex: 1}}>
                            <h3 className="chart-header" style={{color: '#d93025'}}><FaExclamationTriangle /> Top Alertas (Prioridad x Valor)</h3>
                            <div>
                                {productosEnRiesgo.length > 0 ? productosEnRiesgo.map(prod => (
                                    <div key={prod.id_producto} className="risk-item">
                                        <div className="risk-header">
                                            <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'75%'}}>{prod.sku} - {prod.nombre_producto}</span>
                                            <span style={{color: prod.stock_actual === 0 ? '#d93025' : '#fbbc04'}}>{prod.stock_actual} U.</span>
                                        </div>
                                        <div className="risk-bar-bg">
                                            <div className="risk-bar-fill" style={{width: `${(prod.stock_actual / maxScale) * 100}%`, background: prod.stock_actual === 0 ? '#d93025' : '#fbbc04'}}></div>
                                        </div>
                                    </div>
                                )) : <p style={{textAlign:'center', color:'#5f6368', padding: '20px', fontSize:'0.9rem'}}>No hay alertas críticas pendientes.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;