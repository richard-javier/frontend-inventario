import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaChartPie, FaChartBar } from 'react-icons/fa'; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DashboardPage = () => {
  const [productos, setProductos] = useState([]);
  const [historial, setHistorial] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      fetchDatosIniciales(storedToken); 
    }
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

    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', color: '#1a73e8', fontWeight: 'bold' }}>Cargando métricas del sistema...</div>;

  const prepararDatosGrafica = () => {
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const ultimos7Dias = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaKey = fecha.toISOString().split('T')[0];
      ultimos7Dias.push({
        fechaKey,
        name: diasSemana[fecha.getDay()],
        ingresos: 0,
        salidas: 0
      });
    }

    if (Array.isArray(historial)) {
        historial.forEach(mov => {
          if (mov.fecha) {
              const fechaMov = mov.fecha.split('T')[0];
              const diaEncontrado = ultimos7Dias.find(d => d.fechaKey === fechaMov);
              if (diaEncontrado) {
                if (mov.tipo_movimiento === 'INGRESO') diaEncontrado.ingresos += Number(mov.cantidad || 0);
                else diaEncontrado.salidas += Number(mov.cantidad || 0);
              }
          }
        });
    }
    return ultimos7Dias;
  };

  const dataGrafica = prepararDatosGrafica();

  // --- MATEMÁTICA DE LA DONA Y STOCK ---
  const activosReales = productos.filter(p => p.estado !== 'INACTIVO');
  
  const agotados = activosReales.filter(p => Number(p.stock_actual) === 0);
  const criticos = activosReales.filter(p => Number(p.stock_actual) > 0 && Number(p.stock_actual) <= Number(p.stock_minimo));
  const bajos = activosReales.filter(p => Number(p.stock_actual) > Number(p.stock_minimo) && Number(p.stock_actual) <= Number(p.stock_minimo) + 3);
  const ok = activosReales.filter(p => Number(p.stock_actual) > Number(p.stock_minimo) + 3); 

  const productosEnRiesgo = [...agotados, ...criticos, ...bajos].sort((a, b) => a.stock_actual - b.stock_actual).slice(0, 5);
  const maxScale = productosEnRiesgo.length > 0 ? Math.max(...productosEnRiesgo.map(p => Number(p.stock_actual)), 10) : 10;

  const totalItems = activosReales.length || 1; 
  const porcAgotado = (agotados.length / totalItems) * 100;
  const porcCritico = (criticos.length / totalItems) * 100;
  const porcBajo = (bajos.length / totalItems) * 100;

  const donutGradient = `conic-gradient(
    #d93025 0% ${porcAgotado}%, 
    #ea4335 ${porcAgotado}% ${porcAgotado + porcCritico}%, 
    #fbbc04 ${porcAgotado + porcCritico}% ${porcAgotado + porcCritico + porcBajo}%, 
    #34a853 ${porcAgotado + porcCritico + porcBajo}% 100%
  )`;

  return (
    <div style={{ padding: '5px' }}>
      
      {/* TARJETAS SUPERIORES ESTADÍSTICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #212121', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{margin:0, color:'#5f6368', fontSize:'0.85rem', textTransform: 'uppercase'}}>Agotados</h3>
          <p style={{ fontSize: '2.2rem', color: '#212121', margin: '5px 0', fontWeight: 'bold' }}>{agotados.length}</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #ea4335', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{margin:0, color:'#5f6368', fontSize:'0.85rem', textTransform: 'uppercase'}}>Stock Crítico</h3>
          <p style={{ fontSize: '2.2rem', color: '#ea4335', margin: '5px 0', fontWeight: 'bold' }}>{criticos.length}</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #34a853', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{margin:0, color:'#5f6368', fontSize:'0.85rem', textTransform: 'uppercase'}}>Stock Saludable</h3>
          <p style={{ fontSize: '2.2rem', color: '#34a853', margin: '5px 0', fontWeight: 'bold' }}>{ok.length}</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #1a73e8', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{margin:0, color:'#5f6368', fontSize:'0.85rem', textTransform: 'uppercase'}}>Catálogo Total</h3>
          <p style={{ fontSize: '2.2rem', color: '#1a73e8', margin: '5px 0', fontWeight: 'bold' }}>{productos.length}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '30px' }}>
        
        {/* GRÁFICA DE BARRAS */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', color: '#202124', display: 'flex', alignItems: 'center', gap: '10px'}}>
            <FaChartBar color="#1a73e8"/> Movimientos Semanales
          </h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={dataGrafica}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} stroke="#5f6368" />
                <YAxis fontSize={12} stroke="#5f6368" />
                <Tooltip cursor={{fill: '#f4f6f8'}} />
                <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                <Bar dataKey="ingresos" fill="#137333" name="Ingresos" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="salidas" fill="#d93025" name="Salidas" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DONA DE SALUD */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{marginTop: 0, fontSize: '1.1rem', color: '#202124', width: '100%', display: 'flex', alignItems: 'center', gap: '10px'}}><FaChartPie color="#1a73e8"/> Salud del Inventario</h3>
            
            <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: donutGradient, margin: 'auto', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '130px', height: '130px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      <span style={{fontSize: '2rem', fontWeight: '900', color: '#202124'}}>{activosReales.length}</span>
                      <span style={{fontSize: '0.75rem', color: '#5f6368', textTransform: 'uppercase', fontWeight: 'bold'}}>Activos</span>
                </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '15px', fontSize: '0.8rem', color: '#5f6368', marginTop: '20px', width: '100%' }}>
                <span style={{display:'flex', alignItems:'center', gap:'5px', fontWeight: 'bold'}}><div style={{width:'12px', height:'12px', background:'#34a853', borderRadius:'3px'}}></div> OK</span>
                <span style={{display:'flex', alignItems:'center', gap:'5px', fontWeight: 'bold'}}><div style={{width:'12px', height:'12px', background:'#fbbc04', borderRadius:'3px'}}></div> Bajo</span>
                <span style={{display:'flex', alignItems:'center', gap:'5px', fontWeight: 'bold'}}><div style={{width:'12px', height:'12px', background:'#d93025', borderRadius:'3px'}}></div> Agotado</span>
            </div>
        </div>
      </div>

      {/* TOP 5 RIESGOS */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{marginTop: 0, color: '#d93025', display:'flex', alignItems:'center', gap:'10px', fontSize: '1.1rem'}}><FaExclamationTriangle /> Top 5 Prioridad de Reposición</h3>
          <div style={{marginTop: '20px'}}>
              {productosEnRiesgo.length > 0 ? productosEnRiesgo.map(prod => (
                  <div key={prod.id_producto} style={{marginBottom: '20px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginBottom: '8px', color: '#202124', fontWeight:'600'}}>
                          <span>{prod.sku} - {prod.nombre_producto}</span>
                          <span style={{color: prod.stock_actual === 0 ? '#212121' : '#d93025'}}>{prod.stock_actual} Unid.</span>
                        </div>
                        <div style={{width: '100%', background: '#f1f3f4', borderRadius: '10px', height: '14px', overflow:'hidden'}}>
                          <div style={{width: `${(prod.stock_actual / maxScale) * 100}%`, background: prod.stock_actual === 0 ? '#212121' : '#ea4335', height: '100%', transition: 'width 0.5s ease-in-out'}}></div>
                        </div>
                  </div>
              )) : <p style={{textAlign:'center', color:'#5f6368', padding: '20px'}}>No hay alertas pendientes. ¡Inventario Saludable!</p>}
          </div>
      </div>
    </div>
  );
};

export default DashboardPage;