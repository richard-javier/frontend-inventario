import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// 1. EXPORTAR CATÁLOGO GENERAL A PDF
export const exportarInventarioPDF = (productos) => {
    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleString('es-ES');

    doc.setFontSize(18);
    doc.setTextColor(26, 115, 232);
    doc.text("REPORTE GENERAL DE STOCK", 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`SINCOT - ZB Soluciones SAS | Generado: ${fechaActual}`, 105, 22, { align: 'center' });

    const columns = ["SKU / Identificador", "Equipo", "Categoría", "Stock", "Precio Ref.", "Estado"];
    const rows = productos.map(prod => [
        prod.sku || 'N/A',
        prod.nombre_producto || 'Sin Nombre',
        prod.tipo_producto || 'General',
        prod.stock_actual || '0',
        `$${prod.precio || '0.00'}`,
        prod.status_equipo === 'Descontinuado' ? 'INACTIVO' : 'ACTIVO'
    ]);

    autoTable(doc, {
        startY: 30,
        head: [columns],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [26, 115, 232], textColor: 255 },
        styles: { fontSize: 8 }
    });

    doc.save(`Reporte_Stock_General_${new Date().getTime()}.pdf`);
};

// 2. EXPORTAR CATÁLOGO GENERAL A EXCEL
export const exportarInventarioExcel = (productos) => {
    // Transformamos los datos a un formato limpio para Excel
    const dataExcel = productos.map(prod => ({
        "Identificador (SKU)": prod.sku || 'N/A',
        "Part Number (PN)": prod.part_number || 'N/A',
        "Nombre del Equipo": prod.nombre_producto || 'Sin Nombre',
        "Categoría": prod.tipo_producto || 'General',
        "Marca": prod.marca || 'N/A',
        "Stock Físico": Number(prod.stock_actual) || 0,
        "Precio Referencial": Number(prod.precio) || 0,
        "Costo Total Valorado": (Number(prod.stock_actual) || 0) * (Number(prod.precio) || 0),
        "Estado": prod.status_equipo === 'Descontinuado' ? 'INACTIVO' : 'ACTIVO'
    }));

    // Creamos el libro y la hoja de Excel
    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock General");

    // Descargamos el archivo
    XLSX.writeFile(workbook, `Reporte_Inventario_${new Date().getTime()}.xlsx`);
};

// 3. GENERAR PDF DE ORDEN DE REPOSICIÓN
export const generarPDFReposicion = (producto, cantidadReponer) => {
    if(!producto) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(26, 115, 232);
    doc.text("ORDEN DE REPOSICIÓN DE STOCK", 105, 20, { align: 'center' });
    
    const columns = ["Atributo", "Detalle Técnico"];
    const rows = [
      ["SKU Interno", producto.sku || 'N/A'],
      ["Part Number", producto.part_number || 'N/A'],
      ["Equipo", producto.nombre_producto || 'Sin Nombre'],
      ["Precio Ref.", `$${producto.precio || '0.00'}`],
      ["Stock Actual", producto.stock_actual || '0'],
      ["CANTIDAD SOLICITADA", cantidadReponer.toString()],
      ["COSTO ESTIMADO", `$${(Number(cantidadReponer) * Number(producto.precio || 0)).toFixed(2)}`]
    ];
    
    autoTable(doc, { startY: 45, head: [columns], body: rows, theme: 'grid', headStyles: { fillColor: [26, 115, 232] } });
    doc.save(`Orden_Reposicion_${producto.sku || 'Doc'}.pdf`);
};