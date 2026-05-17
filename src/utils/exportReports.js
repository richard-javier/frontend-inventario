import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------
// 1. REPORTES DE STOCK GENERAL (Cantidades Físicas)
// ---------------------------------------------------------
export const exportarInventarioPDF = (productos) => {
    const productosConStock = productos.filter(p => Number(p.stock_actual) > 0);
    if (productosConStock.length === 0) return alert("⚠️ No hay productos con stock físico.");

    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleString('es-ES');

    doc.setFontSize(18);
    doc.setTextColor(26, 115, 232);
    doc.text("REPORTE DE STOCK GENERAL", 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`SINCOT - ZB Soluciones SAS | Generado: ${fechaActual}`, 105, 22, { align: 'center' });
    doc.text(`Total de Ítems con existencia: ${productosConStock.length}`, 105, 28, { align: 'center' });

    const columns = ["SKU", "Equipo", "Categoría", "Stock", "Precio Ref.", "Estado"];
    const rows = productosConStock.map(prod => [
        prod.sku || 'N/A', prod.nombre_producto || 'Sin Nombre', prod.tipo_producto || 'General',
        prod.stock_actual || '0', `$${prod.precio || '0.00'}`, prod.status_equipo === 'Descontinuado' ? 'INACTIVO' : 'ACTIVO'
    ]);

    autoTable(doc, { startY: 35, head: [columns], body: rows, theme: 'grid', headStyles: { fillColor: [26, 115, 232], textColor: 255 }, styles: { fontSize: 8 } });
    doc.save(`Reporte_Stock_General_${new Date().getTime()}.pdf`);
};

export const exportarInventarioExcel = (productos) => {
    const productosConStock = productos.filter(p => Number(p.stock_actual) > 0);
    if (productosConStock.length === 0) return alert("⚠️ No hay productos con stock físico.");

    const dataExcel = productosConStock.map(prod => ({
        "SKU": prod.sku || 'N/A', "Part Number": prod.part_number || 'N/A',
        "Equipo": prod.nombre_producto || 'Sin Nombre', "Categoría": prod.tipo_producto || 'General',
        "Stock Físico": Number(prod.stock_actual) || 0, "Precio Referencial": Number(prod.precio) || 0,
        "Estado": prod.status_equipo === 'Descontinuado' ? 'INACTIVO' : 'ACTIVO'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock General");
    XLSX.writeFile(workbook, `Reporte_Stock_General_${new Date().getTime()}.xlsx`);
};

// ---------------------------------------------------------
// 2. REPORTES DE STOCK VALORADO (Financiero)
// ---------------------------------------------------------
export const exportarStockValoradoPDF = (productos) => {
    const productosConStock = productos.filter(p => Number(p.stock_actual) > 0);
    if (productosConStock.length === 0) return alert("⚠️ No hay productos con stock para valorar.");

    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleString('es-ES');

    // Cálculo del Gran Total
    const granTotal = productosConStock.reduce((sum, p) => sum + (Number(p.stock_actual) * Number(p.precio || 0)), 0);

    doc.setFontSize(18);
    doc.setTextColor(52, 168, 83); // Verde financiero
    doc.text("REPORTE DE STOCK VALORADO", 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`SINCOT - ZB Soluciones SAS | Generado: ${fechaActual}`, 105, 22, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(32, 33, 36);
    doc.text(`GRAN TOTAL INVERTIDO: $${granTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 105, 30, { align: 'center' });

    const columns = ["SKU", "Equipo", "Stock Físico", "Costo Unit.", "Valor Total"];
    const rows = productosConStock.map(prod => {
        const stock = Number(prod.stock_actual) || 0;
        const precio = Number(prod.precio) || 0;
        const total = stock * precio;
        return [
            prod.sku || 'N/A', 
            prod.nombre_producto || 'Sin Nombre', 
            stock.toString(), 
            `$${precio.toFixed(2)}`, 
            `$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
        ];
    });

    autoTable(doc, { 
        startY: 38, head: [columns], body: rows, theme: 'grid', 
        headStyles: { fillColor: [52, 168, 83], textColor: 255 }, 
        styles: { fontSize: 8 },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } } // Alinea la plata a la derecha
    });

    doc.save(`Reporte_Stock_Valorado_${new Date().getTime()}.pdf`);
};

export const exportarStockValoradoExcel = (productos) => {
    const productosConStock = productos.filter(p => Number(p.stock_actual) > 0);
    if (productosConStock.length === 0) return alert("⚠️ No hay productos con stock para valorar.");

    const dataExcel = productosConStock.map(prod => {
        const stock = Number(prod.stock_actual) || 0;
        const precio = Number(prod.precio) || 0;
        return {
            "SKU": prod.sku || 'N/A',
            "Equipo": prod.nombre_producto || 'Sin Nombre',
            "Marca": prod.marca || 'N/A',
            "Stock Físico": stock,
            "Costo Unitario ($)": precio,
            "Valor Total ($)": stock * precio
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Valorado");
    XLSX.writeFile(workbook, `Reporte_Stock_Valorado_${new Date().getTime()}.xlsx`);
};

// ---------------------------------------------------------
// 3. ORDEN DE REPOSICIÓN
// ---------------------------------------------------------
export const generarPDFReposicion = (producto, cantidadReponer) => {
    if(!producto) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(234, 67, 53);
    doc.text("ORDEN DE REPOSICIÓN DE STOCK", 105, 20, { align: 'center' });
    
    const columns = ["Atributo", "Detalle Técnico"];
    const rows = [
      ["SKU Interno", producto.sku || 'N/A'],
      ["Equipo", producto.nombre_producto || 'Sin Nombre'],
      ["Stock Actual", producto.stock_actual || '0'],
      ["CANTIDAD SOLICITADA", cantidadReponer.toString()],
      ["COSTO ESTIMADO", `$${(Number(cantidadReponer) * Number(producto.precio || 0)).toFixed(2)}`]
    ];
    
    autoTable(doc, { startY: 35, head: [columns], body: rows, theme: 'grid', headStyles: { fillColor: [234, 67, 53] } });
    doc.save(`Orden_Reposicion_${producto.sku || 'Doc'}.pdf`);
};