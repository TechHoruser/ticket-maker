const escpos = require('escpos');
escpos.Network = require('escpos-network');
const { DEFAULT_CONFIG } = require('./config');

class PrinterService {
    constructor(config) {
        this.ip = config.ip;
        this.port = config.port;
        // Para 80mm el ancho estándar es 48 caracteres (Fuente A) o 64 (Fuente B)
        // Fuente A (12x24): 48 columnas
        // Fuente B (9x17): 64 columnas
        const font = config.font || DEFAULT_CONFIG.font || 'a';
        this.paperWidth = config.paperWidth || (font === 'b' ? 64 : 48);
    }

    async printTicket(config = {}, sections = []) {
        const currentIp = config.ip || this.ip;
        const currentPort = config.port || this.port;

        const device = new escpos.Network(currentIp, currentPort);
        const options = { encoding: "GB18030", ...config };
        const printer = new escpos.Printer(device, options);

        return new Promise((resolve, reject) => {
            device.open(async (error) => {
                if (error) return reject(error);

                try {
                    // --- INICIALIZACIÓN CRÍTICA ---
                    // 1. Resetear hardware
                    // 2. Configurar fuente (default: 'a' o 'b')
                    // 3. Alineación Izquierda
                    // 4. Tamaño NORMAL (1,1) -> Esto arregla la "fuente gigante"
                    const font = config.font || DEFAULT_CONFIG.font || 'a';
                    printer
                        .font(font)
                        .align('lt')
                        .style('normal')
                        .size(1, 1); // width 1, height 1 (tamaño estándar)

                    for (let i = 0; i < sections.length; i++) {
                        const section = sections[i];
                        // Pasar la fuente y el ancho calculado actual para evitar inconsistencias
                        // Si style('normal') resetea la fuente, necesitamos saber cuál volver a aplicar.
                        const jobPaperWidth = config.paperWidth || (font === 'b' ? 64 : 48);

                        await this._printSection(printer, section, font, jobPaperWidth);

                        // Lógica de espaciado inteligente:
                        // Si la sección actual NO es 'space' Y la siguiente tampoco es 'space',
                        // agregamos un espacio por defecto de 1 línea.
                        // Esto permite juntar secciones usando space:0 explícito,
                        // o dejar el espacio por defecto si no se especifica nada.
                        const nextSection = sections[i + 1];
                        if (nextSection && section.type !== 'space' && nextSection.type !== 'space') {
                            printer.feed(1);
                        }
                    }

                    // Corte y cierre
                    printer.cut();
                    printer.close(() => resolve({ success: true, message: 'Printed successfully' }));
                } catch (err) {
                    try { printer.close(); } catch (e) { }
                    reject(err);
                }
            });
        });
    }

    async _printSection(printer, section, font = 'a', paperWidth = 48) {
        if (!section.type) return;

        // Resetear estilos básicos antes de cada sección para evitar herencias no deseadas
        // NOTA: No reseteamos 'align' aquí para permitir que la sección controle su alineación
        printer.size(1, 1);
        printer.style('normal');
        // style('normal') puede resetear la fuente a 'a' (default). Re-aplicamos la fuente configurada.
        printer.font(font);

        switch (section.type) {
            case 'text':
                const textValue = section.value || section.text || '';

                // Aplicar alineación si existe
                if (section.align) printer.align(section.align);

                if (section.style) printer.style(section.style);
                // Si la sección pide un tamaño específico (ej: título grande)
                if (section.size) printer.size(section.size[0], section.size[1]);
                printer.text(textValue);

                // Restaurar alineación a izquierda por seguridad
                printer.align('lt');
                break;

            case 'products':
                if (section.rows && Array.isArray(section.rows)) {
                    section.rows.forEach(row => {
                        const count = row.count || 0;
                        const description = row.description || '';
                        // Asegurar formato de moneda: 2 decimales + símbolo €
                        const amountVal = typeof row.amount === 'number' ? row.amount : 0;
                        const amountStr = amountVal.toFixed(2) + '€';

                        // Definición de anchos fijos según requerimiento
                        const qtyWidth = 2;
                        const gapWidth = 2;  // "2 caracteres de espacio"
                        const priceWidth = 6;

                        // Calculamos el espacio restante para la descripción
                        // paperWidth - qty - gap - price
                        // Usamos el width pasado explícitamente
                        // Restamos 1 extra por seguridad anti-wrapping
                        const descWidth = Math.max(0, paperWidth - qtyWidth - gapWidth - priceWidth - 1);

                        // Formateo de cadenas
                        // 1. Cantidad: 2 caracteres
                        const qtyStr = String(count).substring(0, qtyWidth).padEnd(qtyWidth, ' ');

                        // 2. Espacio: 2 caracteres
                        const gapStr = ' '.repeat(gapWidth);

                        // 3. Precio: 6 caracteres, alineado a la derecha
                        // Si excede 6, tomamos los últimos 6 o los primeros? 
                        // Generalmente para precios queremos ver la parte entera, pero si es muy grande romperá formato.
                        // Usaremos slice(-6) para mantener alineación derecha estricta si es necesario, 
                        // o simplemente padStart y dejar que empuje si es demasiado largo (pero eso desalinea).
                        // El requerimiento dice: "6 caracteres para el precio (alineado esto último a la derecha del todo)"
                        // Asumiremos que cabe, usamos padStart(6).
                        let priceFinal = amountStr.padStart(priceWidth, ' ');
                        if (priceFinal.length > priceWidth) {
                            // Si es muy largo, recortamos para no romper la línea
                            priceFinal = priceFinal.substring(priceFinal.length - priceWidth);
                        }

                        // 4. Descripción: Rellena el resto
                        const descStr = description.substring(0, descWidth).padEnd(descWidth, ' ');

                        // Construcción de la línea completa
                        const line = `${qtyStr}${gapStr}${descStr}${priceFinal}`;

                        printer.text(line);
                    });
                }
                break;

            case 'table':
                // Para ticket de 80mm, usamos tableCustom para forzar los anchos.
                // rows: [ ["Item 1", "$10.00"], ... ]
                if (section.rows && Array.isArray(section.rows)) {
                    section.rows.forEach(row => {
                        if (Array.isArray(row) && row.length === 2) {
                            // width: 0.75 + 0.25 = 1.0 (100% del ancho)
                            // Alineamos precio a la derecha (RIGHT)
                            printer.tableCustom([
                                { text: row[0], align: 'LEFT', width: 0.70 },
                                { text: row[1], align: 'RIGHT', width: 0.30 }
                            ]);
                        }
                    });
                }
                break;

            case 'barcode':
                if (section.code) {
                    // 1. Centramos
                    printer.align('ct');

                    const type = section.barcodeType || 'EAN13';
                    const width = section.width || 2;   // Ancho de barras
                    const height = section.height || 80; // Altura de barras

                    printer.barcode(section.code, type, { width, height });

                    // 2. Restauramos alineación
                    printer.align('lt');
                }
                break;

            case 'space':
                if (section.lines) printer.feed(section.lines);
                break;
        }
    }
}

module.exports = PrinterService;