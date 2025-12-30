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
                    sections: {
                        type: 'array',
                        default: [
                            {
                                "type": "text",
                                "value": "MI TIENDA GENIAL",
                                "align": "center",
                                "style": "b",
                                "size": [2, 2]
                            },
                            {
                                "type": "text",
                                "value": "C/ Ejemplo 123, Madrid\nTel: 91 123 45 67",
                                "align": "center"
                            },
                            {
                                "type": "space",
                                "lines": 1
                            },
                            {
                                "type": "text",
                                "value": "Ticket: #00012345\nFecha: 30/12/2025 22:30",
                                "align": "left"
                            },
                            {
                                "type": "line"
                            },
                            {
                                "type": "products",
                                "rows": [
                                    {
                                        "count": 2,
                                        "description": "Coca Cola Zero 33cl",
                                        "amount": 3.00
                                    },
                                    {
                                        "count": 1,
                                        "description": "Bocadillo Jamón Serr.",
                                        "amount": 5.50
                                    },
                                    {
                                        "count": 3,
                                        "description": "Agua Mineral 50cl",
                                        "amount": 4.50
                                    }
                                ]
                            },
                            {
                                "type": "line"
                            },
                            {
                                "type": "table",
                                "rows": [
                                    ["Subtotal", "13.00€"],
                                    ["IVA (21%)", "2.73€"],
                                    ["TOTAL", "15.73€"]
                                ]
                            },
                            {
                                "type": "space",
                                "lines": 2
                            },
                            {
                                "type": "text",
                                "value": "¡Gracias por su visita!\nConserve este ticket para devoluciones",
                                "align": "center",
                                "style": "b"
                            },
                            {
                                "type": "space",
                                "lines": 1
                            },
                            {
                                "type": "barcode",
                                "code": "1234567890128",
                                "barcodeType": "EAN13",
                                "width": 2,
                                "height": 50
                            }
                        ],
                        items: {
                            type: 'object',
                            required: ['type'],
                            properties: {
                                type: { type: 'string', enum: ['text', 'products', 'table', 'barcode', 'qrcode', 'image', 'space', 'line'] },
                                value: { type: 'string' }, // For text, qrcode
                                text: { type: 'string' }, // Alternative for text
                                align: { type: 'string', enum: ['lt', 'ct', 'rt', 'left', 'center', 'right'] },
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
