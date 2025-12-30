const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');
const net = require('net');
const { DEFAULT_CONFIG } = require('./config');

class PrinterService {
    constructor(config) {
        this.ip = config.ip;
        this.port = config.port;
        this.paperWidth = config.paperWidth || 48;
    }

    async printTicket(config = {}, sections = []) {
        const currentIp = config.ip || this.ip;
        const currentPort = config.port || this.port;

        // Inicializar impresora (generador de buffer)
        const printer = new ThermalPrinter({
            type: PrinterTypes.EPSON, // Xprinter suele ser compatible con Epson ESC/POS
            interface: `tcp://${currentIp}:${currentPort}`, // Solo informativo en este modo driver, no se usa para conectar directo en este pattern usualmente si usamos net
            characterSet: CharacterSet.PC858_EURO, // Changed to PC858_EURO for Euro symbol and Spanish accents
            removeSpecialCharacters: false,
            options: {
                timeout: 5000
            }
        });

        const font = config.font || DEFAULT_CONFIG.font || 'a';

        try {
            // --- INICIALIZACIÓN ---
            // 1. Resetear
            // 2. Configurar fuente (default: 'a' o 'b')
            // 3. Alineación Izquierda
            // 4. Tamaño NORMAL

            // Nota: node-thermal-printer gestiona el estado interno
            // printer.clear();

            // Configurar fuente inicial (A o B)
            // La librería node-thermal-printer maneja fuentes con 'setTextFont(0/1)' usualmente para A/B
            // A = 0, B = 1
            // if (font === 'b') {
            //     try { printer.setTextFont(1); } catch (e) {}
            // } else {
            //     try { printer.setTextFont(0); } catch (e) {}
            // }

            printer.alignLeft();
            printer.setTextNormal(); // Reset styles & size

            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                // Usar el ancho configurado o el default calculado en constructor. Prioridad: config > constructor
                const jobPaperWidth = config.paperWidth || this.paperWidth || (font === 'b' ? 64 : 42);

                await this._printSection(printer, section, font, jobPaperWidth);

                // Lógica de espaciado inteligente
                const nextSection = sections[i + 1];
                if (nextSection && section.type !== 'space' && nextSection.type !== 'space') {
                    printer.newLine();
                }
            }

            // Corte y finalización
            printer.cut();

            // Obtener el buffer
            const buffer = printer.getBuffer();

            if (config.dryRun) {
                console.log('Dry run: Printer buffer generated, length:', buffer.length);
                // En dry run retornamos éxito
                return { success: true, message: 'Dry run successful', bufferSize: buffer.length };
            }

            // Enviar buffer a la impresora via socket TCP
            return await this._sendToPrinter(currentIp, currentPort, buffer);

        } catch (err) {
            console.error('Error generating print data:', err);
            throw err;
        }
    }

    async _sendToPrinter(ip, port, buffer) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            let success = false;

            socket.setTimeout(5000);

            socket.on('connect', () => {
                socket.write(buffer, () => {
                    success = true;
                    socket.end(); // Cerrar conexión tras enviar
                });
            });

            socket.on('data', (data) => {
                // Algunas impresoras responden, otras no.
            });

            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Printer connection timeout'));
            });

            socket.on('error', (err) => {
                reject(err);
            });

            socket.on('close', () => {
                if (success) {
                    resolve({ success: true, message: 'Printed successfully' });
                } else {
                    // Si se cierra sin éxito y sin error explícito anterior (raro si no es timeout/error)
                    // Podríamos considerar reject si no se escribió nada
                }
            });

            socket.connect(port, ip);
        });
    }

    async _printSection(printer, section, font = 'a', paperWidth = 48) {
        if (!section.type) return;

        // Resetear estilos básicos antes de cada sección
        printer.setTextNormal();
        // if (font === 'b') {
        //    try { printer.setTextFont(1); } catch (e) {}
        // } else {
        //    try { printer.setTextFont(0); } catch (e) {}
        // }
        printer.alignLeft(); // Default align

        switch (section.type) {
            case 'text':
                const textValue = section.value || section.text || '';

                if (section.align) {
                    if (section.align === 'ct' || section.align === 'center') printer.alignCenter();
                    else if (section.align === 'rt' || section.align === 'right') printer.alignRight();
                    else printer.alignLeft();
                }

                if (section.style) {
                    if (section.style.includes('b')) printer.bold(true);
                    // node-thermal-printer soporta: bold, underline, invert, etc.
                }

                if (section.size) {
                    // size suele ser [width, height], rango 1-8 en escpos-network
                    // node-thermal-printer usa setTextSize(width, height)
                    printer.setTextSize(section.size[0], section.size[1]);
                }

                printer.println(textValue);
                break;

            case 'products':
                if (section.rows && Array.isArray(section.rows)) {
                    section.rows.forEach(row => {
                        const count = row.count || 0;
                        const description = row.description || '';
                        const amountVal = typeof row.amount === 'number' ? row.amount : 0;
                        const amountStr = amountVal.toFixed(2) + '€';

                        const qtyWidth = 2;
                        const gapWidth = 2;
                        const priceWidth = 8; // Increased from 6 to 8 to fit larger numbers
                        const rightGapWidth = 1; // Explicit gap between desc and price

                        // Calculate available width for description
                        // Total = qty + gap + desc + rightGap + price
                        const descWidth = Math.max(0, paperWidth - qtyWidth - gapWidth - priceWidth - rightGapWidth);

                        const qtyStr = String(count).substring(0, qtyWidth).padEnd(qtyWidth, ' ');
                        const gapStr = ' '.repeat(gapWidth);
                        const rightGapStr = ' '.repeat(rightGapWidth);

                        let priceFinal = amountStr.padStart(priceWidth, ' ');
                        if (priceFinal.length > priceWidth) {
                            priceFinal = priceFinal.substring(priceFinal.length - priceWidth);
                        }

                        const descStr = description.substring(0, descWidth).padEnd(descWidth, ' ');

                        const line = `${qtyStr}${gapStr}${descStr}${rightGapStr}${priceFinal}`;
                        printer.println(line);
                    });
                }
                break;

            case 'table':
                if (section.rows && Array.isArray(section.rows)) {
                    // node-thermal-printer tiene .tableCustom(data)
                    // data = [ { text: "...", align: "LEFT", width: 0.5 }, ... ]

                    section.rows.forEach(row => {
                        if (Array.isArray(row) && row.length === 2) {
                            printer.tableCustom([
                                { text: row[0], align: "LEFT", width: 0.70 },
                                { text: row[1], align: "RIGHT", width: 0.30 }
                            ]);
                        }
                    });
                }
                break;

            case 'barcode':
                if (section.code) {
                    const providedType = section.barcodeType || 'EAN13';
                    const width = section.width || 2;
                    const height = section.height || 80;

                    let codeType = 67; // Default EAN13
                    if (providedType === 'EAN13') codeType = 67;
                    else if (providedType === 'CODE128') codeType = 73;
                    // Add more mappings if needed based on PrinterTypes

                    printer.alignCenter();
                    printer.printBarcode(section.code, codeType, {
                        hriPos: 2, // Below
                        height: height,
                        width: width
                    });

                    printer.alignLeft();
                }
                break;

            case 'space':
                if (section.lines) {
                    for (let k = 0; k < section.lines; k++) printer.newLine();
                }
                break;
        }
    }
}

module.exports = PrinterService;