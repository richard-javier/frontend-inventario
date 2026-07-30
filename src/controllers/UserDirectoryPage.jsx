import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../config/api.js';
import {
    FaCalendarAlt,
    FaChevronLeft,
    FaChevronRight,
    FaCheckCircle,
    FaEdit,
    FaEnvelope,
    FaEye,
    FaFilter,
    FaIdCard,
    FaSearch,
    FaSpinner,
    FaTimes,
    FaToggleOff,
    FaToggleOn,
    FaTrash,
    FaUserShield,
    FaUsers,
    FaUserTie,
} from 'react-icons/fa';
import '../css/UserDirectoryPage.css';

const UserDirectoryPage = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editModal, setEditModal] = useState({ open: false, data: {} });
    const [viewModal, setViewModal] = useState({ open: false, data: {} });
    const [feedback, setFeedback] = useState({ type: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [roleFilter, setRoleFilter] = useState('Todos');
    const [dateFilter, setDateFilter] = useState('Todos');
    const [currentPage, setCurrentPage] = useState(1);
    const token = localStorage.getItem('token');
    const itemsPerPage = 6;

    const cargarUsuarios = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/usuarios`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setUsuarios(await res.json());
        } catch (e) {
            console.error('Error al cargar directorio');
        }
        setLoading(false);
    };

    useEffect(() => { cargarUsuarios(); }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, roleFilter, dateFilter]);

    const parseFechaUsuario = (fecha = '') => {
        const [datePart] = String(fecha).split(' ');
        const [day, month, year] = datePart.split('-').map(Number);
        if (!day || !month || !year) return null;
        return new Date(year, month - 1, day);
    };

    const coincideFecha = (fecha) => {
        if (dateFilter === 'Todos') return true;
        const fechaUsuario = parseFechaUsuario(fecha);
        if (!fechaUsuario) return false;

        const hoy = new Date();
        if (dateFilter === 'Hoy') {
            return fechaUsuario.toDateString() === hoy.toDateString();
        }
        if (dateFilter === 'Este mes') {
            return fechaUsuario.getFullYear() === hoy.getFullYear() && fechaUsuario.getMonth() === hoy.getMonth();
        }
        if (dateFilter === 'Este año') {
            return fechaUsuario.getFullYear() === hoy.getFullYear();
        }
        return true;
    };

    const rolesDisponibles = useMemo(() => {
        return [...new Set(usuarios.map((u) => u.nombre_rol).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    }, [usuarios]);

    const usuariosFiltrados = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return usuarios.filter((u) => {
            const coincideEstado = statusFilter === 'Todos' || u.estado === statusFilter;
            const coincideRol = roleFilter === 'Todos' || u.nombre_rol === roleFilter;
            const coincideRangoFecha = coincideFecha(u.fecha);
            const textoUsuario = `${u.nombre} ${u.apellido} ${u.correo_electronico} ${u.cedula} ${u.nombre_rol}`.toLowerCase();
            return coincideEstado && coincideRol && coincideRangoFecha && (!query || textoUsuario.includes(query));
        });
    }, [usuarios, searchTerm, statusFilter, roleFilter, dateFilter]);

    const totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / itemsPerPage));
    const usuariosPaginados = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return usuariosFiltrados.slice(start, start + itemsPerPage);
    }, [usuariosFiltrados, currentPage]);

    const resumen = useMemo(() => {
        const activos = usuarios.filter((u) => u.estado === 'Activo').length;
        const inactivos = usuarios.filter((u) => u.estado === 'Inactivo').length;
        const sistemas = usuarios.filter((u) => [1, 2].includes(Number(u.id_rol))).length;
        return { total: usuarios.length, activos, inactivos, sistemas };
    }, [usuarios]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        const { nombre, apellido, cedula, correo_electronico, estado } = editModal.data;

        if (!nombre?.trim() || !apellido?.trim() || !cedula?.trim() || !correo_electronico?.trim() || !estado?.trim()) {
            setFeedback({ type: 'error', text: 'Por favor completa todos los campos obligatorios.' });
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/usuarios/${editModal.data.id_usuario}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(editModal.data),
            });

            if (res.ok) {
                setFeedback({ type: 'success', text: 'Usuario actualizado correctamente.' });
                setTimeout(() => {
                    setEditModal({ open: false, data: {} });
                    cargarUsuarios();
                    setFeedback({ type: '', text: '' });
                }, 1200);
            } else {
                setFeedback({ type: 'error', text: 'Error al actualizar.' });
            }
        } catch (e) {
            setFeedback({ type: 'error', text: 'Error de red.' });
        }
    };

    const toggleUsuarioEstado = async (usuario) => {
        const nuevoEstado = usuario.estado === 'Inactivo' ? 'Activo' : 'Inactivo';
        try {
            const res = await fetch(`${API_BASE}/auth/usuarios/${usuario.id_usuario}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...usuario, estado: nuevoEstado }),
            });
            if (res.ok) cargarUsuarios();
            else alert('No se pudo cambiar el estado.');
        } catch (e) {
            alert('Error de red.');
        }
    };

    const handleEliminar = async (usuario) => {
        if (usuario.estado === 'Inactivo') {
            alert('No se puede eliminar un usuario inactivo. Actívalo primero si necesitas hacer una eliminación física.');
            return;
        }

        if (window.confirm(`¿Desea eliminar permanentemente del sistema a ${usuario.nombre}?`)) {
            try {
                const res = await fetch(`${API_BASE}/auth/usuarios/${usuario.id_usuario}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    cargarUsuarios();
                } else {
                    alert(data.message);
                }
            } catch (e) {
                alert('Error al eliminar.');
            }
        }
    };

    const openEditModal = (usuario) => {
        setFeedback({ type: '', text: '' });
        setEditModal({ open: true, data: { ...usuario, estado: usuario.estado || 'Activo' } });
    };

    return (
        <main className="directory-page">
            <section className="directory-hero">
                <div>
                    <span className="directory-eyebrow">Sistemas</span>
                    <h1><FaUsers /> Directorio de Personal</h1>
                    <p>Administra accesos, estados y datos principales del equipo operativo.</p>
                </div>
                <button className="directory-refresh" type="button" onClick={cargarUsuarios} disabled={loading}>
                    {loading ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
                    Actualizar
                </button>
            </section>

            <section className="directory-stats" aria-label="Resumen de personal">
                <article className="directory-stat">
                    <span className="stat-icon"><FaUsers /></span>
                    <div><strong>{resumen.total}</strong><small>Total personal</small></div>
                </article>
                <article className="directory-stat">
                    <span className="stat-icon success"><FaCheckCircle /></span>
                    <div><strong>{resumen.activos}</strong><small>Usuarios activos</small></div>
                </article>
                <article className="directory-stat">
                    <span className="stat-icon warning"><FaUserShield /></span>
                    <div><strong>{resumen.sistemas}</strong><small>Roles críticos</small></div>
                </article>
                <article className="directory-stat">
                    <span className="stat-icon muted"><FaToggleOff /></span>
                    <div><strong>{resumen.inactivos}</strong><small>Inactivos</small></div>
                </article>
            </section>

            <section className="directory-panel">
                <div className="directory-toolbar">
                    <div className="directory-search">
                        <FaSearch />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nombre, correo, cédula o rol"
                            aria-label="Buscar personal"
                        />
                    </div>
                    <div className="directory-control-group" aria-label="Filtros del directorio">
                        <label className="directory-select">
                            <FaFilter />
                            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filtrar por rol">
                                <option value="Todos">Todos los roles</option>
                                {rolesDisponibles.map((rol) => <option key={rol} value={rol}>{rol}</option>)}
                            </select>
                        </label>
                        <label className="directory-select">
                            <FaCalendarAlt />
                            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} aria-label="Filtrar por fecha de creación">
                                <option value="Todos">Todas las fechas</option>
                                <option value="Hoy">Hoy</option>
                                <option value="Este mes">Este mes</option>
                                <option value="Este año">Este año</option>
                            </select>
                        </label>
                        <div className="directory-filters" aria-label="Filtrar por estado">
                            {['Todos', 'Activo', 'Inactivo'].map((estado) => (
                                <button
                                    key={estado}
                                    type="button"
                                    className={statusFilter === estado ? 'active' : ''}
                                    onClick={() => setStatusFilter(estado)}
                                    aria-pressed={statusFilter === estado}
                                >
                                    {estado}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="directory-table-wrap">
                    <table className="directory-table">
                        <colgroup>
                            <col className="col-personal" />
                            <col className="col-contacto" />
                            <col className="col-identificacion" />
                            <col className="col-rol" />
                            <col className="col-estado" />
                            <col className="col-creado" />
                            <col className="col-acciones" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Personal</th>
                                <th>Contacto</th>
                                <th>Identificación</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Creado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan="7" className="directory-empty"><FaSpinner className="fa-spin" /> Cargando directorio...</td></tr>
                            )}

                            {!loading && usuariosFiltrados.length === 0 && (
                                <tr><td colSpan="7" className="directory-empty">No hay usuarios con esos filtros.</td></tr>
                            )}

                            {!loading && usuariosPaginados.map((u) => (
                                <tr key={u.id_usuario} className={u.estado === 'Inactivo' ? 'is-inactive' : ''}>
                                    <td>
                                        <div className="person-cell">
                                            <span className="person-avatar">{`${u.nombre?.[0] || ''}${u.apellido?.[0] || ''}`.toUpperCase()}</span>
                                            <div>
                                                <strong title={`${u.nombre} ${u.apellido}`}>{u.nombre} {u.apellido}</strong>
                                                <small>ID {u.id_usuario}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="stacked-cell">
                                            <span className="email-value" title={u.correo_electronico}><FaEnvelope /> {u.correo_electronico}</span>
                                            <small>{u.telefono || 'Sin teléfono'}</small>
                                        </div>
                                    </td>
                                    <td><span className="mono-value" title={u.cedula}><FaIdCard /> {u.cedula}</span></td>
                                    <td><span className="role-pill" title={u.nombre_rol}><FaUserTie /> {u.nombre_rol}</span></td>
                                    <td>
                                        <span className={`status-pill ${u.estado === 'Activo' ? 'active' : 'inactive'}`}>
                                            {u.estado}
                                        </span>
                                    </td>
                                    <td><span className="date-value">{u.fecha}</span></td>
                                    <td>
                                        <div className="row-actions">
                                            <button type="button" onClick={() => setViewModal({ open: true, data: u })} title="Ver detalle" aria-label={`Ver detalle de ${u.nombre}`}>
                                                <FaEye />
                                            </button>
                                            <button type="button" onClick={() => openEditModal(u)} title="Editar usuario" aria-label={`Editar ${u.nombre}`}>
                                                <FaEdit />
                                            </button>
                                            <button
                                                type="button"
                                                className={u.estado === 'Inactivo' ? 'activate' : 'deactivate'}
                                                onClick={() => toggleUsuarioEstado(u)}
                                                title={u.estado === 'Inactivo' ? 'Activar usuario' : 'Inactivar usuario'}
                                                aria-label={u.estado === 'Inactivo' ? `Activar ${u.nombre}` : `Inactivar ${u.nombre}`}
                                            >
                                                {u.estado === 'Inactivo' ? <FaToggleOff /> : <FaToggleOn />}
                                            </button>
                                            <button
                                                type="button"
                                                className="danger"
                                                onClick={() => handleEliminar(u)}
                                                disabled={u.estado === 'Inactivo'}
                                                title={u.estado === 'Inactivo' ? 'No se puede eliminar un usuario inactivo' : 'Borrar físicamente'}
                                                aria-label={`Eliminar ${u.nombre}`}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="directory-pagination" aria-label="Paginación de usuarios">
                    <span>{usuariosFiltrados.length} resultado{usuariosFiltrados.length === 1 ? '' : 's'} · Página {currentPage} de {totalPages} · Desplaza la tabla para ver todas las columnas</span>
                    <div>
                        <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} aria-label="Página anterior">
                            <FaChevronLeft />
                        </button>
                        <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} aria-label="Página siguiente">
                            <FaChevronRight />
                        </button>
                    </div>
                </div>
            </section>

            {viewModal.open && (
                <div className="directory-modal-overlay">
                    <section className="directory-modal directory-view-modal" role="dialog" aria-modal="true" aria-labelledby="view-user-title">
                        <div className="directory-modal-header">
                            <div>
                                <span className="directory-eyebrow">Ficha de personal</span>
                                <h3 id="view-user-title">{viewModal.data.nombre} {viewModal.data.apellido}</h3>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setViewModal({ open: false, data: {} })} aria-label="Cerrar detalle">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="directory-detail-grid">
                            <div><small>Correo</small><strong>{viewModal.data.correo_electronico}</strong></div>
                            <div><small>Cédula</small><strong>{viewModal.data.cedula}</strong></div>
                            <div><small>Teléfono</small><strong>{viewModal.data.telefono || 'Sin teléfono'}</strong></div>
                            <div><small>Rol</small><strong>{viewModal.data.nombre_rol}</strong></div>
                            <div><small>Estado</small><span className={`status-pill ${viewModal.data.estado === 'Activo' ? 'active' : 'inactive'}`}>{viewModal.data.estado}</span></div>
                            <div><small>Creado</small><strong>{viewModal.data.fecha}</strong></div>
                        </div>
                        <div className="directory-modal-actions">
                            <button type="button" className="secondary" onClick={() => setViewModal({ open: false, data: {} })}>Cerrar</button>
                            <button type="button" className="primary" onClick={() => { setViewModal({ open: false, data: {} }); openEditModal(viewModal.data); }}>Editar</button>
                        </div>
                    </section>
                </div>
            )}

            {editModal.open && (
                <div className="directory-modal-overlay">
                    <form className="directory-modal" onSubmit={handleUpdate} role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
                        <div className="directory-modal-header">
                            <div>
                                <span className="directory-eyebrow">Edición rápida</span>
                                <h3 id="edit-user-title">Información del usuario</h3>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setEditModal({ open: false, data: {} })} aria-label="Cerrar modal">
                                <FaTimes />
                            </button>
                        </div>

                        {feedback.text && (
                            <div className={`directory-feedback ${feedback.type}`} role="status">
                                {feedback.text}
                            </div>
                        )}

                        <div className="directory-form-grid">
                            <label>Nombre<input value={editModal.data.nombre || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, nombre: e.target.value } })} /></label>
                            <label>Apellido<input value={editModal.data.apellido || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, apellido: e.target.value } })} /></label>
                            <label>Correo electrónico<input type="email" value={editModal.data.correo_electronico || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, correo_electronico: e.target.value } })} /></label>
                            <label>Cédula<input value={editModal.data.cedula || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, cedula: e.target.value } })} /></label>
                            <label>Teléfono<input value={editModal.data.telefono || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, telefono: e.target.value } })} /></label>
                            <label>Estado<select value={editModal.data.estado || 'Activo'} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, estado: e.target.value } })}>
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                            </select></label>
                        </div>

                        <div className="directory-modal-actions">
                            <button type="button" className="secondary" onClick={() => setEditModal({ open: false, data: {} })}>Cancelar</button>
                            <button type="submit" className="primary">Guardar cambios</button>
                        </div>
                    </form>
                </div>
            )}
        </main>
    );
};

export default UserDirectoryPage;
