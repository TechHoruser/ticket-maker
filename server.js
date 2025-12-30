const config = require('./src/config');
const buildApp = require('./src/app');

const app = buildApp({ logger: true });

const start = async () => {
    try {
        await app.ready(); // Ensure plugins are loaded
        app.log.info(app.printRoutes());
        await app.listen({ port: config.port, host: '0.0.0.0' });
        app.log.info(`Server listening on ${app.server.address().port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
