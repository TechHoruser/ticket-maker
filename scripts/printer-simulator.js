require('dotenv').config();
const net = require('net');

const PORT = process.env.PRINTER_PORT || 9100;
const HOST = '0.0.0.0'; // Listen on all interfaces

const iconv = require('iconv-lite');
const fs = require('fs');

const TICKET_WIDTH = 48;

const server = net.createServer((socket) => {
    console.log(`\n[SIMULATOR] New connection from ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
        const headerText = ' TICKET START ';
        const pd = Math.max(0, Math.floor((TICKET_WIDTH - headerText.length) / 2));
        console.log('\n' + '='.repeat(pd) + headerText + '='.repeat(Math.max(0, TICKET_WIDTH - pd - headerText.length)));

        // Function to strip ESC/POS commands from buffer
        function cleanEscPosBuffer(buffer) {
            const result = [];
            let i = 0;
            while (i < buffer.length) {
                const b = buffer[i];

                // ESC commands (0x1B)
                if (b === 0x1B) {
                    if (i + 1 >= buffer.length) break; // Incomplete
                    const cmd = buffer[i + 1];

                    if (cmd === 0x40) { // ESC @ (Initialize)
                        i += 2;
                    } else if (cmd === 0x74) { // ESC t n (Code table)
                        i += 3;
                    } else if (cmd === 0x61) { // ESC a n (Align)
                        i += 3;
                    } else if (cmd === 0x21) { // ESC ! n (Print mode)
                        i += 3;
                    } else if (cmd === 0x42) { // ESC B n t (Beep - length varies but often 2 args)
                        // printer.beep() in node-thermal-printer often uses ESC B 3 1 or similar
                        // actually node-thermal-printer uses: '\x1B\x42\x03\x02' for beep?
                        // Let's assume 4 bytes total for safety if it matches ESC B
                        i += 4;
                    } else if (cmd === 0x70) { // ESC p m t1 t2 (Cash drawer)
                        i += 5;
                    } else if (cmd === 0x64) { // ESC d n (Print and feed n lines)
                        i += 3;
                    } else {
                        // Unknown ESC command, skip 2 bytes to be safe or just skip ESC
                        // Skipping just ESC might leave garbage. 
                        // Let's assume most common 1-byte arg commands if unknown.
                        i += 2;
                    }
                }
                // GS commands (0x1D)
                else if (b === 0x1D) {
                    if (i + 1 >= buffer.length) break;
                    const cmd = buffer[i + 1];

                    if (cmd === 0x56) { // GS V (Cut)
                        // GS V m (0,1,48,49) or GS V m n (65, 66)
                        if (i + 2 < buffer.length) {
                            const m = buffer[i + 2];
                            if (m === 65 || m === 66) i += 4; // GS V m n
                            else i += 3; // GS V m
                        } else {
                            i += 3;
                        }
                    } else if (cmd === 0x21) { // GS ! n (Char size)
                        i += 3;
                    } else {
                        i += 2;
                    }
                }
                // FS commands (0x1C)
                else if (b === 0x1C) {
                    if (i + 1 >= buffer.length) break;
                    const cmd = buffer[i + 1];
                    if (cmd === 0x2E) { // FS . (Cancel Chinese)
                        i += 2;
                    } else {
                        i += 2;
                    }
                }
                else {
                    result.push(b);
                    i++;
                }
            }
            return Buffer.from(result);
        }

        const cleanBuffer = cleanEscPosBuffer(data);

        // Use iconv-lite to decode PC858 (common for printers)
        // Adjust encoding if usage changes (e.g. CP437)
        let textContent = iconv.decode(cleanBuffer, 'CP858');

        // Strip control characters (0x00-0x1F) except newline (0x0A)
        // Also strip DEL (0x7F)
        textContent = textContent.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '');

        console.log(textContent);
        fs.appendFileSync('simulator_log.txt', textContent + '\n' + '='.repeat(TICKET_WIDTH) + '\n');

        const footerText = ' TICKET END ';
        const fpd = Math.max(0, Math.floor((TICKET_WIDTH - footerText.length) / 2));
        console.log('='.repeat(fpd) + footerText + '='.repeat(Math.max(0, TICKET_WIDTH - fpd - footerText.length)) + '\n');
    });

    socket.on('close', () => {
        console.log('[SIMULATOR] Connection closed');
    });

    socket.on('error', (err) => {
        console.error('[SIMULATOR] Socket error:', err.message);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`
#########################################################
#                                                       #
#   PRINTER SIMULATOR LISTENING ON PORT ${PORT}            #
#                                                       #
#   Configure your environment to use:                  #
#   PRINTER_IP=127.0.0.1                                #
#   PRINTER_PORT=${PORT}                                   #
#                                                       #
#########################################################
`);
});

server.on('error', (err) => {
    console.error('[SIMULATOR] Server error:', err);
});
