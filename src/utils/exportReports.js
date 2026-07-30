import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { agregarLogoExcel, agregarLogoPDF, descargarWorkbookExcel } from './reportAssets';

// ---------------------------------------------------------
// HELPER: Decodificador de Ubicaciones Físicas (Ej: "B01-A01A01")
// ---------------------------------------------------------
const parseUbicacion = (ubicacionStr) => {
    if (!ubicacionStr || ubicacionStr === 'Por Asignar' || ubicacionStr === 'Sin Asignar') {
        return { bId: '-', bDesc: 'Sin Asignar', rack: 'Por Asignar' };
    }
    if (ubicacionStr.includes('-')) {
        const parts = ubicacionStr.split('-');
        const bId = parts[0];
        const rackFisico = parts[1];
        
        let bDesc = 'Bodega General';
        if (bId === 'B00') bDesc = 'Materia prima';
        else if (bId === 'B01') bDesc = 'Producto terminado';
        else if (bId === 'B02') bDesc = 'Refabricado';
        else if (bId === 'B03') bDesc = 'Devoluciones';
        else if (bId === 'B04') bDesc = 'Dañados';
        else if (bId === 'B05') bDesc = 'Despacho';
        
        return { bId, bDesc, rack: rackFisico };
    }
    return { bId: '-', bDesc: 'Bodega General', rack: ubicacionStr };
};

const normalizarProductosConStock = (productos) => (
    productos
        .filter(p => Number(p.stock_actual) > 0)
        .map(prod => {
            const ubi = parseUbicacion(prod.ubicacion_bodega);
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
);

const exportarExcelConLogo = async ({ dataExcel, sheetName, title, subtitle, fileName, footerRows = [] }) => {
    const headers = Object.keys(dataExcel[0] || {});
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SINCOT';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = headers.map(header => ({
        key: header,
        width: Math.max(14, Math.min(38, header.length + 4))
    }));

    agregarLogoExcel(workbook, worksheet);

    const lastColumn = worksheet.getColumn(Math.max(headers.length, 5)).letter;
    worksheet.mergeCells(`C1:${lastColumn}1`);
    worksheet.mergeCells(`C2:${lastColumn}2`);
    worksheet.getCell('C1').value = title;
    worksheet.getCell('C1').font = { bold: true, size: 16, color: { argb: 'FF1A73E8' } };
    worksheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('C2').value = subtitle;
    worksheet.getCell('C2').font = { size: 10, color: { argb: 'FF5F6368' } };
    worksheet.getCell('C2').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFDADCE0' } },
            left: { style: 'thin', color: { argb: 'FFDADCE0' } },
            bottom: { style: 'thin', color: { argb: 'FFDADCE0' } },
            right: { style: 'thin', color: { argb: 'FFDADCE0' } }
        };
    });

    dataExcel.forEach(item => worksheet.addRow(headers.map(header => item[header])));
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 4) return;
        row.eachCell(cell => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE8EAED' } },
                left: { style: 'thin', color: { argb: 'FFE8EAED' } },
                bottom: { style: 'thin', color: { argb: 'FFE8EAED' } },
                right: { style: 'thin', color: { argb: 'FFE8EAED' } }
            };
        });
    });

    footerRows.forEach(row => worksheet.addRow(row));
    await descargarWorkbookExcel(workbook, fileName);
};

