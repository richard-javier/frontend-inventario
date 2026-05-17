import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarOrdenCompraPDF = (producto, mesProyectado, cantidadEstimada) => {
    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleDateString('es-EC');
    
    // Cálculo de stock de seguridad (15% extra)
    const cantidadSugerida = Math.ceil(cantidadEstimada * 1.15); 
    const precioEstimado = producto.precio_ref || producto.precio || 0;
    const totalEstimado = cantidadSugerida * precioEstimado;

    // Encabezado al estilo de tu Nota de Ingreso
    doc.setFontSize(22);
    doc.setTextColor(26, 115, 232);
    doc.setFont(undefined, 'bold');
    doc.text("ZB SOLUCIONES SAS", 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(32, 33, 36);
    doc.text("ORDEN DE COMPRA SUGERIDA", 105, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');
    doc.text("Generado automáticamente por Motor Predictivo IA SINCOT", 105, 34, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(14, 38, 196, 38);

    // Información de la Alerta
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text("ALERTA DE SISTEMA:", 14, 48);
    doc.setFont(undefined, 'normal');
    doc.text(`Fecha de Emisión: ${fechaActual}`, 14, 55);
    doc.text(`Estado: CRÍTICO (Stock físico actual: ${producto.stock_actual} uds)`, 14, 61);
    doc.text(`Motivo: Proyección de demanda para el mes ${mesProyectado}.`, 14, 67);

    // Tabla usando la estructura exacta de tu código funcional
    const columns = ["SKU", "Descripción del Producto", "Cant. Sugerida", "Precio Ref.", "Subtotal"];
    const rows = [
        [
            producto.sku, 
            producto.nombre_producto || 'N/A', 
            `${cantidadSugerida} Uds.`, 
            `$${parseFloat(precioEstimado).toFixed(2)}`, 
            `$${totalEstimado.toFixed(2)}`
        ]
    ];

    autoTable(doc, {
        startY: 75,
        head: [columns],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [26, 115, 232], textColor: 255, halign: 'center' },
        columnStyles: {
            0: { halign: 'center' },
            2: { halign: 'center', fontStyle: 'bold' },
            3: { halign: 'center' },
            4: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // Totales y Pie de página
    const finalY = doc.lastAutoTable.finalY || 75;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`INVERSIÓN ESTIMADA: $${totalEstimado.toFixed(2)}`, 190, finalY + 15, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont(undefined, 'normal');
    doc.text(`Impreso desde SINCOT • Motor IA • Fecha y Hora: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

    doc.save(`Orden_Compra_IA_${producto.sku}.pdf`);
};