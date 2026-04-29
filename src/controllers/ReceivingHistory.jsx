import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilePdf, FaCalendarAlt, FaUser, FaBuilding, FaClipboardList } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReceivingHistory = () => {
    const [notas, setNotas] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchNotas = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('http://localhost:3001/api/inventario/notas-ingreso', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setNotas(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error cargando notas", error);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchNotas(); }, []);

    // Función para RE-GENERAR el PDF desde la base de datos
    const descargarPDF = async (idNota) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`http://localhost:3001/api/inventario/notas-ingreso/${idNota}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { cabecera, productos } = await response.json();

            const doc = new jsPDF();
            // ... (Aquí pegamos la misma lógica de PDF que usamos en ReceivingNotePage)
            // Solo que usamos los datos de 'cabecera' y 'productos' que vienen del servidor
            doc.setFontSize(20);
            doc.setTextColor(26, 115, 232);
            doc.text("NOTA DE INGRESO A BODEGA (COPIA)", 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.setTextColor(234, 67, 53);
            doc.text(`Nº ${cabecera.secuencial}`, 190, 20, { align: 'right' });
            
            // Tabla de productos
            autoTable(doc, {
                startY: 75,
                head: [["Pérdida", "Recibida", "Pendiente", "Descripción", "Guía"]],
                body: productos.map(p => [p.perdida, p.recibida, p.pendiente, p.descripcion_producto, p.guia_secuencial]),
                headStyles: { fillColor: [26, 115, 232] }
            });

            doc.save(`Nota_${cabecera.secuencial}_Archivo.pdf`);
        } catch (err) { alert("Error al generar el documento."); }
    };

    const notasFiltradas = notas.filter(n => 
        n.secuencial.includes(filtro) || 
        n.proveedor.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1a73e8' }}>
                    <FaClipboardList /> Archivo Histórico de Notas de Ingreso
                </h2>
                <p style={{ color: '#666', marginBottom: '25px' }}>Consulta y descarga de soportes administrativos de recepción.</p>

                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <FaSearch style={{ position: 'absolute', left: '15px', top: '15px', color: '#aaa' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar por número de nota o proveedor..." 
                        style={inputBusquedaStyle} 
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                    />
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa', textAlign: 'left', color: '#5f6368' }}>
                                <th style={thStyle}>Fecha / Hora</th>
                                <th style={thStyle}>Secuencial</th>
                                <th style={thStyle}>Proveedor</th>
                                <th style={thStyle}>Recibido Por</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Cargando archivo...</td></tr>
                            ) : notasFiltradas.map(n => (
                                <tr key={n.id_nota} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={tdStyle}><FaCalendarAlt color="#aaa" /> {new Date(n.fecha).toLocaleDateString()} - {n.hora.substring(0,5)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#ea4335' }}>Nº {n.secuencial}</td>
                                    <td style={tdStyle}><FaBuilding color="#aaa" /> {n.proveedor}</td>
                                    <td style={tdStyle}><FaUser color="#aaa" /> {n.recibido_nombre}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <button onClick={() => descargarPDF(n.id_nota)} style={btnPdfStyle}>
                                            <FaFilePdf /> Descargar Copia
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Estilos rápidos
const inputBusquedaStyle = { width: '100%', padding: '12px 12px 12px 45px', borderRadius: '8px', border: '1px solid #dadce0', fontSize: '1rem', outline: 'none' };
const thStyle = { padding: '15px', borderBottom: '2px solid #eee', fontSize: '0.85rem', textTransform: 'uppercase' };
const tdStyle = { padding: '15px', fontSize: '0.9rem', color: '#202124' };
const btnPdfStyle = { background: '#fce8e6', color: '#d93025', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' };

export default ReceivingHistory;