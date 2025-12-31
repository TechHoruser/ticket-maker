
const PrinterService = require('../services/printer/printerService');

const printerService = new PrinterService();



async function printTicket(request, reply) {
    const { sections = [] } = request.body;

    try {
        const result = await printerService.printTicket(sections);
        return result;
    } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to print ticket', details: err.message });
    }
}

module.exports = {
    printTicket
};
