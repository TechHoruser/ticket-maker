const config = require('../config');
const PrinterService = require('../services/printer/printerService');

const printerService = new PrinterService(config.printer);

async function printQr(request, reply) {
    const { url } = request.body;

    try {
        const result = await printerService.printQr(url);
        return result;
    } catch (err) {
        request.log.error(err);
        // Determine status code based on error type if needed
        // For now, simpler error handling as per original code
        if (err.message === 'URL is required') {
            return reply.code(400).send({ error: err.message });
        }
        return reply.code(500).send({ error: 'Failed to print', details: err.message });
    }
}

async function printTicket(request, reply) {
    const { config = {}, sections = [] } = request.body;

    try {
        const result = await printerService.printTicket(config, sections);
        return result;
    } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to print ticket', details: err.message });
    }
}

module.exports = {
    printQr,
    printTicket
};
