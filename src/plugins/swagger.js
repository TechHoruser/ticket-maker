const fp = require('fastify-plugin');
const fastifySwagger = require('@fastify/swagger');
const fastifySwaggerUi = require('@fastify/swagger-ui');

async function swaggerPlugin(fastify, options) {
    await fastify.register(fastifySwagger, {
        swagger: {
            info: {
                title: 'Ticket Maker API',
                description: 'API for printing QR tickets',
                version: '1.0.0'
            },
            schemes: ['http'],
            consumes: ['application/json'],
            produces: ['application/json']
        }
    });

    await fastify.register(fastifySwaggerUi, {
        routePrefix: '/doc',
        uiConfig: {
            docExpansion: 'full',
            deepLinking: false
        },
        staticCSP: false,
        transformStaticCSP: (header) => header
    });
}

module.exports = fp(swaggerPlugin);
