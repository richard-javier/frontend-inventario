import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaSave } from 'react-icons/fa';

const CreateUserPage = () => {
    const [formData, setFormData] = useState({ nombre: '', apellido: '', cedula: '', telefono: '', correo_electronico: '', contrasena: '', id_rol: 1 });
    const [roles, setRoles] = useState([]);
    
    useEffect(() => {
        setRoles([ { id_rol: 1, nombre_rol: 'Gerente' }, { id_rol: 2, nombre_rol: 'Sistemas' }, { id_rol: 3, nombre_rol: 'Supervisor' }, { id_rol: 6, nombre_rol: 'Bodeguero' } ]); // Añade los 9 aquí
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:3001/api/auth/registro', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(formData)
            });
            if(res.ok) { alert("✅ Usuario Creado"); setFormData({ nombre: '', apellido: '', cedula: '', telefono: '', correo_electronico: '', contrasena: '', id_rol: 1 }); }
            else { alert("❌ Error en registro"); }
        } catch(e) { alert("Error de red"); }
    };

    return (
        <div style={{ padding: '25px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', borderTop: '5px solid #1a73e8' }}>
                <h2><FaUserPlus/> Matricular Nuevo Empleado</h2>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop:'20px' }}>
                    <input type="text" placeholder="Nombres" required value={formData.nombre} onChange={e=>setFormData({...formData, nombre: e.target.value})} style={{padding:'10px'}} />
                    <input type="text" placeholder="Apellidos" required value={formData.apellido} onChange={e=>setFormData({...formData, apellido: e.target.value})} style={{padding:'10px'}} />
                    <input type="text" placeholder="Cédula" required value={formData.cedula} onChange={e=>setFormData({...formData, cedula: e.target.value})} style={{padding:'10px'}} />
                    <input type="text" placeholder="Teléfono" value={formData.telefono} onChange={e=>setFormData({...formData, telefono: e.target.value})} style={{padding:'10px'}} />
                    <input type="email" placeholder="Correo Corporativo" required value={formData.correo_electronico} onChange={e=>setFormData({...formData, correo_electronico: e.target.value})} style={{padding:'10px'}} />
                    <input type="password" placeholder="Contraseña Temporal" required value={formData.contrasena} onChange={e=>setFormData({...formData, contrasena: e.target.value})} style={{padding:'10px'}} />
                    <select required value={formData.id_rol} onChange={e=>setFormData({...formData, id_rol: e.target.value})} style={{padding:'10px', gridColumn: '1 / -1'}}>
                        {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>)}
                    </select>
                    <button type="submit" style={{ gridColumn: '1 / -1', padding: '15px', background: '#1a73e8', color:'white', border:'none', fontWeight:'bold', cursor:'pointer' }}><FaSave/> GUARDAR</button>
                </form>
            </div>
        </div>
    );
};
export default CreateUserPage;