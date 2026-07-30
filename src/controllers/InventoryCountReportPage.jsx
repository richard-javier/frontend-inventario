import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../config/api.js';
import { FaChartPie, FaFileExcel, FaFilePdf, FaSearch, FaSpinner, FaWarehouse } from 'react-icons/fa';
import {
  clasificarInventarioABC,
  exportarInventarioAnualExcel,
  exportarInventarioAnualPDF,
  exportarInventarioCiclicoABCExcel,
  exportarInventarioCiclicoABCPDF
} from '../utils/exportReports';
import '../css/InventoryCountReportPage.css';

const getUbicacionDetalle = (ubicacionStr) => {
  if (!ubicacionStr || ubicacionStr === 'Por Asignar' || ubicacionStr === 'Sin Asignar') {
    return { idBodega: '-', descBodega: 'Sin Asignar', rack: 'Por Asignar' };
  }

  if (ubicacionStr.includes('-')) {
    const [idBodega, rack] = ubicacionStr.split('-');
    const nombres = {
      B00: 'Materia prima',
      B01: 'Producto terminado',
      B02: 'Refabricado',
      B03: 'Devoluciones',
      B04: 'Dañados',
      B05: 'Despacho'
    };
    return { idBodega, descBodega: nombres[idBodega] || 'Bodega General', rack };
  }

  return { idBodega: '-', descBodega: 'Bodega General', rack: ubicacionStr };
};

const normalizarUbiReporte = (ubi = {}) => ({
  idBodega: ubi.idBodega || ubi.bId || '-',
  descBodega: ubi.descBodega || ubi.bDesc || 'Sin Asignar',
  rack: ubi.rack || 'Por Asignar'
});

const getFechaLocalISO = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFechaAyerISO = () => {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return getFechaLocalISO(ayer);
};

