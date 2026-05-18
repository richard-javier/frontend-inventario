import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaUser, FaIdCard, FaEnvelope, FaLock, FaUsers, FaUserShield, FaPhone } from 'react-icons/fa';
import '../css/RegisterPage.css';

const API_URL = 'http://localhost:3001/api/auth'; 

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        nombre: '', apellido: '', cedula: '', telefono: '', correo_electronico: '', contrasena: '', id_rol: 1
    });
    const [roles, setRoles] = useState([]);
    
    // Cambiamos 'message' por un arreglo para poder mostrar múltiples errores a la vez
    const [messages, setMessages] = useState([]);
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setRoles([
            { id_rol: 1, nombre_rol: 'Gerente' }, { id_rol: 2, nombre_rol: 'Jefe Administrativo' },
            { id_rol: 3, nombre_rol: 'Asistente' }, { id_rol: 4, nombre_rol: 'Jefe de Operaciones' },
            { id_rol: 5, nombre_rol: 'Supervisor de Almacén' }, { id_rol: 6, nombre_rol: 'Auxiliar de Almacén' },
            { id_rol: 7, nombre_rol: 'Jefe de Ventas' }, { id_rol: 8, nombre_rol: 'Supervisor de Ventas' },
            { id_rol: 9, nombre_rol: 'Vendedor' },
        ]);
    }, []);

    // 1. VALIDACIÓN EN TIEMPO REAL (Filtra lo que el usuario tipea)
    const handleChange = (e) => {
        const { name, value } = e.target;
        let valorFiltrado = value;

        if (name === 'cedula' || name === 'telefono') {
            // Solo permite números. Borra cualquier letra ingresada al instante.
            valorFiltrado = value.replace(/\D/g, ''); 
        } else if (name === 'nombre' || name === 'apellido') {
            // Solo permite letras y espacios. Borra números.
            valorFiltrado = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''); 
        }

        setFormData({ ...formData, [name]: valorFiltrado });
    };

