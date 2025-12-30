const escpos = require('escpos');
escpos.Network = require('escpos-network');

const ip = '192.168.1.37';
const port = 9100;

const device = new escpos.Network(ip, port);
const printer = new escpos.Printer(device);

device.open((error) => {
    if (error) {
        console.error('Error de conexión:', error);
        return;
    }

    try {
        printer
            .font('a')
            .align('ct')
            .size(1, 1)
            .text('PRUEBA SIN ERROR DE CORTE')
            .feed(5)     // Avanzamos suficiente papel
            .cut(true)   // <--- IMPORTANTE: 'true' hace corte parcial (menos agresivo)
            // Si con .cut(true) sigue pitando, comenta la línea .cut y deja solo el .feed(5)
            .flush();

        // IMPORTANTE: Dejamos que la impresora termine su ciclo interno
        setTimeout(() => {
            // Cerramos el dispositivo, no solo el printer
            device.close(() => {
                console.log('Impresión terminada y conexión cerrada.');
                process.exit(0);
            });
        }, 2000);

    } catch (e) {
        console.error('Error durante la ejecución:', e);
        device.close();
    }
});