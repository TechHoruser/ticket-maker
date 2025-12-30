require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    printer: {
        ip: process.env.PRINTER_IP || '192.168.1.200',
        port: process.env.PRINTER_PORT || 9100
    }
};
