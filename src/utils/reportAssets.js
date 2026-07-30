import logoEmpresa from '../assets/Logo.jpeg?inline';

export const agregarLogoPDF = (doc, { x = 14, y = 8, width = 26, height = 18 } = {}) => {
    try {
        doc.addImage(logoEmpresa, 'JPEG', x, y, width, height);
    } catch (error) {
        console.warn('No se pudo agregar el logo al PDF:', error);
    }
};

export const agregarLogoExcel = (workbook, worksheet) => {
    try {
        const imageId = workbook.addImage({
            base64: logoEmpresa,
            extension: 'jpeg'
        });

        worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 118, height: 58 }
        });
        worksheet.getRow(1).height = 34;
        worksheet.getRow(2).height = 24;
    } catch (error) {
        console.warn('No se pudo agregar el logo al Excel:', error);
    }
};

export const descargarWorkbookExcel = async (workbook, fileName) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
};
