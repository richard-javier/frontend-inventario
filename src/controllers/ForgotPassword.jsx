import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config/api.js';
import { FaArrowLeft, FaEnvelope, FaPaperPlane, FaShieldAlt } from 'react-icons/fa';
import '../css/LoginPage.css';

const API_URL = `${API_BASE}/auth`;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
    const [correoElectronico, setCorreoElectronico] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const email = correoElectronico.trim();
        setError('');
        setSuccess('');

        if (!EMAIL_REGEX.test(email)) {
            setError('Ingresa un correo electrónico válido.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo_electronico: email }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'No se pudo procesar la solicitud.');
            }

            setSuccess(data.message);
            setCorreoElectronico('');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-branding-panel">
                <div className="branding-content">
                    <FaShieldAlt className="branding-icon" />
                    <h1 className="branding-title">SINCOT</h1>
                    <h2 className="branding-subtitle">Recuperación segura de acceso</h2>
                    <p className="branding-description">
                        Recibirás un enlace temporal y de un solo uso para restablecer tu contraseña corporativa.
                    </p>
                </div>
            </div>

            <div className="login-form-panel">
                <div className="form-container">
                    <div className="form-header">
                        <span className="login-kicker">SINCOT WMS</span>
                        <h2>Recuperar contraseña</h2>
                        <p>Ingresa el correo asociado a tu cuenta</p>
                    </div>

                    {error && (
                        <div className="error-alert" role="alert" aria-live="assertive">
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="success-alert" role="status" aria-live="polite">
                            <span>{success}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="correo-recuperacion">Correo Electrónico</label>
                            <div className="input-wrapper">
                                <FaEnvelope className="input-icon" />
                                <input
                                    id="correo-recuperacion"
                                    type="email"
                                    name="correo_electronico"
                                    placeholder="ejemplo@zbsoluciones.com"
                                    value={correoElectronico}
                                    onChange={(e) => setCorreoElectronico(e.target.value)}
                                    required
                                    autoComplete="email"
                                    aria-describedby="forgot-password-help"
                                    disabled={isLoading}
                                />
                            </div>
                            <p id="forgot-password-help" className="field-help">
                                Por seguridad, la respuesta será la misma exista o no la cuenta.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className={`btn-login ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? 'ENVIANDO...' : <><FaPaperPlane /> ENVIAR ENLACE</>}
                        </button>
                    </form>

                    <div className="form-actions">
                        <Link to="/login" className="form-link">
                            <FaArrowLeft /> Volver al inicio de sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
