import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCalendarAlt, FaFileSignature, FaPrint, FaRoute, FaTruck } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { agregarLogoPDF } from '../utils/reportAssets';
import '../css/ReceivingNotePage.css';

const hoyISO = () => new Date().toISOString().split('T')[0];
const soloNumeros = (valor = '') => valor.toString().replace(/\D/g, '');
const formatearFechaSRI = (fecha = hoyISO()) => {
  const [yyyy, mm, dd] = fecha.split('-');
  return `${dd}${mm}${yyyy}`;
};

const calcularDigitoVerificador = (base48) => {
  const factores = [2, 3, 4, 5, 6, 7];
  let total = 0;
  for (let i = base48.length - 1, j = 0; i >= 0; i--, j++) {
    total += Number(base48[i]) * factores[j % factores.length];
  }
  const residuo = total % 11;
  const digito = 11 - residuo;
  if (digito === 11) return '0';
  if (digito === 10) return '1';
  return String(digito);
};

const generarClaveAcceso = ({ fecha = hoyISO(), secuencial = '000000001', rucEmpresa = '0999999999001' } = {}) => {
  const fechaSri = formatearFechaSRI(fecha);
  const tipoComprobante = '06';
  const ruc = soloNumeros(rucEmpresa).slice(0, 13).padEnd(13, '0');
  const ambiente = '1';
  const serie = '001001';
  const sec = soloNumeros(secuencial).slice(-9).padStart(9, '0');
  const codigoNumerico = String(Date.now()).slice(-8).padStart(8, '0');
  const tipoEmision = '1';
  const base = `${fechaSri}${tipoComprobante}${ruc}${ambiente}${serie}${sec}${codigoNumerico}${tipoEmision}`;
  return `${base}${calcularDigitoVerificador(base)}`;
};

const secuencialDesdeEgreso = (numeroEgreso = '') => soloNumeros(numeroEgreso).slice(-9).padStart(9, '0');
const pareceFechaISO = (valor = '') => /^\d{4}-\d{2}-\d{2}$/.test(valor.toString().trim());
const tieneCorreoValido = (valor = '') => valor.toString().includes('@');

const datosEmisorDefecto = {
  emisor_nombre: 'ZB SOLUCIONES S.A.S.',
  ruc_empresa: '0993378674001',
  matriz: 'GUAYAS / GUAYAQUIL / GUAYAQUIL / N/A Y SOLAR 20',
  correo_empresa: 'ventas03@zbsoluciones.com',
  telefono_empresa: '099720152'
};

const crearGuiaVacia = () => ({
  numero_guia: 'GUI-SIN-DESPACHO',
  numero_egreso: '',
  clave_acceso: generarClaveAcceso(),
  autorizacion: '',
  fecha_autorizacion: new Date().toLocaleString('es-EC'),
  ambiente: 'PRODUCCION',
  emision: 'NORMAL',
  fecha_emision: hoyISO(),
  fecha_inicio_traslado: hoyISO(),
  fecha_fin_traslado: hoyISO(),
  ...datosEmisorDefecto,
  punto_partida: '',
  punto_destino: '',
  codigo_destino: '',
  telefono: '',
  motivo: '',
  descripcion: '',
  transportista: '',
  ruc_transportista: '',
  placa_vehiculo: '',
  correo_transportista: '',
  destinatario: '',
  ruc_destinatario: '',
  direccion_destinatario: '',
  correo_destinatario: '',
  ruta: '',
  doc_sustento: '',
  fecha_emision_doc_sustento: '',
  observaciones: '',
  items: [],
  firmas: {
    entregadoPor: '',
    recibidoTransportista: '',
    recibidoCliente: ''
  }
});

