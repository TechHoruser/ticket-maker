const fastify = require('fastify');
const swaggerPlugin = require('./plugins/swagger');
const printerRoutes = require('./routes/printerRoutes');

function build(opts = {}) {
    const app = fastify(opts);

    // Register plugins
    app.register(swaggerPlugin);

    // Register routes
    app.register(printerRoutes);

    return app;
}

module.exports = build;
