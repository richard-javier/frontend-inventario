// src/controllers/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';

// La URL base de tu backend (donde corre Express)
const API_URL = 'http://localhost:3001/api/auth'; 

const LoginPage = () => {
    // 1. Estados para capturar los valores del formulario
    const [credentials, setCredentials] = useState({
        correo_electronico: '',
        contrasena: ''
    });
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Función para manejar los cambios en los inputs
    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    // Función para manejar el envío del formulario de Login
    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null); // Limpiar errores anteriores

        try {
            // 2. Realizar la petición POST al endpoint de Login del backend
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials), 
            });

            const data = await response.json();

            if (!response.ok) {
                // Si el servidor responde con un error (ej. 401 Credenciales inválidas)
                throw new Error(data.message || 'Error desconocido al iniciar sesión.');
            }

            // 3. Manejo de Respuesta Exitosa
            // Guardar el JWT en el almacenamiento local
            localStorage.setItem('authToken', data.token);
            
            // Puedes guardar el rol o nombre de usuario para mostrarlo en la interfaz
            localStorage.setItem('usuarioRol', data.usuario.rol); 

            console.log('Login Exitoso. Token guardado. Rol:', data.usuario.rol);

            // Redirigir al usuario al Dashboard
            navigate('/dashboard'); 

        } catch (err) {
            console.error('Error de Login:', err.message);
            setError(err.message);
        }
    };

    // Función para el botón de Registro
    const handleRegisterClick = () => {
        navigate('/registro'); 
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleLogin} style={styles.form}>
                <FaLock size={50} style={styles.icon} />
                <h2 style={{ marginBottom: '20px' }}>Acceso al Sistema de Inventario</h2>
                
                {/* Mostrar error si existe */}
                {error && <p style={styles.error}>{error}</p>}

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Correo Electrónico:</label>
                    <input
                        type="email"
                        name="correo_electronico"
                        value={credentials.correo_electronico}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Contraseña:</label>
                    <input
                        type="password"
                        name="contrasena"
                        value={credentials.contrasena}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />
                </div>
                
                <div style={styles.buttonGroup}>
                    <button type="submit" style={styles.loginButton}>
                        INGRESAR
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={handleRegisterClick} 
                        style={styles.registerButton}
                    >
                        REGISTRARSE
                    </button>
                </div>
            </form>
        </div>
    );
};

// Estilos básicos para la presentación
const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#e9ecef',
    },
    form: {
        backgroundColor: '#fff',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
        width: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    icon: {
        color: '#007bff',
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
    },
    inputGroup: {
        width: '100%',
        marginBottom: '20px',
    },
    input: {
        width: '100%',
        padding: '12px',
        boxSizing: 'border-box',
        borderRadius: '6px',
        border: '1px solid #ced4da',
        fontSize: '16px',
    },
    buttonGroup: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: '10px',
    },
    loginButton: {
        padding: '12px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        flexGrow: 1,
        marginRight: '10px',
        fontSize: '16px',
        fontWeight: 'bold',
    },
    registerButton: {
        padding: '12px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        flexGrow: 1,
        fontSize: '16px',
        fontWeight: 'bold',
    },
    error: {
        color: '#dc3545',
        marginBottom: '15px',
        backgroundColor: '#f8d7da',
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #f5c6cb',
        width: '100%',
        textAlign: 'center',
    }
};

export default LoginPage;