const normalizarGuia = (data) => {
  const base = crearGuiaVacia();
  const merged = { ...base, ...data, firmas: { ...base.firmas, ...(data?.firmas || {}) } };
  if (!merged.emisor_nombre || pareceFechaISO(merged.emisor_nombre)) merged.emisor_nombre = datosEmisorDefecto.emisor_nombre;
  if (soloNumeros(merged.ruc_empresa).length !== 13) merged.ruc_empresa = datosEmisorDefecto.ruc_empresa;
  if (!merged.matriz || pareceFechaISO(merged.matriz)) merged.matriz = datosEmisorDefecto.matriz;
  if (!tieneCorreoValido(merged.correo_empresa)) merged.correo_empresa = datosEmisorDefecto.correo_empresa;
  if (!merged.telefono_empresa || pareceFechaISO(merged.telefono_empresa)) merged.telefono_empresa = datosEmisorDefecto.telefono_empresa;
  if (/^B\d+$/i.test(merged.punto_partida || '')) merged.punto_partida = '';
  if (!merged.clave_acceso || merged.clave_acceso.length !== 49) {
    merged.clave_acceso = generarClaveAcceso({
      fecha: merged.fecha_emision,
      secuencial: secuencialDesdeEgreso(merged.numero_egreso),
      rucEmpresa: merged.ruc_empresa
    });
  }
  if (!merged.autorizacion) merged.autorizacion = merged.clave_acceso;
  if (!merged.destinatario) merged.destinatario = merged.punto_destino;
  if (!merged.direccion_destinatario) merged.direccion_destinatario = merged.punto_destino;
  if (!merged.doc_sustento) merged.doc_sustento = merged.numero_egreso;
  if (!merged.fecha_emision_doc_sustento) merged.fecha_emision_doc_sustento = merged.fecha_emision;
  return merged;
};