export const clasificarInventarioABC = (productos) => {
    const base = normalizarProductosConStock(productos);
    const totalValor = base.reduce((sum, p) => sum + p.valorInventario, 0);
    const usarCantidad = totalValor <= 0;
    const totalBase = usarCantidad ? base.reduce((sum, p) => sum + p.stock, 0) : totalValor;
    let acumulado = 0;

    return [...base]
        .sort((a, b) => {
            const valorA = usarCantidad ? a.stock : a.valorInventario;
            const valorB = usarCantidad ? b.stock : b.valorInventario;
            return valorB - valorA;
        })
        .map((prod, index) => {
            const peso = usarCantidad ? prod.stock : prod.valorInventario;
            acumulado += peso;
            const porcentajeAcumulado = totalBase > 0 ? (acumulado / totalBase) * 100 : 0;
            const claseABC = porcentajeAcumulado <= 80 ? 'A' : porcentajeAcumulado <= 95 ? 'B' : 'C';
            const frecuenciaConteo = claseABC === 'A' ? 'Mensual / prioridad alta' : claseABC === 'B' ? 'Trimestral / prioridad media' : 'Semestral / prioridad baja';

            return {
                ...prod,
                rankingABC: index + 1,
                claseABC,
                porcentajeAcumulado,
                frecuenciaConteo
            };
        });
};

// ---------------------------------------------------------
// 1. REPORTES DE STOCK GENERAL (Cantidades Físicas)
// ---------------------------------------------------------
export const exportarInventarioPDF = (productos) => {
    const productosConStock = productos.filter(p => Number(p.stock_actual) > 0);
    if (productosConStock.length === 0) return alert("⚠️ No hay productos con stock físico.");

    // PDF en formato Landscape (Horizontal) para acomodar más columnas
    const doc = new jsPDF({ orientation: 'landscape' });
    const fechaActual = new Date().toLocaleString('es-ES');
    agregarLogoPDF(doc, { x: 14, y: 6, width: 30, height: 20 });

    doc.setFontSize(18);
    doc.setTextColor(26, 115, 232);
    doc.text("REPORTE DE STOCK GENERAL Y TRAZABILIDAD", 148, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`SINCOT - ZB Soluciones SAS | Generado: ${fechaActual}`, 148, 22, { align: 'center' });
    doc.text(`Total de Ítems con existencia: ${productosConStock.length}`, 148, 28, { align: 'center' });

    const columns = ["Identificación (SKU)", "Detalle del Equipo", "Bodega", "Desc. Bodega", "Ubicación", "Stock Físico", "Precio Ref."];
    const rows = productosConStock.map(prod => {
        const ubi = parseUbicacion(prod.ubicacion_bodega);
        return [
            prod.sku || 'N/A', 
            prod.nombre_producto || 'Sin Nombre', 
            ubi.bId,
            ubi.bDesc,
            ubi.rack,
            prod.stock_actual || '0', 
            `$${prod.precio || '0.00'}`
        ];
    });

    autoTable(doc, { 
        startY: 35, 
        head: [columns], 
        body: rows, 
        theme: 'grid', 
        headStyles: { fillColor: [26, 115, 232], textColor: 255 }, 
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 5: { halign: 'center', fontStyle: 'bold' }, 6: { halign: 'right' } }
    });
    
    doc.save(`Reporte_Stock_General_${new Date().getTime()}.pdf`);
};

export const exportarInventarioExcel = async (productos) => {
    const productosConStock = productos.filter(p => Number(p.stock_actual) > 0);
    if (productosConStock.length === 0) return alert("⚠️ No hay productos con stock físico.");

    const dataExcel = productosConStock.map(prod => {
        const ubi = parseUbicacion(prod.ubicacion_bodega);
        return {
            "Identificación (SKU)": prod.sku || 'N/A', 
            "Part Number": prod.part_number || 'N/A',
            "Detalle del Equipo": prod.nombre_producto || 'Sin Nombre', 
            "Categoría": prod.tipo_producto || 'General',
            "Bodega": ubi.bId,
            "Descripción Bodega": ubi.bDesc,
            "Ubicación Física": ubi.rack,
            "Stock Físico": Number(prod.stock_actual) || 0, 
            "Precio Referencial": Number(prod.precio) || 0,
            "Estado": prod.status_equipo === 'Descontinuado' ? 'INACTIVO' : 'ACTIVO'
        };
    });

    await exportarExcelConLogo({
        dataExcel,
        sheetName: "Stock General",
        title: "REPORTE DE STOCK GENERAL Y TRAZABILIDAD",
        subtitle: `SINCOT - ZB Soluciones SAS | Generado: ${new Date().toLocaleString('es-ES')}`,
        fileName: `Reporte_Stock_General_${new Date().getTime()}.xlsx`
    });
};

