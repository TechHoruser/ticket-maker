const printerHandler = require('../handlers/printerHandler');

async function printerRoutes(fastify, options) {
    fastify.post('/print-qr', {
        schema: {
            description: 'Generate and print a QR code for a given URL',
            tags: ['printer'],
            body: {
                type: 'object',
                required: ['url'],
                properties: {
                    url: { type: 'string', description: 'The URL to encode in the QR code' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                500: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                }
            }
        }
    }, printerHandler.printQr);

    fastify.post('/print-ticket', {
        schema: {
            description: 'Print a dynamic ticket with multiple sections',
            tags: ['printer'],
            body: {
                type: 'object',
                required: ['sections'],
                properties: {
                    config: {
                        type: 'object',
                        description: 'Printer configuration overrides',
                        properties: {
                            ip: { type: 'string' },
                            port: { type: 'integer' },
                            encoding: { type: 'string' },
                            font: { type: 'string', enum: ['a', 'b'] }
                        }
                    },
                    sections: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['type'],
                            properties: {
                                type: { type: 'string', enum: ['text', 'products', 'table', 'barcode', 'qrcode', 'image', 'space'] },
                                value: { type: 'string' }, // For text, qrcode
                                text: { type: 'string' }, // Alternative for text
                                align: { type: 'string', enum: ['lt', 'ct', 'rt'] },
                                style: { type: 'string' }, // 'bu', 'b', 'u', 'Normal', etc.
                                size: { type: 'array', items: { type: 'integer' }, minItems: 2, maxItems: 2 },
                                items: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            qty: { type: ['integer', 'string'] },
                                            desc: { type: 'string' },
                                            total: { type: 'string' }
                                        }
                                    }
                                },
                                rows: {
                                    type: 'array',
                                    items: {
                                        oneOf: [
                                            {
                                                type: 'array',
                                                items: { type: 'string' },
                                                minItems: 2,
                                                maxItems: 2
                                            },
                                            {
                                                type: 'object',
                                                properties: {
                                                    count: { type: 'integer' },
                                                    description: { type: 'string' },
                                                    amount: { type: 'number' }
                                                }
                                            }
                                        ]
                                    }
                                },
                                code: { type: 'string' }, // For barcode
                                barcodeType: { type: 'string' },
                                width: { type: 'integer' },
                                height: { type: 'integer' },
                                path: { type: 'string' }, // For image
                                lines: { type: 'integer' } // For space
                            }
                        }
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                    }
                },
                500: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                }
            }
        }
    }, printerHandler.printTicket);
}

module.exports = printerRoutes;