const InfoInput = ({ label, children }) => (
  <div>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const sinAutocompletar = {
  autoComplete: 'new-password',
  autoCorrect: 'off',
  spellCheck: false
};

const TextInput = ({ value, onChange, onlyNumbers = false, maxLength, ...props }) => (
  <input
    {...sinAutocompletar}
    {...props}
    value={value}
    onChange={e => {
      const valor = onlyNumbers ? soloNumeros(e.target.value) : e.target.value;
      onChange(maxLength ? valor.slice(0, maxLength) : valor);
    }}
    className="form-input"
  />
);

const TextAreaInput = ({ value, onChange, onlyNumbers = false, maxLength, rows = '2', ...props }) => (
  <textarea
    {...sinAutocompletar}
    {...props}
    rows={rows}
    value={value}
    onChange={e => {
      const valor = onlyNumbers ? soloNumeros(e.target.value) : e.target.value;
      onChange(maxLength ? valor.slice(0, maxLength) : valor);
    }}
    className="form-input"
    style={{ resize: 'vertical', ...(props.style || {}) }}
  />
);

const DateSelector = ({ value, onChange }) => {
  const inputRef = useRef(null);

  const abrirCalendario = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') input.showPicker();
    else input.focus();
  };

  return (
    <div style={{ position: 'relative', marginTop: '6px' }}>
      <input
        ref={inputRef}
        {...sinAutocompletar}
        type="date"
        value={value || hoyISO()}
        onChange={e => onChange(e.target.value)}
        className="form-input"
        style={{
          marginTop: 0,
          height: '42px',
          paddingLeft: '14px',
          paddingRight: '48px',
          borderColor: '#cfd4dc',
          borderRadius: '8px',
          fontWeight: '700',
          color: '#202124',
          backgroundColor: '#ffffff'
        }}
      />
      <button
        type="button"
        onClick={abrirCalendario}
        aria-label="Abrir calendario"
        style={{
          position: 'absolute',
          right: '1px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '42px',
          height: '40px',
          border: 'none',
          borderLeft: '1px solid #d9dee7',
          borderRadius: '0 7px 7px 0',
          background: '#f8fafc',
          color: '#017E84',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        <FaCalendarAlt />
      </button>
    </div>
  );
};

const RemissionGuidePage = () => {
  const [guia, setGuia] = useState(() => {
    const saved = localStorage.getItem('ultima_guia_remision');
    return saved ? normalizarGuia(JSON.parse(saved)) : crearGuiaVacia();
  });

  const hayDespacho = guia.items.length > 0;
  const totalUnidades = useMemo(() => guia.items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0), [guia.items]);

  useEffect(() => {
    localStorage.setItem('ultima_guia_remision', JSON.stringify(guia));
  }, [guia]);

  const actualizarCampo = (campo, valor) => setGuia(prev => ({ ...prev, [campo]: valor }));
  const actualizarFirma = (campo, valor) => setGuia(prev => ({ ...prev, firmas: { ...prev.firmas, [campo]: valor } }));
  const limpiarGuiaRemision = () => {
    const guiaVacia = crearGuiaVacia();
    localStorage.setItem('ultima_guia_remision', JSON.stringify(guiaVacia));
    setGuia(guiaVacia);
  };

  const regenerarClaveAcceso = () => {
    setGuia(prev => {
      const nuevaClave = generarClaveAcceso({
        fecha: prev.fecha_emision,
        secuencial: secuencialDesdeEgreso(prev.numero_egreso),
        rucEmpresa: prev.ruc_empresa
      });
      return {
        ...prev,
        clave_acceso: nuevaClave,
        autorizacion: nuevaClave,
        fecha_autorizacion: new Date().toLocaleString('es-EC')
      };
    });
  };

  const texto = (valor, fallback = 'N/A') => (valor && valor.toString().trim()) || fallback;

  const dibujarCampoCajaPDF = (doc, label, value, x, y, width, height, options = {}) => {
    const { fontSize = 8, labelSize = 6.8, fill = [255, 255, 255], labelColor = [92, 102, 112], valueColor = [17, 24, 39] } = options;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(...fill);
    doc.roundedRect(x, y, width, height, 2, 2, 'FD');
    doc.setFont('', 'bold');
    doc.setFontSize(labelSize);
    doc.setTextColor(...labelColor);
    const labelLines = doc.splitTextToSize(label.toUpperCase(), width - 8).slice(0, 1);
    doc.text(labelLines, x + 4, y + 5);
    doc.setFont('', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...valueColor);
    const lineHeight = fontSize * 0.45 + 1.4;
    const maxLines = Math.max(1, Math.floor((height - 9) / lineHeight));
    const lines = doc.splitTextToSize(texto(value, ''), width - 8).slice(0, maxLines);
    doc.text(lines, x + 4, y + 10);
  };

  const dibujarTituloSeccionPDF = (doc, titulo, x, y, width) => {
    doc.setFillColor(17, 24, 39);
    doc.roundedRect(x, y, width, 7, 1.5, 1.5, 'F');
    doc.setFont('', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo.toUpperCase(), x + 4, y + 4.8);
  };

  const dibujarCodigoBarrasSimple = (doc, valor, x, y, width, height) => {
    const limpio = soloNumeros(valor).padEnd(40, '0');
    const barCount = 58;
    const unit = width / barCount;
    doc.setFillColor(0);
    for (let i = 0; i < barCount; i++) {
      const digit = Number(limpio[i % limpio.length]);
      const barWidth = digit % 3 === 0 ? unit * 0.55 : unit * 0.85;
      if (digit % 2 === 0 || i % 5 === 0) doc.rect(x + i * unit, y, barWidth, height, 'F');
    }
  };

  const generarPDFGuia = () => {
    if (!hayDespacho) return alert('⚠️ Primero debe despachar productos desde Nota de Egreso.');

    try {
      const doc = new jsPDF();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(10, 10, 190, 274, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(10, 10, 190, 274, 3, 3);

      doc.setFillColor(17, 24, 39);
      doc.rect(10, 10, 190, 4, 'F');

      agregarLogoPDF(doc, { x: 18, y: 20, width: 46, height: 30 });

      doc.setFont('', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(17, 24, 39);
      doc.text('GUIA DE REMISION', 110, 24);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`No. ${texto(guia.numero_guia).replace('GUI-', '')}`, 110, 31);

      dibujarCampoCajaPDF(doc, 'Numero de Autorizacion', guia.autorizacion || guia.clave_acceso, 110, 36, 80, 15, { fontSize: 5.8, fill: [248, 250, 252] });
      dibujarCampoCajaPDF(doc, 'Fecha/hora autorizacion', guia.fecha_autorizacion, 104, 54, 47, 11, { fontSize: 5.4, labelSize: 5.4 });
      dibujarCampoCajaPDF(doc, 'Ambiente', guia.ambiente, 154, 54, 22, 11, { fontSize: 4.8, labelSize: 5.2 });
      dibujarCampoCajaPDF(doc, 'Emision', guia.emision, 179, 54, 18, 11, { fontSize: 4.8, labelSize: 5.2 });

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(110, 68, 80, 27, 2, 2, 'FD');
      doc.setFont('', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(92, 102, 112);
      doc.text('CLAVE DE ACCESO', 114, 74);
      dibujarCodigoBarrasSimple(doc, guia.clave_acceso, 114, 77, 72, 11);
      doc.setFont('', 'normal');
      doc.setFontSize(4.8);
      doc.setTextColor(17, 24, 39);
      doc.text(doc.splitTextToSize(guia.clave_acceso, 72), 114, 92);

      dibujarTituloSeccionPDF(doc, 'Datos del Emisor', 18, 57, 82);
      dibujarCampoCajaPDF(doc, 'Emisor', guia.emisor_nombre, 18, 67, 39, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'RUC', guia.ruc_empresa, 61, 67, 39, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Matriz', guia.matriz, 18, 81, 82, 14, { fontSize: 6 });

      dibujarTituloSeccionPDF(doc, 'Informacion del Traslado', 18, 102, 172);
      dibujarCampoCajaPDF(doc, 'Transportista', guia.transportista, 18, 112, 49, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'RUC/CI', guia.ruc_transportista, 70, 112, 27, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Placa', guia.placa_vehiculo, 100, 112, 25, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Correo transportista', guia.correo_transportista, 128, 112, 62, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Partida', guia.punto_partida, 18, 126, 49, 12, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Destino', guia.punto_destino, 70, 126, 55, 12, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Motivo', guia.motivo, 128, 126, 62, 12, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Fecha Inicio', guia.fecha_inicio_traslado, 18, 141, 32, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Fecha Fin', guia.fecha_fin_traslado, 53, 141, 32, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Fecha Emision', guia.fecha_emision, 88, 141, 32, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Telefono', guia.telefono, 123, 141, 28, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Codigo Destino', guia.codigo_destino, 154, 141, 36, 11, { fontSize: 5.7, labelSize: 5.8 });

      dibujarTituloSeccionPDF(doc, 'Datos del Destinatario', 18, 159, 172);
      dibujarCampoCajaPDF(doc, 'Destinatario', guia.destinatario, 18, 169, 49, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'RUC/CI', guia.ruc_destinatario, 70, 169, 27, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Correo destinatario', guia.correo_destinatario, 100, 169, 90, 11, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Direccion', guia.direccion_destinatario, 18, 183, 49, 12, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Ruta', guia.ruta, 70, 183, 38, 12, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Doc. Sustento', guia.doc_sustento, 111, 183, 34, 12, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Fecha Doc.', guia.fecha_emision_doc_sustento, 148, 183, 42, 12, { fontSize: 6 });
      dibujarCampoCajaPDF(doc, 'Autorizacion', guia.autorizacion || guia.clave_acceso, 18, 198, 82, 12, { fontSize: 4.8 });
      dibujarCampoCajaPDF(doc, 'Descripcion', guia.descripcion, 103, 198, 87, 12, { fontSize: 6 });

      doc.setFont('', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(17, 24, 39);
      doc.text('Detalle de productos despachados', 18, 219);

      autoTable(doc, {
        startY: 224,
        margin: { left: 14, right: 14 },
        head: [['Item', 'Código / LPN', 'Producto despachado', 'Embalaje', 'Cantidad']],
        body: guia.items.map((item, index) => [
          index + 1,
          item.codigo || item.sku || '',
          item.nombre_producto || '',
          item.embalaje_resumen || item.tipo || '',
          item.cantidad || 0
        ]),
        theme: 'grid',
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        headStyles: { fillColor: [17, 24, 39], textColor: 255, halign: 'center', fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak', fillColor: [255, 255, 255], lineColor: [226, 232, 240] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 34 },
          2: { cellWidth: 84 },
          3: { cellWidth: 34 },
          4: { halign: 'center', cellWidth: 18 }
        }
      });

      const finalY = Math.min(doc.lastAutoTable ? doc.lastAutoTable.finalY + 5 : 244, 250);

      doc.setFont('', 'bold');
      doc.setFontSize(8);
      doc.text(`TOTAL UNIDADES DESPACHADAS: ${totalUnidades}`, 18, finalY);
      doc.setFont('', 'normal');
      doc.text('Observaciones:', 18, finalY + 7);
      doc.setFontSize(7);
      doc.text(texto(guia.observaciones, 'Ninguna.'), 18, finalY + 12, { maxWidth: 174 });

      const firmaY = 270;
      const firmas = [
        { x: 20, label: 'Entregado por', nombre: guia.firmas.entregadoPor },
        { x: 78, label: 'Recibí Conforme Transportista', nombre: guia.firmas.recibidoTransportista },
        { x: 145, label: 'Recibí Conforme Cliente', nombre: guia.firmas.recibidoCliente }
      ];

      doc.setFontSize(8);
      firmas.forEach(firma => {
        doc.text('____________________________', firma.x, firmaY);
        doc.setFont('', 'bold');
        doc.text(firma.label, firma.x + 2, firmaY + 6);
        doc.setFont('', 'normal');
        if (firma.nombre) doc.text(firma.nombre, firma.x + 2, firmaY + 12, { maxWidth: 44 });
      });

      doc.save(`${guia.numero_guia}_Guia_Remision.pdf`);
      limpiarGuiaRemision();
    } catch (error) {
      console.error('Error generando guía de remisión:', error);
      alert('No se pudo generar el PDF de la Guía de Remisión.');
    }
  };

  return (
    <div className="receiving-container">
      <div id="sincot-logo-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#202124', color: 'white', padding: '10px', borderRadius: '8px' }}><FaFileSignature size="1.5em" /></div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#202124' }}>Guía de Remisión</h2>
        </div>
        <button onClick={generarPDFGuia} className="btn-primary" style={{ background: '#202124' }} disabled={!hayDespacho}><FaPrint /> Imprimir PDF</button>
      </div>

      <div className="form-card" style={{ maxWidth: '1120px', margin: '0 auto', border: '1px solid #202124' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '18px', alignItems: 'start', borderBottom: '2px solid #202124', paddingBottom: '18px', marginBottom: '22px' }}>
          <div style={{ fontWeight: 'bold', color: '#202124' }}>ZB SOLUCIONES SAS</div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#202124', margin: 0, fontWeight: '700' }}>Guía de Remisión</h2>
            <div style={{ color: '#d93025', fontWeight: 'bold', marginTop: '6px' }}>{guia.numero_guia}</div>
            <div style={{ color: '#5f6368', marginTop: '4px', fontSize: '0.85rem' }}>Nota de egreso: {guia.numero_egreso || 'N/A'}</div>
          </div>
          <div style={{ border: '1px solid #dadce0', padding: '12px', borderRadius: '6px' }}>
            <label className="form-label">Clave de acceso SRI *</label>
            <TextAreaInput value={guia.clave_acceso} onChange={valor => actualizarCampo('clave_acceso', valor)} onlyNumbers maxLength={49} rows="3" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
            <button type="button" onClick={regenerarClaveAcceso} className="btn-secondary" style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}>Regenerar clave</button>
          </div>
        </div>

        {!hayDespacho && (
          <div className="section-card" style={{ marginBottom: '20px', textAlign: 'center', color: '#5f6368' }}>
            No hay productos despachados para generar una guía. Procese una Nota de Egreso y esta pantalla se llenará automáticamente.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
          <div className="section-card">
            <h4 className="section-header">Datos del Emisor</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <InfoInput label="Emisor"><TextInput value={guia.emisor_nombre} onChange={valor => actualizarCampo('emisor_nombre', valor)} /></InfoInput>
              <InfoInput label="RUC empresa"><TextInput value={guia.ruc_empresa} onChange={valor => actualizarCampo('ruc_empresa', valor)} onlyNumbers maxLength={13} /></InfoInput>
              <InfoInput label="Correo electrónico"><TextInput value={guia.correo_empresa} onChange={valor => actualizarCampo('correo_empresa', valor)} /></InfoInput>
              <InfoInput label="Teléfono"><TextInput value={guia.telefono_empresa} onChange={valor => actualizarCampo('telefono_empresa', valor)} /></InfoInput>
              <div style={{ gridColumn: '1 / -1' }}><InfoInput label="Matriz"><TextAreaInput value={guia.matriz} onChange={valor => actualizarCampo('matriz', valor)} rows="2" /></InfoInput></div>
            </div>
          </div>

          <div className="section-card">
            <h4 className="section-header">Autorización SRI</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <InfoInput label="Número de autorización"><TextAreaInput value={guia.autorizacion} onChange={valor => actualizarCampo('autorizacion', valor)} onlyNumbers maxLength={49} rows="2" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} /></InfoInput>
              <InfoInput label="Fecha y hora autorización"><TextInput value={guia.fecha_autorizacion} onChange={valor => actualizarCampo('fecha_autorizacion', valor)} /></InfoInput>
              <InfoInput label="Ambiente"><select value={guia.ambiente} onChange={e => actualizarCampo('ambiente', e.target.value)} className="form-input"><option>PRODUCCION</option><option>PRUEBAS</option></select></InfoInput>
              <InfoInput label="Emisión"><select value={guia.emision} onChange={e => actualizarCampo('emision', e.target.value)} className="form-input"><option>NORMAL</option><option>INDISPONIBILIDAD</option></select></InfoInput>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '25px' }}>
          <div className="section-card">
            <h4 className="section-header"><FaRoute /> Información del Traslado</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <InfoInput label="Fecha emisión"><DateSelector value={guia.fecha_emision} onChange={valor => actualizarCampo('fecha_emision', valor)} /></InfoInput>
              <InfoInput label="Inicio traslado"><DateSelector value={guia.fecha_inicio_traslado} onChange={valor => actualizarCampo('fecha_inicio_traslado', valor)} /></InfoInput>
              <InfoInput label="Fin traslado"><DateSelector value={guia.fecha_fin_traslado} onChange={valor => actualizarCampo('fecha_fin_traslado', valor)} /></InfoInput>
              <InfoInput label="Punto de partida"><TextInput value={guia.punto_partida} onChange={valor => actualizarCampo('punto_partida', valor)} autoComplete="off" name="sincot_punto_partida_manual" /></InfoInput>
              <InfoInput label="Punto de destino"><TextInput value={guia.punto_destino} onChange={valor => actualizarCampo('punto_destino', valor)} /></InfoInput>
              <InfoInput label="Código destino (opcional)"><TextInput value={guia.codigo_destino} onChange={valor => actualizarCampo('codigo_destino', valor)} /></InfoInput>
              <InfoInput label="Motivo de traslado"><TextInput value={guia.motivo} onChange={valor => actualizarCampo('motivo', valor)} /></InfoInput>
              <InfoInput label="Teléfono (opcional)"><TextInput value={guia.telefono} onChange={valor => actualizarCampo('telefono', valor)} /></InfoInput>
              <InfoInput label="Total unidades"><TextInput value={totalUnidades} onChange={() => {}} disabled /></InfoInput>
            </div>
          </div>

          <div className="section-card">
            <h4 className="section-header"><FaTruck /> Datos del Transporte</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
              <InfoInput label="Transportista"><TextInput value={guia.transportista} onChange={valor => actualizarCampo('transportista', valor)} /></InfoInput>
              <InfoInput label="RUC/CI transportista"><TextInput value={guia.ruc_transportista} onChange={valor => actualizarCampo('ruc_transportista', valor)} onlyNumbers maxLength={13} /></InfoInput>
              <InfoInput label="Placa vehículo"><TextInput value={guia.placa_vehiculo} onChange={valor => actualizarCampo('placa_vehiculo', valor)} /></InfoInput>
              <InfoInput label="Correo transportista"><TextInput value={guia.correo_transportista} onChange={valor => actualizarCampo('correo_transportista', valor)} /></InfoInput>
              <InfoInput label="Descripción (opcional)"><TextAreaInput value={guia.descripcion} onChange={valor => actualizarCampo('descripcion', valor)} rows="3" /></InfoInput>
            </div>
          </div>
        </div>

        <div className="section-card" style={{ marginBottom: '25px' }}>
          <h4 className="section-header">Datos del Destinatario</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <InfoInput label="Destinatario"><TextInput value={guia.destinatario} onChange={valor => actualizarCampo('destinatario', valor)} /></InfoInput>
            <InfoInput label="RUC/CI destinatario"><TextInput value={guia.ruc_destinatario} onChange={valor => actualizarCampo('ruc_destinatario', valor)} onlyNumbers maxLength={13} /></InfoInput>
            <InfoInput label="Correo destinatario"><TextInput value={guia.correo_destinatario} onChange={valor => actualizarCampo('correo_destinatario', valor)} /></InfoInput>
            <InfoInput label="Dirección destinatario"><TextInput value={guia.direccion_destinatario} onChange={valor => actualizarCampo('direccion_destinatario', valor)} /></InfoInput>
            <InfoInput label="Ruta"><TextInput value={guia.ruta} onChange={valor => actualizarCampo('ruta', valor)} /></InfoInput>
            <InfoInput label="Doc. sustento"><TextInput value={guia.doc_sustento} onChange={valor => actualizarCampo('doc_sustento', valor)} /></InfoInput>
            <InfoInput label="Fecha emisión doc. sustento"><DateSelector value={guia.fecha_emision_doc_sustento} onChange={valor => actualizarCampo('fecha_emision_doc_sustento', valor)} /></InfoInput>
          </div>
        </div>

        <div className="section-card">
          <h4 style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: '#202124', textTransform: 'uppercase' }}>Detalle de productos despachados</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#202124', color: '#ffffff', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px' }}>Item</th>
                  <th style={{ padding: '12px 8px' }}>Código / LPN</th>
                  <th style={{ padding: '12px 8px' }}>Descripción</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Producto despachado</th>
                  <th style={{ padding: '12px 8px' }}>Embalaje</th>
                  <th style={{ padding: '12px 8px' }}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {guia.items.map((item, index) => (
                  <tr key={`${item.codigo}-${index}`} style={{ borderBottom: '1px solid #eaeaea' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#202124' }}>{item.codigo}</td>
                    <td style={{ padding: '10px 8px', color: '#5f6368' }}>{guia.descripcion || item.descripcion || '-'}</td>
                    <td style={{ padding: '10px 8px', color: '#5f6368' }}>{item.nombre_producto}<br /><small>{item.sku}</small></td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{item.embalaje_resumen || item.tipo}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold' }}>{item.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '20px', marginBottom: '25px' }}>
          <label className="form-label">Observaciones</label>
          <TextAreaInput value={guia.observaciones} onChange={valor => actualizarCampo('observaciones', valor)} rows="2" />
        </div>

        <div className="signature-grid" style={{ justifyContent: 'space-between', gap: '15px', flexWrap: 'wrap' }}>
          <div className="signature-block">
            <div style={{ borderBottom: '2px solid #202124', width: '230px', marginBottom: '10px', marginTop: '35px' }}></div>
            <span className="sign-label">Entregado por</span>
            <input type="text" {...sinAutocompletar} className="sign-input" value={guia.firmas.entregadoPor} onChange={e => actualizarFirma('entregadoPor', e.target.value)} placeholder="Nombre..." />
          </div>
          <div className="signature-block">
            <div style={{ borderBottom: '2px solid #202124', width: '230px', marginBottom: '10px', marginTop: '35px' }}></div>
            <span className="sign-label">Recibí Conforme Transportista</span>
            <input type="text" {...sinAutocompletar} className="sign-input" value={guia.firmas.recibidoTransportista} onChange={e => actualizarFirma('recibidoTransportista', e.target.value)} placeholder="Nombre..." />
          </div>
          <div className="signature-block">
            <div style={{ borderBottom: '2px solid #202124', width: '230px', marginBottom: '10px', marginTop: '35px' }}></div>
            <span className="sign-label">Recibí Conforme Cliente</span>
            <input type="text" {...sinAutocompletar} className="sign-input" value={guia.firmas.recibidoCliente} onChange={e => actualizarFirma('recibidoCliente', e.target.value)} placeholder="Nombre..." />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemissionGuidePage;
