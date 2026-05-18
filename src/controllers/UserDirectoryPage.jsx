import React, { useState, useEffect } from 'react';
import { FaUsers, FaEdit, FaTrash, FaSpinner, FaTimes, FaToggleOn, FaToggleOff } from 'react-icons/fa';

const UserDirectoryPage = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editModal, setEditModal] = useState({ open: false, data: {} });
    const [feedback, setFeedback] = useState({ type: '', text: '' });
    const token = localStorage.getItem('token');

    const cargarUsuarios = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/auth/usuarios', { headers: { 'Authorization': `Bearer ${token}` }});
            if (res.ok) setUsuarios(await res.json());
        } catch(e) { console.error("Error al cargar directorio"); }
        setLoading(false);
    };

    useEffect(() => { cargarUsuarios(); }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        const { nombre, apellido, cedula, correo_electronico, estado } = editModal.data;

        if (!nombre?.trim() || !apellido?.trim() || !cedula?.trim() || !correo_electronico?.trim() || !estado?.trim()) {
            setFeedback({ type: 'error', text: 'Por favor completa todos los campos obligatorios.' });
            return;
        }

        try {
            const res = await fetch(`http://localhost:3001/api/auth/usuarios/${editModal.data.id_usuario}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(editModal.data)
            });

            if (res.ok) {
                setFeedback({ type: 'success', text: 'Usuario actualizado correctamente.' });
                setTimeout(() => { setEditModal({ open: false, data: {} }); cargarUsuarios(); setFeedback({ type: '', text: '' }); }, 1500);
            } else {
                setFeedback({ type: 'error', text: 'Error al actualizar.' });
            }
        } catch(e) { setFeedback({ type: 'error', text: 'Error de red.' }); }
    };

    const toggleUsuarioEstado = async (usuario) => {
        const nuevoEstado = usuario.estado === 'Inactivo' ? 'Activo' : 'Inactivo';
        try {
            const res = await fetch(`http://localhost:3001/api/auth/usuarios/${usuario.id_usuario}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...usuario, estado: nuevoEstado })
            });
            if (res.ok) cargarUsuarios();
            else alert('No se pudo cambiar el estado.');
        } catch(e) { alert("Error de red."); }
    };

    const handleEliminar = async (id, nombre) => {
        if(window.confirm(`⚠️ ¿Desea eliminar permanentemente del sistema a ${nombre}?`)) {
            try {
                const res = await fetch(`http://localhost:3001/api/auth/usuarios/${id}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if(res.ok) { alert("✅ " + data.message); cargarUsuarios(); }
                else { alert("❌ " + data.message); }
            } catch(e) { alert("Error al eliminar."); }
        }
    };

    return (
        <div style={{ padding: '30px', background: '#f8f9fa', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <h2 style={{ color: '#202124', marginBottom: '20px' }}><FaUsers/> Directorio de Personal</h2>
                
                {loading ? <div style={{textAlign:'center'}}><FaSpinner className="fa-spin" size="2em" color="#1a73e8"/></div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e0e0e0', color: '#5f6368', background: '#f0f2f5', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                                <th style={{padding:'15px', textAlign:'left'}}>Nombre</th>
                                <th style={{padding:'15px', textAlign:'left'}}>Correo Electrónico</th>
                                <th style={{padding:'15px', textAlign:'center'}}>Cédula</th>
                                <th style={{padding:'15px', textAlign:'center'}}>Teléfono</th>
                                <th style={{padding:'15px', textAlign:'center'}}>Rol</th>
                                <th style={{padding:'15px', textAlign:'center'}}>Estado</th>
                                <th style={{padding:'15px', textAlign:'center'}}>Creado</th>
                                <th style={{padding:'15px', textAlign:'center'}}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => (
                                <tr key={u.id_usuario} style={{ borderBottom: '1px solid #f1f3f4', opacity: u.estado === 'Inactivo' ? 0.6 : 1, transition: '0.3s' }}>
                                    <td style={{padding:'15px', fontWeight:'bold', color:'#202124'}}>{u.nombre} {u.apellido}</td>
                                    <td style={{padding:'15px', color:'#1a73e8'}}>{u.correo_electronico}</td>
                                    <td style={{padding:'15px', textAlign:'center', color:'#5f6368'}}>{u.cedula}</td>
                                    <td style={{padding:'15px', textAlign:'center', color:'#5f6368'}}>{u.telefono}</td>
                                    <td style={{padding:'15px', textAlign:'center', fontWeight:'bold', color:'#5f6368'}}>{u.nombre_rol}</td>
                                    <td style={{padding:'15px', textAlign:'center'}}>
                                        <span style={{display:'inline-flex', alignItems:'center', gap:'5px', padding:'6px 12px', borderRadius:'8px', fontSize:'0.85rem', fontWeight:'bold', color: u.estado === 'Inactivo' ? '#d93025' : '#137333', background: u.estado === 'Inactivo' ? '#fce8e6' : '#e6f4ea'}}>
                                            {u.estado}
                                        </span>
                                    </td>
                                    <td style={{padding:'15px', textAlign:'center', color:'#5f6368'}}>{u.fecha}</td>
                                    <td style={{padding:'15px', textAlign:'center', display:'flex', justifyContent:'center', gap:'15px'}}>
                                        <button onClick={() => { setFeedback({type:'', text:''}); setEditModal({open:true, data:{...u, estado: u.estado || 'Activo'}}); }} style={{background:'none', color:'#1a73e8', border:'none', cursor:'pointer', fontSize:'1.1rem'}} title="Editar"><FaEdit/></button>
                                        
                                        <button onClick={() => toggleUsuarioEstado(u)} style={{background:'none', color: u.estado === 'Inactivo' ? '#137333' : '#d93025', border:'none', cursor:'pointer', fontSize:'1.2rem'}} title={u.estado === 'Inactivo' ? 'Activar' : 'Inactivar'}>
                                            {u.estado === 'Inactivo' ? <FaToggleOff/> : <FaToggleOn/>}
                                        </button>

                                        <button onClick={() => handleEliminar(u.id_usuario, u.nombre)} style={{background:'none', color:'#d93025', border:'none', cursor:'pointer', fontSize:'1.1rem'}} title="Borrar Físicamente"><FaTrash/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de Edición */}
            {editModal.open && (
                <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                    <form onSubmit={handleUpdate} style={{background:'white', padding:'30px', borderRadius:'12px', width:'100%', maxWidth:'450px', boxShadow:'0 10px 30px rgba(0,0,0,0.2)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                            <h3 style={{margin:0, color:'#202124'}}>Editar Información</h3>
                            <FaTimes onClick={() => setEditModal({open:false, data:{}})} style={{cursor:'pointer', color:'#5f6368', fontSize:'1.2rem'}}/>
                        </div>

                        {feedback.text && (
                            <div style={{marginBottom:'15px', padding:'10px', borderRadius:'8px', background: feedback.type === 'success' ? '#e6f4ea' : '#fce8e6', color: feedback.type === 'success' ? '#137333' : '#d93025', fontWeight:'bold', fontSize:'0.9rem' }}>
                                {feedback.text}
                            </div>
                        )}

                        <div style={{display:'grid', gap:'12px'}}>
                            <input placeholder="Nombre" value={editModal.data.nombre || ''} onChange={e => setEditModal({...editModal, data:{...editModal.data, nombre: e.target.value}})} style={{padding:'10px', borderRadius:'6px', border:'1px solid #dadce0', width:'100%', boxSizing:'border-box'}} />
                            <input placeholder="Apellido" value={editModal.data.apellido || ''} onChange={e => setEditModal({...editModal, data:{...editModal.data, apellido: e.target.value}})} style={{padding:'10px', borderRadius:'6px', border:'1px solid #dadce0', width:'100%', boxSizing:'border-box'}} />
                            <input placeholder="Correo Electrónico" value={editModal.data.correo_electronico || ''} onChange={e => setEditModal({...editModal, data:{...editModal.data, correo_electronico: e.target.value}})} style={{padding:'10px', borderRadius:'6px', border:'1px solid #dadce0', width:'100%', boxSizing:'border-box'}} />
                            <input placeholder="Cédula" value={editModal.data.cedula || ''} onChange={e => setEditModal({...editModal, data:{...editModal.data, cedula: e.target.value}})} style={{padding:'10px', borderRadius:'6px', border:'1px solid #dadce0', width:'100%', boxSizing:'border-box'}} />
                            <input placeholder="Teléfono" value={editModal.data.telefono || ''} onChange={e => setEditModal({...editModal, data:{...editModal.data, telefono: e.target.value}})} style={{padding:'10px', borderRadius:'6px', border:'1px solid #dadce0', width:'100%', boxSizing:'border-box'}} />
                            
                            <select value={editModal.data.estado || 'Activo'} onChange={e => setEditModal({...editModal, data:{...editModal.data, estado: e.target.value}})} style={{padding:'10px', borderRadius:'6px', border:'1px solid #dadce0', width:'100%', boxSizing:'border-box', fontWeight:'bold'}}>
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                        </div>

                        <div style={{display:'flex', justifyContent:'flex-end', marginTop:'25px', gap:'10px'}}>
                            <button type="button" onClick={() => setEditModal({open:false, data:{}})} style={{padding:'10px 20px', background:'#f1f3f4', color:'#3c4043', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>Cancelar</button>
                            <button type="submit" style={{padding:'10px 20px', background:'#1a73e8', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default UserDirectoryPage;