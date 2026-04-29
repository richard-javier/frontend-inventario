import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBoxOpen, FaEnvelope, FaLock, FaSignInAlt, FaUserPlus, FaShieldAlt } from 'react-icons/fa'; 
import '../css/LoginPage.css'; 

const API_URL = 'http://localhost:3001/api/auth'; 

const LoginPage = ({ onLoginSuccess }) => {
    const [credentials, setCredentials] = useState({
        correo_electronico: '',
        contrasena: ''
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
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
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials), 
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Credenciales inválidas o error de servidor.');
            }

            // 1. Guardamos los datos de sesión en la memoria del navegador
            localStorage.setItem('usuario', JSON.stringify(data.usuario)); 
            
            // 2. ¡EL CAMBIO CLAVE! Llamamos a la función que nos pasó App.jsx
            // Esto actualiza el estado global a "Autenticado" y App.jsx nos redirigirá automáticamente.
            if (onLoginSuccess) {
                onLoginSuccess(data.token);
            } else {
                // Por si acaso estás probando el componente aislado
                localStorage.setItem('token', data.token);
                navigate('/dashboard');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            
            {/* Panel Izquierdo: Branding y Mensaje B2B */}
            <div className="login-branding-panel">
                <div className="branding-content">
                    <FaBoxOpen className="branding-icon" />
                    <h1 className="branding-title">SINCOT</h1>
                    <h2 className="branding-subtitle">Sistema Inteligente de Control Operativo y Trazabilidad</h2>
                    <p className="branding-description">
                        Accede a tu plataforma centralizada para la gestión de inventarios, predicción de demanda y auditoría automatizada con Inteligencia Artificial.
                    </p>
                    
                    <div className="branding-features">
                        <div className="feature-item">
                            <FaShieldAlt className="feature-icon"/> Conexión Segura
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel Derecho: Formulario de Login */}
            <div className="login-form-panel">
                <div className="form-container">
                    
                    <div className="form-header">
                        <h2>Acceso a Cuenta</h2>
                        <p>Ingrese sus credenciales corporativas</p>
                    </div>

                    {error && (
                        <div className="error-alert">
                            <span>⚠️ {error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        
                        <div className="input-group">
                            <label htmlFor="correo">Correo Electrónico</label>
                            <div className="input-wrapper">
                                <FaEnvelope className="input-icon" />
                                <input
                                    id="correo"
                                    type="email"
                                    name="correo_electronico"
                                    placeholder="ejemplo@zbsoluciones.com"
                                    value={credentials.correo_electronico}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="contrasena">Contraseña</label>
                            <div className="input-wrapper">
                                <FaLock className="input-icon" />
                                <input
                                    id="contrasena"
                                    type="password"
                                    name="contrasena"
                                    placeholder="••••••••"
                                    value={credentials.contrasena}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            className={`btn-login ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? 'VERIFICANDO...' : <><FaSignInAlt /> INICIAR SESIÓN</>}
                        </button>
                        
                    </form>

                    <div className="login-footer">
                        <p>¿No tiene credenciales de acceso?</p>
                        <button onClick={() => navigate('/registro')} className="btn-register-link">
                            <FaUserPlus /> Solicitar cuenta a TI
                        </button>
                    </div>

                </div>
            </div>
            
        </div>
    );
};

export default LoginPage;