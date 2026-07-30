import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { agregarLogoPDF } from './reportAssets';

export const generarOrdenCompraPDF = (producto, mesProyectado, cantidadEstimada, motorUtilizado = 'Motor Predictivo IA', metricasEvaluacion = null) => {
    const doc = new jsPDF();
    const fecha = new Date();
    const fechaActual = fecha.toLocaleDateString('es-EC');
    const folio = `IA-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}-${producto.sku || 'DOC'}`;
    
    // Cálculo de stock de seguridad (15% extra)
    const cantidadSugerida = Math.ceil(cantidadEstimada * 1.15); 
    const precioEstimado = Number(producto.precio_ref || producto.precio || 0);
    const totalEstimado = cantidadSugerida * precioEstimado;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    const blue = [26, 115, 232];
    const green = [19, 115, 51];
    const dark = [32, 33, 36];
    const muted = [95, 99, 104];
    const border = [224, 229, 235];
    const lightBlue = [232, 240, 254];
    const lightGreen = [230, 244, 234];
    const lightGray = [248, 249, 250];

    doc.setFillColor(...blue);
    doc.rect(0, 0, pageWidth, 8, 'F');
    agregarLogoPDF(doc, { x: margin, y: 15, width: 32, height: 22 });

    doc.setFontSize(18);
    doc.setTextColor(...blue);
    doc.setFont(undefined, 'bold');
    doc.text("ORDEN DE COMPRA SUGERIDA", pageWidth - margin, 22, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.setFont(undefined, 'normal');
    doc.text("Generado automáticamente por Motor Predictivo IA SINCOT", pageWidth - margin, 30, { align: 'right' });
    doc.text(`Folio: ${folio}`, pageWidth - margin, 36, { align: 'right' });
    
    doc.setDrawColor(...border);
    doc.line(margin, 45, pageWidth - margin, 45);

    doc.setFillColor(...lightBlue);
    doc.roundedRect(margin, 54, contentWidth, 34, 3, 3, 'F');
    doc.setTextColor(...blue);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text("Alerta predictiva de abastecimiento", margin + 6, 65);
    doc.setTextColor(...dark);
    doc.setFontSize(13);
    doc.text(producto.nombre_producto || 'Producto sin nombre', margin + 6, 74, { maxWidth: contentWidth - 12 });
    doc.setTextColor(...muted);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`SKU: ${producto.sku || 'N/A'}  |  Fecha de emisión: ${fechaActual}`, margin + 6, 83);

    const metricY = 98;
    const gap = 6;
    const cardWidth = (contentWidth - (gap * 2)) / 3;
    const drawMetric = (x, title, value, fillColor, valueColor = dark) => {
        doc.setFillColor(...fillColor);
        doc.setDrawColor(...border);
        doc.roundedRect(x, metricY, cardWidth, 30, 3, 3, 'FD');
        doc.setTextColor(...muted);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text(title, x + 5, metricY + 9);
        doc.setTextColor(...valueColor);
        doc.setFontSize(14);
        doc.text(String(value), x + 5, metricY + 22);
    };

    drawMetric(margin, "Demanda IA", `${cantidadEstimada} uds`, lightBlue, blue);
    drawMetric(margin + cardWidth + gap, "Compra sugerida", `${cantidadSugerida} uds`, lightGreen, green);
    drawMetric(margin + (cardWidth + gap) * 2, "Inversión estimada", `$${totalEstimado.toFixed(2)}`, lightGray);

    doc.setFillColor(...lightGray);
    doc.setDrawColor(...border);
    doc.roundedRect(margin, 138, contentWidth, 24, 3, 3, 'FD');
    doc.setTextColor(...dark);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text("Contexto del pronóstico", margin + 5, 147);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...muted);
    const resumenMetricas = metricasEvaluacion
        ? `MAE: ${metricasEvaluacion.mae} uds | RMSE: ${metricasEvaluacion.rmse} | R²: ${metricasEvaluacion.r2}`
        : 'Métricas de evaluación: N/D';
    doc.text(`Motor: ${motorUtilizado || 'Motor Predictivo IA'} | Mes: ${mesProyectado} | ${resumenMetricas}`, margin + 5, 156, { maxWidth: contentWidth - 10 });

    const columns = ["SKU", "Descripción del producto", "Stock actual", "Cant. sugerida", "Precio ref.", "Subtotal"];
    const rows = [
        [
            producto.sku || 'N/A', 
            producto.nombre_producto || 'N/A', 
            `${producto.stock_actual || 0} uds`,
            `${cantidadSugerida} Uds.`, 
            `$${precioEstimado.toFixed(2)}`, 
            `$${totalEstimado.toFixed(2)}`
        ]
    ];

    autoTable(doc, {
        startY: 174,
        head: [columns],
        body: rows,
        theme: 'plain',
        styles: {
            fontSize: 8.5,
            cellPadding: 3,
            lineColor: border,
            lineWidth: 0.2,
            textColor: dark
        },
        headStyles: {
            fillColor: blue,
            textColor: [255, 255, 255],
            halign: 'center',
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 28 },
            1: { cellWidth: 58 },
            2: { halign: 'center', cellWidth: 24 },
            3: { halign: 'center' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: { fillColor: [251, 252, 254] },
        margin: { left: margin, right: margin }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setDrawColor(...border);
    doc.roundedRect(margin, finalY, contentWidth, 28, 3, 3, 'S');
    doc.setTextColor(...muted);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("Criterio de recomendación", margin + 5, finalY + 9);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.text(`La compra sugerida considera la demanda proyectada para ${mesProyectado} más un 15% de stock de seguridad para reducir quiebres de inventario.`, margin + 5, finalY + 18, { maxWidth: contentWidth - 10 });

    doc.setFillColor(...green);
    doc.roundedRect(pageWidth - margin - 68, finalY + 38, 68, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL: $${totalEstimado.toFixed(2)}`, pageWidth - margin - 5, finalY + 48, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.setFont(undefined, 'normal');
    doc.text(`Impreso desde SINCOT | Motor IA | Fecha y hora: ${fecha.toLocaleString()}`, pageWidth / 2, 285, { align: 'center' });

    doc.save(`Orden_Compra_IA_${producto.sku || 'Doc'}.pdf`);
};
