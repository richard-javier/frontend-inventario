import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaExchangeAlt, FaBrain, FaTags, FaClipboardList, FaFileSignature, FaBarcode, FaChartLine, FaSignOutAlt, FaUserCircle, FaTruckLoading, FaWarehouse, FaSearch, FaCubes, FaFileExport, FaChartPie, FaTh, FaBoxes, FaCogs, FaUserShield, FaUserPlus, FaUsers } from "react-icons/fa";
import '../css/MainLayout.css'; // Importa el CSS limpio

const MainLayout = ({ children, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userRole, setUserRole] = useState(6);
  const [userName, setUserName] = useState("Usuario SINCOT");
  const [showProfile, setShowProfile] = useState(false);
  const [passData, setPassData] = useState({ actual: "", nueva: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserRole(payload.id_rol);
      } catch (e) { console.error("Error token"); }
    }
    const savedUser = localStorage.getItem("usuario");
    if (savedUser) {
      try { setUserName(JSON.parse(savedUser).rol || "Personal Logístico"); } catch (e) {}
    }
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const payload = JSON.parse(atob(token.split(".")[1]));
    try {
      const res = await fetch("http://localhost:3001/api/auth/cambiar-password", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_usuario: payload.id_usuario, password_actual: passData.actual, password_nueva: passData.nueva }),
      });
      const data = await res.json();
      alert(res.ok ? "✅ " + data.message : "❌ " + data.message);
      if (res.ok) { setShowProfile(false); setPassData({actual: "", nueva: ""}); }
    } catch (e) { alert("Error de conexión"); }
  };

  const appModules = [
    { id: "dashboard", name: "Dashboard", icon: <FaChartLine size="2.8em" />, color: "#875A7B", defaultPath: "/dashboard", rolesPermitidos: [1, 2], menus: [{ label: "Panel de Control", path: "/dashboard", icon: <FaChartLine /> }] },
    { id: "recepcion", name: "Recepción", icon: <FaTruckLoading size="2.8em" />, color: "#017E84", defaultPath: "/receiving-note", rolesPermitidos: [1, 2, 4, 5, 6], menus: [{ label: "Crear Productos", path: "/create-product", icon: <FaTags /> }, { label: "Crear Lotes", path: "/create-lot", icon: <FaBarcode /> }, { label: "Nota de Ingreso", path: "/receiving-note", icon: <FaFileSignature /> }, { label: "Archivo Notas", path: "/receiving-history", icon: <FaClipboardList /> }, { label: "Ingreso Productos", path: "/receiving-products", icon: <FaCubes /> }] },
    { id: "produccion", name: "Producción", icon: <FaBarcode size="2.8em" />, color: "#F06050", defaultPath: "/scan", rolesPermitidos: [1, 2, 4, 5, 6], menus: [{ label: "Serializado de Equipos", path: "/scan", icon: <FaBarcode /> }] },
    { id: "almacenamiento", name: "Almacenamiento", icon: <FaWarehouse size="2.8em" />, color: "#D9534F", defaultPath: "/ai-predictive", rolesPermitidos: [1, 2, 4, 5], menus: [{ label: "Inventario Anual", path: "/inventory-annual", icon: <FaClipboardList /> }, { label: "Inventario Cíclico", path: "/inventory-cyclic", icon: <FaClipboardList /> }, { label: "IA Predictiva", path: "/ai-predictive", icon: <FaBrain /> }, { label: "Auditoría IA", path: "/ai-audit", icon: <FaBrain /> }] },
    { id: "despacho", name: "Despacho", icon: <FaFileExport size="2.8em" />, color: "#F0AD4E", defaultPath: "/output", rolesPermitidos: [1, 2, 4, 5, 6], menus: [{ label: "Nota de Egreso", path: "/output", icon: <FaFileSignature /> }, { label: "Guía de Remisión", path: "/remission-guide", icon: <FaFileSignature /> }] },
    { id: "transferencia", name: "Transferencia", icon: <FaExchangeAlt size="2.8em" />, color: "#5BC0DE", defaultPath: "/transfers", rolesPermitidos: [1, 2, 4, 5], menus: [{ label: "Gestión Transferencias", path: "/transfers", icon: <FaExchangeAlt /> }] },
    { id: "reportes", name: "Reportes", icon: <FaChartPie size="2.8em" />, color: "#5CB85C", defaultPath: "/inventory", rolesPermitidos: [1, 2], menus: [{ label: "Stock General", path: "/inventory", icon: <FaBoxes /> }, { label: "Stock Valorado", path: "/valued-stock", icon: <FaChartLine /> }, { label: "Trazabilidad", path: "/history", icon: <FaSearch /> }] },
    { 
      id: "sistemas", 
      name: "Sistemas", 
      icon: <FaCogs size="2.8em" />, 
      color: "#202124", 
      defaultPath: "/directorio-usuarios", // <- Modificado
      rolesPermitidos: [1, 2], 
      menus: [
        { label: "Directorio de Personal", path: "/directorio-usuarios", icon: <FaUsers /> }, // <- Modificado
        { label: "Crear Nuevo Usuario", path: "/registro-usuarios", icon: <FaUserPlus /> }    // <- Modificado
      ] 
    }
  ];

  const modulosPermitidos = appModules.filter((app) => app.rolesPermitidos.includes(userRole));
  const isHome = location.pathname === "/home" || location.pathname === "/";
  const activeApp = modulosPermitidos.find((app) => app.menus.some((m) => m.path === location.pathname));

  return (
    <div className="layout-container">
      <header className="layout-header">
        <div className="header-left">
          <button className="btn-grid" onClick={() => navigate("/home")}><FaTh size="1.5em" /></button>
          <div className="brand-text">
            <span>SINCOT</span>
            {!isHome && activeApp && (<><span className="breadcrumb-slash">/</span><span className="breadcrumb-text">{activeApp.name}</span></>)}
          </div>
        </div>

        <div className="header-right">
          <div className="profile-btn" onClick={() => setShowProfile(true)}>
            <FaUserCircle size="1.5em" color={userRole === 1 ? "#fbbc04" : "#8ab4f8"} />
            <div className="profile-info">
              <span className="profile-name">{userName}</span>
              <span className="profile-role">Mi Perfil (Rol: {userRole})</span>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}><FaSignOutAlt /> Salir</button>
        </div>
      </header>

      {showProfile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Mi Perfil de Seguridad</h3>
            <form onSubmit={handleChangePassword} className="modal-form">
              <input type="password" placeholder="Contraseña Actual" required value={passData.actual} onChange={e=>setPassData({...passData, actual: e.target.value})} className="modal-input"/>
              <input type="password" placeholder="Nueva Contraseña" required value={passData.nueva} onChange={e=>setPassData({...passData, nueva: e.target.value})} className="modal-input"/>
              <div className="modal-actions">
                <button type="button" onClick={()=>setShowProfile(false)} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-update">Actualizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="layout-body">
        {!isHome && activeApp && (
          <aside className="sidebar">
            <div className="sidebar-header">
              <div style={{ color: activeApp.color }}>{activeApp.icon}</div>
              <h3 className="sidebar-title">{activeApp.name}</h3>
            </div>
            <nav className="sidebar-nav">
              {activeApp.menus.map((menu) => {
                const isActive = location.pathname === menu.path;
                return (
                  <div key={menu.path} onClick={() => navigate(menu.path)} className={`nav-item ${isActive ? "active" : ""}`} style={isActive ? { borderLeftColor: activeApp.color, color: activeApp.color } : {}}>
                    <span className="nav-icon" style={isActive ? { color: activeApp.color } : {}}>{menu.icon}</span>
                    {menu.label}
                  </div>
                );
              })}
            </nav>
          </aside>
        )}

        <main className={`main-content ${isHome ? "main-home" : ""}`}>
          {isHome ? (
            <div className="mosaic-container">
              {modulosPermitidos.map((app) => (
                <div key={app.id} className="mosaic-card" onClick={() => navigate(app.defaultPath)}>
                  <div className="mosaic-icon" style={{ color: app.color }}>{app.icon}</div>
                  <span className="mosaic-title">{app.name}</span>
                </div>
              ))}
            </div>
          ) : ( <div style={{ padding: "15px" }}>{children}</div> )}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;