import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarNotaIngresoPDF = (nota, productosRows) => {
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFontSize(22);
    doc.setTextColor(26, 115, 232);
    doc.setFont(undefined, 'bold');
    doc.text("NOTA DE INGRESO A BODEGA", 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');
    doc.text("SINCOT - ZB Soluciones SAS", 105, 26, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(234, 67, 53);
    doc.setFont(undefined, 'bold');
    doc.text(`Nº ${nota.secuencial}`, 190, 20, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);

    // Información General
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    
    doc.text(`Fecha: ${nota.fecha}`, 14, 42);
    doc.text(`Hora: ${nota.hora}`, 65, 42);
    doc.text(`Proveedor: ${nota.proveedor || 'No especificado'}`, 14, 50);
    doc.text(`Orden de Compra: ${nota.ordenCompra || 'N/A'}`, 14, 58);
    
    doc.text(`Proviene de: ${nota.provieneDe}`, 110, 42);
    doc.text(`Placa Vehículo: ${nota.placaVehiculo || 'N/A'}`, 110, 50);
    doc.text(`Estado Mercadería: ${nota.estadoMercaderia}`, 110, 58);
    doc.text(`Tipo Inspección: ${nota.aforo}`, 110, 66);

    // Tabla
    const columns = ["Pérdida", "Recibida", "Pendiente", "Descripción del Equipo", "Guía / Secuencial"];
    const rows = productosRows.map(p => [ p.perdida, p.recibida, p.pendiente, p.descripcion || 'Sin descripción', p.guia ]);

    autoTable(doc, {
        startY: 75,
        head: [columns],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [26, 115, 232], textColor: 255, halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'left' },
            4: { halign: 'center', cellWidth: 30 }
        }
    });

    // Observaciones
    const finalY = doc.lastAutoTable.finalY || 75;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("Observaciones:", 14, finalY + 12);
    doc.setFont(undefined, 'normal');
    doc.text(nota.observaciones || "Sin observaciones registradas.", 14, finalY + 18, { maxWidth: 180 });

    // Firmas
    const firmaY = finalY + 55;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    
    doc.line(30, firmaY, 90, firmaY);
    doc.setFont(undefined, 'bold');
    doc.text("Entregado por:", 60, firmaY + 5, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.text(nota.entregadoPor.nombre || "______________________", 60, firmaY + 11, { align: 'center' });
    doc.text(nota.entregadoPor.cargo || "", 60, firmaY + 16, { align: 'center' });

    doc.line(120, firmaY, 180, firmaY);
    doc.setFont(undefined, 'bold');
    doc.text("Recibido por:", 150, firmaY + 5, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.text(nota.recibidoPor.nombre || "______________________", 150, firmaY + 11, { align: 'center' });
    doc.text(nota.recibidoPor.cargo || "", 150, firmaY + 16, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Impreso desde SINCOT • Usuario Autorizado • Fecha y Hora: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

    doc.save(`Nota_Ingreso_Bodega_${nota.secuencial}.pdf`);
};