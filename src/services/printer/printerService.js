const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const net = require('net');
const { PNG } = require('pngjs');
const { codePages: xprinterCodePages } = require('./xprinter-80t.conf');

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
    }

    async printTicket(sections = []) {
        // Initialize printer (buffer generator)
        const printer = new ThermalPrinter(PRINTER_CONFIG);

        // --- FIX PARA XPRINTER 80T ---
        // 1. Cancelar modo caracteres chinos (FS .) -> 0x1C, 0x2E
        // 2. Set Code Page
        printer.raw(Buffer.from([0x1C, 0x2E]));

        const codePageKey = PRINTER_CONFIG.characterSet;
        const codePageVal = xprinterCodePages[codePageKey];

        if (codePageVal !== undefined) {
            console.log(`Setting Code Page to ${codePageKey} (${codePageVal})`);
            printer.raw(Buffer.from([0x1B, 0x74, codePageVal]));
        } else {
            console.warn(`Code Page ${codePageKey} not found in xprinter config`);
        }
        // -----------------------------

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



    async _sendToPrinter(ip, port, buffer) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(`Retry attempt ${attempt}/${MAX_RETRIES} for printer connection...`);
                }
                return await this._executeSendRaw(ip, port, buffer);
            } catch (err) {
                console.warn(`Printer connection failed (attempt ${attempt}/${MAX_RETRIES}): ${err.message}`);

                const isConnectionError = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH'].includes(err.code) ||
                    (err.message && err.message.includes('ECONNRESET'));

                if (!isConnectionError || attempt === MAX_RETRIES) {
                    throw err;
                }

                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
    }

    async _executeSendRaw(ip, port, buffer) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();

            // Handle timeout
            socket.setTimeout(5000);

            socket.on('connect', () => {
                socket.write(buffer, (err) => {
                    if (err) {
                        socket.destroy();
                        reject(err);
                    } else {
                        socket.end(); // Send FIN packet to close connection gracefully
                    }
                });
            });

            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Printer connection timeout'));
            });

            socket.on('error', (err) => {
                socket.destroy();
                reject(err);
            });

            socket.on('close', (hadError) => {
                // If it closed without error (or we handled the error), resolve
                if (!hadError) {
                    resolve({ success: true, message: 'Printed successfully' });
                }
                // If hadError is true, 'error' event should have triggered reject
            });

            socket.connect(port, ip);
        });
    }

    async _processImagePosition(imageBuffer, position) {
        const PRINTER_WIDTH_DOTS = 576; // Standard 80mm width
        const cols = position.cols || 1;
        const startCol = position.startCol || 0;
        const endCol = position.endCol || 1;

        const colWidth = PRINTER_WIDTH_DOTS / cols;
        const spanWidth = (endCol - startCol) * colWidth;

        // Resize image to fit in the column span if necessary
        const resizedBuffer = await this._resizePng(imageBuffer, spanWidth);

        return new Promise((resolve, reject) => {
            new PNG().parse(resizedBuffer, (error, data) => {
                if (error) return reject(error);

                try {
                    const startX = startCol * colWidth;
                    const centerX = startX + (spanWidth / 2);

                    let targetX = Math.round(centerX - (data.width / 2));
                    if (targetX < 0) targetX = 0;

                    const newPng = new PNG({ width: PRINTER_WIDTH_DOTS, height: data.height });

                    // data.bitblt(dst, srcX, srcY, width, height, dstX, dstY)
                    data.bitblt(newPng, 0, 0, data.width, data.height, targetX, 0);

                    const buffer = PNG.sync.write(newPng);
                    resolve(buffer);
                } catch (err) {
                    reject(err);
                }
            });
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
                            { text: description, align: "LEFT", width: 0.75 },
                            { text: amountStr, align: "RIGHT", width: 0.25 }
                        ]);
                    });
                }
                break;

            case 'table':
                if (section.rows && Array.isArray(section.rows)) {
                    section.rows.forEach(row => {
                        if (Array.isArray(row) && row.length === 2) {
                            printer.tableCustom([
                                { text: row[0], align: "LEFT", width: 0.75 },
                                { text: row[1], align: "RIGHT", width: 0.25 }
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

            case 'image':
                if (section.image) {
                    try {
                        let base64Image = section.image;
                        const base64Prefix = /^data:image\/[a-z]+;base64,/;
                        if (base64Prefix.test(base64Image)) {
                            base64Image = base64Image.replace(base64Prefix, '');
                        }

                        let imageBuffer = Buffer.from(base64Image, 'base64');

                        if (section.position) {
                            // Logic inside _processImagePosition handles resizing to valid column span
                            const processedBuffer = await this._processImagePosition(imageBuffer, section.position);
                            printer.alignLeft();
                            await printer.printImageBuffer(processedBuffer);
                        } else {
                            // Standard full width fit
                            imageBuffer = await this._fitImageToPrinter(imageBuffer);
                            printer.alignCenter();
                            await printer.printImageBuffer(imageBuffer);
                            printer.alignLeft();
                        }
                    } catch (err) {
                        console.error('Error printing image:', err);
                    }
                }
                break;
        }
    }

    async _fitImageToPrinter(imageBuffer) {
        return this._resizePng(imageBuffer, 576);
    }

    async _resizePng(imageBuffer, maxWidth) {
        return new Promise((resolve, reject) => {
            const png = new PNG({ filterType: 4 });
            png.parse(imageBuffer, (error, data) => {
                if (error) return reject(error);

                if (data.width <= maxWidth) {
                    resolve(imageBuffer);
                    return;
                }

                // Simple Downscaling (Nearest Neighbor)
                const scale = maxWidth / data.width;
                const newWidth = Math.floor(maxWidth); // Ensure integer
                const newHeight = Math.round(data.height * scale);

                const dst = new PNG({ width: newWidth, height: newHeight });

                for (let y = 0; y < newHeight; y++) {
                    for (let x = 0; x < newWidth; x++) {
                        const srcX = Math.floor(x / scale);
                        const srcY = Math.floor(y / scale);

                        const srcIdx = (data.width * srcY + srcX) << 2;
                        const dstIdx = (newWidth * y + x) << 2;

                        dst.data[dstIdx] = data.data[srcIdx];
                        dst.data[dstIdx + 1] = data.data[srcIdx + 1];
                        dst.data[dstIdx + 2] = data.data[srcIdx + 2];
                        dst.data[dstIdx + 3] = data.data[srcIdx + 3];
                    }
                }

                const buffer = PNG.sync.write(dst);
                resolve(buffer);
            });
        });
    }
}

module.exports = PrinterService;