// ---------------------------------------------------------
// 2. REPORTES DE STOCK VALORADO (Financiero)
// ---------------------------------------------------------
export const exportarStockValoradoPDF = (productos) => {
    const productosConStock = productos.filter(p => Number(p.stock_actual) > 0);
    if (productosConStock.length === 0) return alert("⚠️ No hay productos con stock para valorar.");

    const doc = new jsPDF({ orientation: 'landscape' });
    const fechaActual = new Date().toLocaleString('es-ES');
    agregarLogoPDF(doc, { x: 14, y: 6, width: 30, height: 20 });

    const granTotal = productosConStock.reduce((sum, p) => sum + (Number(p.stock_actual) * Number(p.precio || 0)), 0);

    doc.setFontSize(18);
    doc.setTextColor(52, 168, 83); 
    doc.text("REPORTE DE STOCK VALORADO Y POSICIONES", 148, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`SINCOT - ZB Soluciones SAS | Generado: ${fechaActual}`, 148, 22, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(32, 33, 36);
    doc.text(`GRAN TOTAL INVERTIDO: $${granTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 148, 30, { align: 'center' });

    const columns = ["SKU", "Equipo", "Bodega", "Ubicación", "Stock Físico", "Costo Unit.", "Valor Total"];
    const rows = productosConStock.map(prod => {
        const ubi = parseUbicacion(prod.ubicacion_bodega);
        const stock = Number(prod.stock_actual) || 0;
        const precio = Number(prod.precio) || 0;
        const total = stock * precio;
        return [
            prod.sku || 'N/A', 
            prod.nombre_producto || 'Sin Nombre', 
            ubi.bId,
            ubi.rack,
            stock.toString(), 
            `$${precio.toFixed(2)}`, 
            `$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
        ];
    });

    autoTable(doc, { 
        startY: 38, head: [columns], body: rows, theme: 'grid', 
        headStyles: { fillColor: [52, 168, 83], textColor: 255 }, 
        styles: { fontSize: 8 },
        columnStyles: { 4: { halign: 'center' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } } 
    });

    doc.save(`Reporte_Stock_Valorado_${new Date().getTime()}.pdf`);
};

export const exportarStockValoradoExcel = async (productos) => {
    const productosConStock = productos.filter(p => Number(p.stock_actual) > 0);
    if (productosConStock.length === 0) return alert("⚠️ No hay productos con stock para valorar.");

    const dataExcel = productosConStock.map(prod => {
        const ubi = parseUbicacion(prod.ubicacion_bodega);
        const stock = Number(prod.stock_actual) || 0;
        const precio = Number(prod.precio) || 0;
        return {
            "Identificación (SKU)": prod.sku || 'N/A',
            "Detalle del Equipo": prod.nombre_producto || 'Sin Nombre',
            "Marca": prod.marca || 'N/A',
            "Bodega": ubi.bId,
            "Descripción Bodega": ubi.bDesc,
            "Ubicación Física": ubi.rack,
            "Stock Físico": stock,
            "Costo Unitario ($)": precio,
            "Valor Total ($)": stock * precio
        };
    });

    await exportarExcelConLogo({
        dataExcel,
        sheetName: "Stock Valorado",
        title: "REPORTE DE STOCK VALORADO Y POSICIONES",
        subtitle: `SINCOT - ZB Soluciones SAS | Generado: ${new Date().toLocaleString('es-ES')}`,
        fileName: `Reporte_Stock_Valorado_${new Date().getTime()}.xlsx`
    });
};

