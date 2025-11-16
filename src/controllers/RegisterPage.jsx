import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3001/api/auth'; 

const RegisterPage = () => {
    // Hooks de React
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombre: '', apellido: '', cedula: '', correo_electronico: '', contrasena: '', id_rol: ''
    });
    const [roles, setRoles] = useState([]);
    const [message, setMessage] = useState(null);
    const [isError, setIsError] = useState(false);

    // Lógica temporal para cargar roles
    useEffect(() => {
        setRoles([
            { id_rol: 1, nombre_rol: 'Gerente' },
            { id_rol: 6, nombre_rol: 'Auxiliar de Almacén' } 
        ]);
        setFormData(prev => ({ ...prev, id_rol: 1 }));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage(null);
        setIsError(false);
        
        try {
            const response = await fetch(`${API_URL}/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al registrar el usuario.');
            }

            setMessage('Usuario registrado exitosamente. Redirigiendo al Login...');
            setTimeout(() => navigate('/login'), 3000); 

        } catch (err) {
            setIsError(true);
            setMessage(err.message);
        }
    };

    // Estructura mínima (sin estilos)
    return (
        <div style={{ padding: '20px', border: '1px solid black' }}>
            <h2>REGISTRO DE USUARIO</h2>
            
            {message && (
                <p style={{ color: isError ? 'red' : 'green' }}>{message}</p>
            )}

            <form onSubmit={handleRegister}>
                <input type="text" name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleChange} required />
                <input type="text" name="apellido" placeholder="Apellido" value={formData.apellido} onChange={handleChange} required />
                <input type="text" name="cedula" placeholder="Número de Cédula" value={formData.cedula} onChange={handleChange} required />
                <input type="email" name="correo_electronico" placeholder="Correo Electrónico" value={formData.correo_electronico} onChange={handleChange} required />
                <input type="password" name="contrasena" placeholder="Contraseña" value={formData.contrasena} onChange={handleChange} required />
                
                <select name="id_rol" onChange={handleChange} value={formData.id_rol} required>
                    <option value="" disabled>Seleccionar Rol</option>
                    {roles.map(rol => (
                        <option key={rol.id_rol} value={rol.id_rol}>
                            {rol.nombre_rol}
                        </option>
                    ))}
                </select>

                <button type="submit">REGISTRAR</button>
                <button type="button" onClick={() => navigate('/login')}>
                    VOLVER AL LOGIN
                </button>
            </form>
        </div>
    );
};

export default RegisterPage;