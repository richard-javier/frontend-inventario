import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBox, FaEnvelope, FaLock, FaSignInAlt, FaUserPlus } from 'react-icons/fa'; // Añadimos FaBox para el logo
import '../css/LoginPage.css'; // Importamos estilos específicos de la página

const API_URL = 'http://localhost:3001/api/auth'; 

const LoginPage = () => {
    const [credentials, setCredentials] = useState({
        correo_electronico: '',
        contrasena: ''
    });
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials), 
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Credenciales inválidas o error de servidor.');
            }

            localStorage.setItem('authToken', data.token);
            localStorage.setItem('usuarioRol', data.usuario.rol); 

            navigate('/dashboard'); 

        } catch (err) {
            setError(err.message);
        }
    };

    const handleRegisterClick = () => {
        navigate('/registro'); 
    };

    return (
        <div className="login-page-container">
            <form onSubmit={handleLogin} className="login-form-card">
                {/* Logo y Título del Sistema */}
                <div className="login-logo-container">
                    <FaBox className="login-logo" /> {/* Icono de caja para el sistema de inventario */}
                    <h1 className="system-title">Sistema de Inventario</h1>
                    <p className="system-subtitle">Control y Trazabilidad Integral</p>
                </div>
                
                {/* Mensaje de Error */}
                {error && <p className="error-message">{error}</p>}

                {/* Campo de Correo Electrónico */}
                <div className="input-group">
                    <label htmlFor="correo" className="form-field-label">
                        <FaEnvelope className="input-icon" /> EMAIL
                    </label>
                    <input
                        id="correo"
                        type="email"
                        name="correo_electronico"
                        placeholder="tu@email.com"
                        value={credentials.correo_electronico}
                        onChange={handleChange}
                        required
                        className="login-input"
                    />
                </div>

                {/* Campo de Contraseña */}
                <div className="input-group">
                    <label htmlFor="contrasena" className="form-field-label">
                        <FaLock className="input-icon" /> CONTRASEÑA
                    </label>
                    <input
                        id="contrasena"
                        type="password"
                        name="contrasena"
                        placeholder="********"
                        value={credentials.contrasena}
                        onChange={handleChange}
                        required
                        className="login-input"
                    />
                </div>
                
                {/* Botones de Acción */}
                <button type="submit" className="login-button btn-login-primary">
                    <FaSignInAlt className="login-button-icon" /> ACCEDER AL SISTEMA
                </button>
                
                <button 
                    type="button" 
                    onClick={handleRegisterClick} 
                    className="login-button btn-login-secondary"
                >
                    <FaUserPlus className="login-button-icon" /> ¿CREAR UNA CUENTA? REGISTRARSE
                </button>
            </form>
        </div>
    );
};

export default LoginPage;