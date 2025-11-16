import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserPlus, FaUser, FaIdCard, FaEnvelope, FaLock, FaUsers, FaArrowLeft, FaSave } from 'react-icons/fa';
import '../css/RegisterPage.css'; // Importamos estilos específicos

const API_URL = 'http://localhost:3001/api/auth'; 

const RegisterPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombre: '', apellido: '', cedula: '', correo_electronico: '', contrasena: '', id_rol: ''
    });
    const [roles, setRoles] = useState([]);
    const [message, setMessage] = useState(null);
    const [isError, setIsError] = useState(false);

    // *******************************************************************
    // LÓGICA DE CARGA DE ROLES (Estática por ahora, usa tus IDs de MySQL)
    // *******************************************************************
    useEffect(() => {
        // Lista completa de los 9 roles insertados en tu tabla 'roles' de MySQL
        const allRoles = [
            { id_rol: 1, nombre_rol: 'Gerente' },
            { id_rol: 2, nombre_rol: 'Jefe Administrativo' },
            { id_rol: 3, nombre_rol: 'Asistente' },
            { id_rol: 4, nombre_rol: 'Jefe de Operaciones' },
            { id_rol: 5, nombre_rol: 'Supervisor de Almacén' },
            { id_rol: 6, nombre_rol: 'Auxiliar de Almacén' },
            { id_rol: 7, nombre_rol: 'Jefe de Ventas' },
            { id_rol: 8, nombre_rol: 'Supervisor de Ventas' },
            { id_rol: 9, nombre_rol: 'Vendedor' },
        ];
        
        setRoles(allRoles);
        // Establecer 'Gerente' (id_rol: 1) como rol por defecto
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

    return (
        <div className="register-page-container">
            <form onSubmit={handleRegister} className="register-form-card">
                
                {/* Cabecera del Formulario */}
                <div className="register-logo-container">
                    <FaUserPlus className="register-logo" /> 
                    <h1 className="form-title">Crear Cuenta</h1>
                    <p className="form-subtitle">Ingresa tus datos para acceder al sistema.</p>
                </div>
                
                {/* Mensajes de Éxito/Error */}
                {message && (
                    <p className={`message-box ${isError ? 'error-message' : 'success-message'}`}>
                        {message}
                    </p>
                )}

                {/* Campos de Registro */}
                <div className="input-group">
                    <label className="form-field-label"><FaUser className="input-icon" /> NOMBRE</label>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="input-field" placeholder="Tu nombre" />
                </div>
                
                <div className="input-group">
                    <label className="form-field-label"><FaUser className="input-icon" /> APELLIDO</label>
                    <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} required className="input-field" placeholder="Tu apellido" />
                </div>
                
                <div className="input-group">
                    <label className="form-field-label"><FaIdCard className="input-icon" /> CÉDULA</label>
                    <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} required className="input-field" placeholder="N° de identificación" />
                </div>
                
                <div className="input-group">
                    <label className="form-field-label"><FaEnvelope className="input-icon" /> CORREO ELECTRÓNICO</label>
                    <input type="email" name="correo_electronico" value={formData.correo_electronico} onChange={handleChange} required className="input-field" placeholder="ejemplo@pyme.com" />
                </div>
                
                <div className="input-group">
                    <label className="form-field-label"><FaLock className="input-icon" /> CONTRASEÑA</label>
                    <input type="password" name="contrasena" value={formData.contrasena} onChange={handleChange} required className="input-field" placeholder="Mínimo 8 caracteres" />
                </div>
                
                <div className="input-group">
                    <label className="form-field-label"><FaUsers className="input-icon" /> ROL</label>
                    <select name="id_rol" onChange={handleChange} value={formData.id_rol} required className="select-field">
                        <option value="" disabled>-- Seleccionar Rol --</option>
                        {roles.map(rol => (
                            <option key={rol.id_rol} value={rol.id_rol}>
                                {rol.nombre_rol}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Botones de Acción */}
                <div className="button-group">
                    <button type="submit" className="login-button btn-register-action">
                        <FaSave className="login-button-icon" /> REGISTRAR
                    </button>
                    <button type="button" onClick={() => navigate('/login')} className="login-button btn-back-login">
                        <FaArrowLeft className="login-button-icon" /> VOLVER
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegisterPage;