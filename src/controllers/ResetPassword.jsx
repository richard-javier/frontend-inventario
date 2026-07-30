import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../config/api.js';
import { FaArrowLeft, FaCheckCircle, FaKey, FaLock, FaShieldAlt } from 'react-icons/fa';
import '../css/LoginPage.css';

const API_URL = `${API_BASE}/auth`;

const validatePassword = (password) => {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!/[a-z]/.test(password)) return 'Incluye al menos una letra minúscula.';
    if (!/[A-Z]/.test(password)) return 'Incluye al menos una letra mayúscula.';
    if (!/\d/.test(password)) return 'Incluye al menos un número.';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Incluye al menos un símbolo.';
    return '';
};

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
    const [formData, setFormData] = useState({ password_nueva: '', confirmar_password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!token) {
            setError('El enlace de recuperación no es válido o expiró.');
            return;
        }

        const passwordError = validatePassword(formData.password_nueva);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (formData.password_nueva !== formData.confirmar_password) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password_nueva: formData.password_nueva }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'No se pudo actualizar la contraseña.');
            }

            setSuccess(data.message);
            setFormData({ password_nueva: '', confirmar_password: '' });
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
                    <FaKey className="branding-icon" />
                    <h1 className="branding-title">SINCOT</h1>
                    <h2 className="branding-subtitle">Restablecimiento de contraseña</h2>
                    <p className="branding-description">
                        Define una contraseña fuerte. El enlace se invalida después de usarlo.
                    </p>
                </div>
            </div>

            <div className="login-form-panel">
                <div className="form-container">
                    <div className="form-header">
                        <span className="login-kicker">SINCOT WMS</span>
                        <h2>Nueva contraseña</h2>
                        <p>El enlace vence en un tiempo limitado</p>
                    </div>

                    {error && (
                        <div className="error-alert" role="alert" aria-live="assertive">
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="success-alert" role="status" aria-live="polite">
                            <FaCheckCircle />
                            <span>{success}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="password-nueva">Nueva Contraseña</label>
                            <div className="input-wrapper">
                                <FaLock className="input-icon" />
                                <input
                                    id="password-nueva"
                                    type="password"
                                    name="password_nueva"
                                    placeholder="Mínimo 8 caracteres"
                                    value={formData.password_nueva}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                    aria-describedby="password-strength-help"
                                    disabled={isLoading || !!success}
                                />
                            </div>
                            <p id="password-strength-help" className="field-help">
                                Usa mayúscula, minúscula, número y símbolo.
                            </p>
                        </div>

                        <div className="input-group">
                            <label htmlFor="confirmar-password">Confirmar Contraseña</label>
                            <div className="input-wrapper">
                                <FaShieldAlt className="input-icon" />
                                <input
                                    id="confirmar-password"
                                    type="password"
                                    name="confirmar_password"
                                    placeholder="Repite la contraseña"
                                    value={formData.confirmar_password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                    disabled={isLoading || !!success}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`btn-login ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading || !!success}
                        >
                            {isLoading ? 'ACTUALIZANDO...' : <><FaKey /> ACTUALIZAR CONTRASEÑA</>}
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

export default ResetPassword;