// =================================================================
    // 🧮 ALGORITMO MÓDULO 10 (CÉDULA ECUATORIANA)
    // =================================================================
    const esCedulaEcuatorianaValida = (cedula) => {
        if (cedula.length !== 10) return false;
        
        // El código de la provincia (los dos primeros dígitos) debe estar entre 01 y 24, o ser 30.
        const provincia = parseInt(cedula.substring(0, 2), 10);
        if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;

        // El tercer dígito para personas naturales debe ser menor a 6
        const tercerDigito = parseInt(cedula.substring(2, 3), 10);
        if (tercerDigito >= 6) return false;

        // Algoritmo Módulo 10
        const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        let suma = 0;
        
        for (let i = 0; i < 9; i++) {
            let valor = parseInt(cedula.charAt(i), 10) * coeficientes[i];
            if (valor > 9) valor -= 9;
            suma += valor;
        }

        const digitoVerificadorEsperado = parseInt(cedula.charAt(9), 10);
        const decenaSuperior = Math.ceil(suma / 10) * 10;
        let resultado = decenaSuperior - suma;
        if (resultado === 10) resultado = 0;

        return resultado === digitoVerificadorEsperado;
    };

    // 2. VALIDACIÓN ESTRICTA ANTES DE ENVIAR (Pre-submit)
    const validarFormulario = () => {
        let errores = [];
        
        if (formData.nombre.trim().length < 3) errores.push("El nombre debe tener al menos 3 letras.");
        if (formData.apellido.trim().length < 3) errores.push("El apellido debe tener al menos 3 letras.");
        
        // AQUÍ REEMPLAZAMOS LA VALIDACIÓN ANTERIOR POR EL ALGORITMO REAL
        if (!esCedulaEcuatorianaValida(formData.cedula)) {
            errores.push("La cédula ingresada no es válida según el Registro Civil.");
        }

        if (formData.telefono.length < 9) errores.push("El teléfono debe tener entre 9 y 10 dígitos.");
        
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexCorreo.test(formData.correo_electronico)) errores.push("El formato del correo corporativo no es válido.");
        
        if (formData.contrasena.length < 8) errores.push("La contraseña temporal debe tener al menos 8 caracteres.");

        return errores;
    };
    
    const handleRegister = async (e) => {
        e.preventDefault();
        
        // Ejecutamos las validaciones
        const erroresEncontrados = validarFormulario();
        if (erroresEncontrados.length > 0) {
            setIsError(true);
            setMessages(erroresEncontrados);
            return;
        }

        setMessages([]); 
        setIsError(false); 
        setLoading(true);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error al registrar.');

            setMessages(['✅ Personal matriculado exitosamente en el sistema.']);
            setFormData({ nombre: '', apellido: '', cedula: '', telefono: '', correo_electronico: '', contrasena: '', id_rol: 1 });
            setTimeout(() => setMessages([]), 4000);
        } catch (err) {
            setIsError(true); 
            setMessages([err.message]);
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="register-container">
            <div className="register-wrapper">
                <div className="register-header">
                    <div className="register-icon-wrapper"><FaUserShield size="2.5em" /></div>
                    <div>
                        <h2 className="register-title">Gestión de Credenciales</h2>
                        <p className="register-subtitle">Matriculación estricta de nuevo personal</p>
                    </div>
                </div>

                <div className="register-card">
                    {/* Renderizado Dinámico de Alertas */}
                    {messages.length > 0 && (
                        <div className={`msg-alert ${isError ? 'msg-error' : 'msg-success'}`}>
                            {isError && <strong>⚠️ Por favor, corrige los siguientes errores:</strong>}
                            {messages.length === 1 ? (
                                <p style={{margin: isError ? '10px 0 0 0' : '0'}}>{messages[0]}</p>
                            ) : (
                                <ul>
                                    {messages.map((msg, index) => <li key={index}>{msg}</li>)}
                                </ul>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleRegister}>
                        <div className="register-form-grid">
                            <div className="input-group">
                                <label className="input-label">NOMBRES *</label>
                                <div className="input-wrapper">
                                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="input-field" placeholder="Ej: Carlos Andrés" />
                                    <FaUser className="input-icon"/>
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">APELLIDOS *</label>
                                <div className="input-wrapper">
                                    <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} required className="input-field" placeholder="Ej: Mendoza Ruiz" />
                                    <FaUser className="input-icon"/>
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">CÉDULA (10 DÍGITOS) *</label>
                                <div className="input-wrapper">
                                    {/* El maxLength evita que tipeen más de 10 números */}
                                    <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} required className="input-field" placeholder="09XXXXXXXX" maxLength="10" />
                                    <FaIdCard className="input-icon"/>
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">TELÉFONO MÓVIL *</label>
                                <div className="input-wrapper">
                                    <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} required className="input-field" placeholder="09XXXXXXXX" maxLength="10" />
                                    <FaPhone className="input-icon"/>
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">CORREO CORPORATIVO *</label>
                                <div className="input-wrapper">
                                    <input type="email" name="correo_electronico" value={formData.correo_electronico} onChange={handleChange} required className="input-field" placeholder="usuario@empresa.com" />
                                    <FaEnvelope className="input-icon"/>
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">CONTRASEÑA TEMPORAL *</label>
                                <div className="input-wrapper">
                                    <input type="password" name="contrasena" value={formData.contrasena} onChange={handleChange} required className="input-field" placeholder="Mínimo 8 caracteres" />
                                    <FaLock className="input-icon"/>
                                </div>
                            </div>
                            <div className="input-group" style={{gridColumn: '1 / -1'}}>
                                <label className="input-label">NIVEL DE ACCESO Y ROL *</label>
                                <div className="input-wrapper">
                                    <select name="id_rol" onChange={handleChange} value={formData.id_rol} required className="select-field">
                                        {roles.map(r => <option key={r.id_rol} value={r.id_rol}>Nivel {r.id_rol} - {r.nombre_rol}</option>)}
                                    </select>
                                    <FaUsers className="input-icon"/>
                                </div>
                            </div>
                        </div>
                        <div className="register-footer">
                            <button type="submit" disabled={loading} className="btn-submit-register">
                                {loading ? "PROCESANDO..." : <><FaUserPlus /> MATRICULAR USUARIO</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;