require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    printer: {
        ip: process.env.PRINTER_IP,
        port: process.env.PRINTER_PORT
    }
};
