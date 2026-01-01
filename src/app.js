const fastify = require('fastify');
const swaggerPlugin = require('./plugins/swagger');
const printerRoutes = require('./routes/printerRoutes');

function build(opts = {}) {
    const app = fastify(opts);

    // Register plugins
    app.register(swaggerPlugin);

    // Register routes
    app.register(printerRoutes);

    app.setErrorHandler(function (error, request, reply) {
        request.log.error(error);
        reply.status(error.statusCode || 500).send({
            error: error.name,
            message: error.message,
            statusCode: error.statusCode || 500,
            validation: error.validation // Expose validation errors
        });
    });

    return app;
}

module.exports = build;
