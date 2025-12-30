const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const net = require('net');

const TARGET_IP = process.env.PRINTER_IP;
const TARGET_PORT = process.env.PRINTER_PORT;

const PRINTER_CONFIG = {
    type: PrinterTypes.EPSON,
    interface: `tcp://${TARGET_IP}:${TARGET_PORT}`,
    width: 48,
    characterSet: 'PC858_EURO',
    removeSpecialCharacters: false,
    options: {
        timeout: 5000
    }
};

class PrinterService {
    constructor() {
        // No config argument needed anymore
    }

    async printTicket(sections = []) {
        // Initialize printer (buffer generator)
        const printer = new ThermalPrinter(PRINTER_CONFIG);

        try {
            printer.alignLeft();
            printer.setTextNormal();

            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                const jobPaperWidth = PRINTER_CONFIG.width;

                await this._printSection(printer, section, jobPaperWidth);
            }

            printer.cut();
            printer.beep();

            const buffer = printer.getBuffer();

            return await this._sendToPrinter(TARGET_IP, TARGET_PORT, buffer);

        } catch (err) {
            console.error('Error generating print data:', err);
            throw err;
        }
    }

    async printQr(url) {
        // Initialize printer
        const printer = new ThermalPrinter(PRINTER_CONFIG);

        try {
            printer.alignCenter();
            printer.printQR(url, {
                cellSize: 6,
                correction: 'M',
                model: 2
            });
            printer.cut();
            printer.beep();

            const buffer = printer.getBuffer();
            return await this._sendToPrinter(TARGET_IP, TARGET_PORT, buffer);
        } catch (err) {
            console.error('Error printing QR:', err);
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
                    socket.end(); // Close connection after sending
                });
            });

            socket.on('data', (data) => {
                // Some printers respond, others don't.
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
                    // If closed without success and no previous error (rare if not timeout/error)
                    // Could consider reject if nothing was written
                }
            });

            socket.connect(port, ip);
        });
    }

    async _printSection(printer, section) {
        if (!section.type) return;

        printer.setTextNormal();
        printer.alignLeft();

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
                }

                if (section.size) {
                    printer.setTextSize(section.size[0], section.size[1]);
                }

                printer.println(textValue);
                break;

            case 'products':
                if (section.rows && Array.isArray(section.rows)) {
                    section.rows.forEach(row => {
                        const description = row.description || '';
                        const amountVal = typeof row.amount === 'number' ? row.amount : 0;
                        const amountStr = amountVal.toFixed(2) + '€';

                        printer.tableCustom([
                            { text: description, align: "LEFT", width: 0.70 },
                            { text: amountStr, align: "RIGHT", width: 0.30 }
                        ]);
                    });
                }
                break;

            case 'table':
                if (section.rows && Array.isArray(section.rows)) {
                    section.rows.forEach(row => {
                        if (Array.isArray(row) && row.length === 2) {
                            printer.tableCustom([
                                { text: row[0], align: "LEFT" },
                                { text: row[1], align: "RIGHT" }
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

            case 'line':
                printer.drawLine();
                break;

            case 'qrcode':
                if (section.value || section.text) {
                    printer.alignCenter();
                    printer.printQR(section.value || section.text, {
                        cellSize: 6,
                        correction: 'M',
                        model: 2
                    });
                    printer.alignLeft();
                }
                break;
        }
    }
}

module.exports = PrinterService;