const getFechaLegible = (fechaISO) => {
  const [year, month, day] = fechaISO.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const getSeedFecha = (fechaISO) => fechaISO.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

const rotarProductosPorFecha = (productos, fechaISO) => {
  if (productos.length <= 15) return productos;
  const inicio = getSeedFecha(fechaISO) % productos.length;
  return [...productos.slice(inicio), ...productos.slice(0, inicio)];
};

const InventoryCountReportPage = ({ tipo = 'annual' }) => {
  const esCiclico = tipo === 'cyclic';
  const tipoFiltro = esCiclico ? 'cyclic' : 'annual';
  const fechaHoy = getFechaLocalISO();
  const fechaAyer = getFechaAyerISO();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtrosPorTipo, setFiltrosPorTipo] = useState({
    annual: { busqueda: '', bodegaFiltro: 'TODAS', claseFiltro: 'TODAS' },
    cyclic: { busqueda: '', bodegaFiltro: 'TODAS', claseFiltro: 'AB', fechaConteo: fechaHoy }
  });

  const filtrosActuales = filtrosPorTipo[tipoFiltro];
  const { busqueda, bodegaFiltro, claseFiltro, fechaConteo = fechaHoy } = filtrosActuales;

  const actualizarFiltro = (campo, valor) => {
    setFiltrosPorTipo(prev => ({
      ...prev,
      [tipoFiltro]: {
        ...prev[tipoFiltro],
        [campo]: valor
      }
    }));
  };

  useEffect(() => {
    const fetchInventario = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_BASE}/inventario`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.ok) setProductos(await response.json() || []);
      } catch (error) {
        console.error('Error cargando inventario para reporte', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventario();
  }, []);

  const productosBase = useMemo(() => {
    if (esCiclico) {
      return clasificarInventarioABC(productos).map(prod => ({
        ...prod,
        ubi: normalizarUbiReporte(prod.ubi)
      }));
    }

    return productos
      .filter(prod => Number(prod.stock_actual) > 0)
      .map(prod => {
        const ubi = getUbicacionDetalle(prod.ubicacion_bodega);
        const stock = Number(prod.stock_actual) || 0;
        const precio = Number(prod.precio) || 0;
        return {
          ...prod,
          ubi,
          stock,
          precio,
          valorInventario: stock * precio
        };
      })
      .sort((a, b) => `${a.ubi.idBodega}-${a.ubi.rack}`.localeCompare(`${b.ubi.idBodega}-${b.ubi.rack}`));
  }, [esCiclico, productos]);

  const bodegas = useMemo(() => {
    const setBodegas = new Map();
    productosBase.forEach(prod => setBodegas.set(prod.ubi.idBodega, prod.ubi.descBodega));
    return Array.from(setBodegas.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [productosBase]);

  const productosFiltrados = productosBase.filter(prod => {
    const termino = busqueda.toLowerCase().trim();
    const coincideBusqueda = !termino ||
      (prod.sku || '').toLowerCase().includes(termino) ||
      (prod.part_number || '').toLowerCase().includes(termino) ||
      (prod.nombre_producto || '').toLowerCase().includes(termino) ||
      (prod.ubi.rack || '').toLowerCase().includes(termino);
    const coincideBodega = bodegaFiltro === 'TODAS' || prod.ubi.idBodega === bodegaFiltro;
    const coincideClase = !esCiclico || claseFiltro === 'TODAS' || (claseFiltro === 'AB' ? ['A', 'B'].includes(prod.claseABC) : prod.claseABC === claseFiltro);

    return coincideBusqueda && coincideBodega && coincideClase;
  });

  const productosParaConteo = esCiclico ? rotarProductosPorFecha(productosFiltrados, fechaConteo).slice(0, 15) : productosFiltrados;

  const resumenABC = useMemo(() => {
    if (!esCiclico) return null;
    return productosBase.reduce((acc, prod) => {
      acc[prod.claseABC] = (acc[prod.claseABC] || 0) + 1;
      return acc;
    }, { A: 0, B: 0, C: 0 });
  }, [esCiclico, productosBase]);

  const titulo = esCiclico ? 'Inventario Cíclico ABC' : 'Inventario Anual';
  const descripcion = esCiclico
    ? 'Hoja de conteo ciego priorizada por ABC. No muestra stock del sistema ni valores.'
    : 'Hoja de conteo ciego completa con bodega y ubicación para inventario anual.';

  const exportarExcel = () => {
    if (esCiclico) exportarInventarioCiclicoABCExcel(productosParaConteo);
    else exportarInventarioAnualExcel(productosFiltrados);
  };

  const exportarPDF = () => {
    if (esCiclico) exportarInventarioCiclicoABCPDF(productosParaConteo);
    else exportarInventarioAnualPDF(productosFiltrados);
  };

  if (loading) {
    return <div className="count-report-loading"><FaSpinner className="fa-spin" size="2em" color="#34a853" /><p>Cargando stock...</p></div>;
  }

  return (
    <div className="count-report-container">
      <section className="count-report-card">
        <div className="count-report-header">
          <div>
            <h2><span><FaChartPie /></span>{titulo}</h2>
            <p>{descripcion}</p>
          </div>
          <div className="count-report-actions">
            <button className="count-btn count-btn-excel" onClick={exportarExcel}><FaFileExcel /> Excel</button>
            <button className="count-btn count-btn-pdf" onClick={exportarPDF}><FaFilePdf /> PDF</button>
          </div>
        </div>

        <div className="count-report-kpis">
          <div><strong>{productosParaConteo.length}</strong><span>{esCiclico ? 'SKUs cíclicos' : 'SKUs a contar'}</span></div>
          <div><strong>Conteo ciego</strong><span>Sin stock sistema</span></div>
          <div><strong>Responsable</strong><span>Firma al final del reporte</span></div>
          {esCiclico && <div><strong>A {resumenABC.A} / B {resumenABC.B} / C {resumenABC.C}</strong><span>Clasificación ABC</span></div>}
        </div>

        <div className="count-report-filters">
          <div className="count-search">
            <FaSearch />
            <input value={busqueda} onChange={(e) => actualizarFiltro('busqueda', e.target.value)} placeholder="Buscar SKU, producto, part number o ubicación..." />
          </div>
          <select value={bodegaFiltro} onChange={(e) => actualizarFiltro('bodegaFiltro', e.target.value)}>
            <option value="TODAS">Todas las bodegas</option>
            {bodegas.map(([id, desc]) => <option key={id} value={id}>{id} - {desc}</option>)}
          </select>
          {esCiclico && (
            <select value={claseFiltro} onChange={(e) => actualizarFiltro('claseFiltro', e.target.value)}>
              <option value="AB">Prioridad A y B</option>
              <option value="A">Solo A</option>
              <option value="B">Solo B</option>
              <option value="C">Solo C</option>
              <option value="TODAS">Todas ABC</option>
            </select>
          )}
          {esCiclico && (
            <div className="count-date-toggle" aria-label="Fecha de conteo ciclico">
              <button
                type="button"
                className={fechaConteo === fechaHoy ? 'active' : ''}
                onClick={() => actualizarFiltro('fechaConteo', fechaHoy)}
              >
                Hoy
              </button>
              <button
                type="button"
                className={fechaConteo === fechaAyer ? 'active' : ''}
                onClick={() => actualizarFiltro('fechaConteo', fechaAyer)}
              >
                Ayer
              </button>
            </div>
          )}
        </div>

        <div className="count-table-wrap">
          <table className="count-table">
            <thead>
              <tr>
                {esCiclico && <th>ABC</th>}
                {esCiclico && <th>Rank</th>}
                <th>SKU</th>
                <th>Producto</th>
                <th>Bodega</th>
                <th>Ubicación</th>
                <th>Conteo Físico</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              {productosParaConteo.slice(0, 80).map(prod => (
                <tr key={`${prod.id_producto}-${prod.rankingABC || prod.ubi.rack}`}>
                  {esCiclico && <td><span className={`abc-badge abc-${prod.claseABC}`}>{prod.claseABC}</span></td>}
                  {esCiclico && <td>{prod.rankingABC}</td>}
                  <td className="count-sku">{prod.sku || 'N/A'}</td>
                  <td>
                    <strong>{prod.nombre_producto || 'Sin nombre'}</strong>
                    <small>{prod.part_number || prod.marca || 'Sin referencia'}</small>
                  </td>
                  <td><FaWarehouse /> {prod.ubi.idBodega}<small>{prod.ubi.descBodega}</small></td>
                  <td>{prod.ubi.rack}</td>
                  <td className="blank-cell"></td>
                  <td className="blank-cell"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {esCiclico && productosFiltrados.length > 15 && <p className="count-table-note">Conteo cíclico de {getFechaLegible(fechaConteo)} reducido a 15 productos. Hay {productosFiltrados.length} coincidencias disponibles con los filtros actuales.</p>}
        {!esCiclico && productosFiltrados.length > 80 && <p className="count-table-note">Vista previa de 80 registros. La descarga incluye todos los registros filtrados.</p>}
      </section>
    </div>
  );
};

export default InventoryCountReportPage;