// ---------------------------------------------------------
// 3. ORDEN DE REPOSICIÓN
// ---------------------------------------------------------
export const generarPDFReposicion = (producto, cantidadReponer) => {
    if(!producto) return;
    const ubi = parseUbicacion(producto.ubicacion_bodega);
    const cantidad = Number(cantidadReponer) || 0;
    const costoUnitario = Number(producto.precio || 0);
    const costoEstimado = cantidad * costoUnitario;
    const fecha = new Date();
    const folio = `OR-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}-${producto.id_producto || producto.sku || 'DOC'}`;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    const red = [234, 67, 53];
    const darkRed = [165, 14, 14];
    const textDark = [32, 33, 36];
    const textMuted = [95, 99, 104];
    const border = [224, 229, 235];
    const lightRed = [252, 232, 230];
    const lightGray = [248, 249, 250];

    doc.setFillColor(...red);
    doc.rect(0, 0, pageWidth, 8, 'F');
    agregarLogoPDF(doc, { x: margin, y: 15, width: 32, height: 22 });

    doc.setTextColor(...red);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text("ORDEN DE REPOSICIÓN DE STOCK", pageWidth - margin, 22, { align: 'right' });

    doc.setTextColor(...textMuted);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Folio: ${folio}`, pageWidth - margin, 30, { align: 'right' });
    doc.text(`Generado: ${fecha.toLocaleString('es-ES')}`, pageWidth - margin, 36, { align: 'right' });

    doc.setDrawColor(...border);
    doc.line(margin, 45, pageWidth - margin, 45);

    doc.setFillColor(...lightRed);
    doc.roundedRect(margin, 54, contentWidth, 34, 3, 3, 'F');
    doc.setTextColor(...darkRed);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("Producto a reponer", margin + 6, 65);
    doc.setTextColor(...textDark);
    doc.setFontSize(13);
    doc.text(producto.nombre_producto || 'Sin Nombre', margin + 6, 74, { maxWidth: contentWidth - 12 });
    doc.setTextColor(...textMuted);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`SKU: ${producto.sku || 'N/A'}  |  Estado: ${producto.status_equipo || producto.estado || 'Activo'}`, margin + 6, 83);

    const cardY = 98;
    const cardGap = 6;
    const cardWidth = (contentWidth - (cardGap * 2)) / 3;
    const drawMetricCard = (x, title, value, accent = false) => {
        doc.setFillColor(...(accent ? lightRed : lightGray));
        doc.setDrawColor(...(accent ? red : border));
        doc.roundedRect(x, cardY, cardWidth, 28, 3, 3, 'FD');
        doc.setTextColor(...textMuted);
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text(title, x + 5, cardY + 9);
        doc.setTextColor(...(accent ? darkRed : textDark));
        doc.setFontSize(13);
        doc.text(String(value), x + 5, cardY + 21);
    };

    drawMetricCard(margin, "Stock actual", producto.stock_actual || '0');
    drawMetricCard(margin + cardWidth + cardGap, "Cantidad solicitada", cantidad.toString(), true);
    drawMetricCard(margin + (cardWidth + cardGap) * 2, "Costo estimado", `$${costoEstimado.toFixed(2)}`);

    autoTable(doc, {
        startY: 140,
        head: [["Detalle operativo", "Valor"]],
        body: [
            ["Bodega actual", `${ubi.bId} - ${ubi.bDesc}`],
            ["Ubicación de almacenaje", ubi.rack],
            ["Costo unitario", `$${costoUnitario.toFixed(2)}`],
            ["Marca", producto.marca || 'N/A'],
            ["Part number", producto.part_number || 'N/A']
        ],
        theme: 'plain',
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: border,
            lineWidth: 0.2,
            textColor: textDark
        },
        headStyles: {
            fillColor: red,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 58, fontStyle: 'bold', textColor: textMuted },
            1: { cellWidth: contentWidth - 58 }
        },
        alternateRowStyles: { fillColor: [251, 252, 254] },
        margin: { left: margin, right: margin }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setDrawColor(...border);
    doc.roundedRect(margin, finalY, contentWidth, 26, 3, 3, 'S');
    doc.setTextColor(...textMuted);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text("Observación", margin + 5, finalY + 8);
    doc.setFont(undefined, 'normal');
    doc.text("Orden generada desde SINCOT para reposición de inventario. Validar disponibilidad presupuestaria y proveedor antes de emitir compra.", margin + 5, finalY + 17, { maxWidth: contentWidth - 10 });

    doc.setTextColor(...textMuted);
    doc.setFontSize(8);
    doc.text("Documento generado automáticamente por SINCOT | ZB Soluciones", pageWidth / 2, 286, { align: 'center' });

    doc.save(`Orden_Reposicion_${producto.sku || 'Doc'}.pdf`);
};

// ---------------------------------------------------------
// 4. REPORTES DE CONTEO DE INVENTARIO
// ---------------------------------------------------------
export const exportarInventarioAnualExcel = async (productos) => {
    const productosConStock = normalizarProductosConStock(productos);
    if (productosConStock.length === 0) return alert("⚠️ No hay productos con stock para inventario anual.");

    const dataExcel = productosConStock.map(prod => ({
        "Planta / Bodega": prod.ubi.bId,
        "Descripción Bodega": prod.ubi.bDesc,
        "Código / SKU": prod.sku || 'N/A',
        "Part Number": prod.part_number || 'N/A',
        "Descripción": prod.nombre_producto || 'Sin Nombre',
        "Marca": prod.marca || 'N/A',
        "Ubicación": prod.ubi.rack,
        "Cantidad Física": "",
        "Observación": ""
    }));

    await exportarExcelConLogo({
        dataExcel,
        sheetName: "Inventario Anual",
        title: "HOJA DE CONTEO CIEGO - INVENTARIO ANUAL",
        subtitle: `SINCOT - ZB Soluciones SAS | Generado: ${new Date().toLocaleString('es-ES')}`,
        footerRows: [
            [],
            ["Responsable del conteo:", "", "Firma:", "", "Fecha:"]
        ],
        fileName: `Stock_Inventario_Anual_${new Date().getTime()}.xlsx`
    });
};

export const exportarInventarioAnualPDF = (productos) => {
    const productosConStock = normalizarProductosConStock(productos);
    if (productosConStock.length === 0) return alert("⚠️ No hay productos con stock para inventario anual.");

    const doc = new jsPDF({ orientation: 'landscape' });
    const fechaActual = new Date().toLocaleString('es-ES');
    agregarLogoPDF(doc, { x: 14, y: 6, width: 30, height: 20 });

    doc.setFontSize(18);
    doc.setTextColor(52, 168, 83);
    doc.text("HOJA DE CONTEO CIEGO - INVENTARIO ANUAL", 148, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`SINCOT | Generado: ${fechaActual} | Total SKUs: ${productosConStock.length}`, 148, 22, { align: 'center' });

    autoTable(doc, {
        startY: 30,
        head: [["Bodega", "Desc. Bodega", "SKU", "Producto", "Ubicación", "Conteo Físico", "Observación"]],
        body: productosConStock.map(prod => [
            prod.ubi.bId,
            prod.ubi.bDesc,
            prod.sku || 'N/A',
            prod.nombre_producto || 'Sin Nombre',
            prod.ubi.rack,
            "",
            ""
        ]),
        theme: 'grid',
        headStyles: { fillColor: [52, 168, 83], textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 5: { halign: 'center' } }
    });

    const finalY = doc.lastAutoTable?.finalY || 185;
    const firmaY = Math.min(finalY + 18, 195);
    doc.setFontSize(10);
    doc.setTextColor(32, 33, 36);
    doc.text("Responsable del conteo:", 20, firmaY);
    doc.line(62, firmaY, 122, firmaY);
    doc.text("Firma:", 158, firmaY);
    doc.line(172, firmaY, 240, firmaY);

    doc.save(`Stock_Inventario_Anual_${new Date().getTime()}.pdf`);
};

export const exportarInventarioCiclicoABCExcel = async (productos) => {
    const productosABC = productos.some(prod => prod.claseABC && prod.rankingABC) ? productos : clasificarInventarioABC(productos);
    if (productosABC.length === 0) return alert("⚠️ No hay productos con stock para inventario cíclico.");

    const dataExcel = productosABC.map(prod => ({
        "Prioridad ABC": prod.claseABC,
        "Ranking": prod.rankingABC,
        "Frecuencia Sugerida": prod.frecuenciaConteo,
        "Planta / Bodega": prod.ubi.idBodega || prod.ubi.bId,
        "Descripción Bodega": prod.ubi.descBodega || prod.ubi.bDesc,
        "Código / SKU": prod.sku || 'N/A',
        "Descripción": prod.nombre_producto || 'Sin Nombre',
        "Ubicación": prod.ubi.rack,
        "Conteo Físico": "",
        "Observación": ""
    }));

    await exportarExcelConLogo({
        dataExcel,
        sheetName: "Inventario Ciclico ABC",
        title: "HOJA DE CONTEO CIEGO - INVENTARIO CÍCLICO ABC",
        subtitle: `SINCOT - ZB Soluciones SAS | Generado: ${new Date().toLocaleString('es-ES')}`,
        footerRows: [
            [],
            ["Responsable del conteo:", "", "Firma:", "", "Fecha:"]
        ],
        fileName: `Stock_Inventario_Ciclico_ABC_${new Date().getTime()}.xlsx`
    });
};

export const exportarInventarioCiclicoABCPDF = (productos) => {
    const productosABC = productos.some(prod => prod.claseABC && prod.rankingABC) ? productos : clasificarInventarioABC(productos);
    if (productosABC.length === 0) return alert("⚠️ No hay productos con stock para inventario cíclico.");

    const doc = new jsPDF({ orientation: 'landscape' });
    const fechaActual = new Date().toLocaleString('es-ES');
    agregarLogoPDF(doc, { x: 14, y: 6, width: 30, height: 20 });

    doc.setFontSize(18);
    doc.setTextColor(52, 168, 83);
    doc.text("HOJA DE CONTEO CIEGO - INVENTARIO CÍCLICO ABC", 148, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`SINCOT | Generado: ${fechaActual} | Prioridad: A alta, B media, C baja`, 148, 22, { align: 'center' });

    autoTable(doc, {
        startY: 30,
        head: [["ABC", "Rank", "SKU", "Producto", "Bodega", "Ubicación", "Conteo Físico", "Observación"]],
        body: productosABC.map(prod => [
            prod.claseABC,
            prod.rankingABC,
            prod.sku || 'N/A',
            prod.nombre_producto || 'Sin Nombre',
            prod.ubi.idBodega || prod.ubi.bId,
            prod.ubi.rack,
            "",
            ""
        ]),
        theme: 'grid',
        headStyles: { fillColor: [52, 168, 83], textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 0: { halign: 'center', fontStyle: 'bold' }, 1: { halign: 'center' }, 6: { halign: 'center' } }
    });

    const finalY = doc.lastAutoTable?.finalY || 185;
    const firmaY = Math.min(finalY + 18, 195);
    doc.setFontSize(10);
    doc.setTextColor(32, 33, 36);
    doc.text("Responsable del conteo:", 20, firmaY);
    doc.line(62, firmaY, 122, firmaY);
    doc.text("Firma:", 158, firmaY);
    doc.line(172, firmaY, 240, firmaY);

    doc.save(`Stock_Inventario_Ciclico_ABC_${new Date().getTime()}.pdf`);
};
