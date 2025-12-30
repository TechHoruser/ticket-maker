const net = require('net');

const port = 9100;
const subnets = [0, 1, 2];
const timeout = 1000; // 1 second timeout

console.log(`Scanning for Xprinter 80T on port ${port} in subnets 192.168.[0-2].x ...`);
console.log('This may take a minute...');

const checkIp = (ip) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            console.log(`\n[FOUND] Printer found at: ${ip}`);
            socket.destroy();
            resolve(ip);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(null);
        });

        socket.on('error', (err) => {
            socket.destroy();
            resolve(null);
        });

        socket.connect(port, ip);
    });
};

const scan = async () => {
    const tasks = [];

    // generate all IPs to scan
    for (const subnet of subnets) {
        for (let i = 1; i < 255; i++) {
            tasks.push(`192.168.${subnet}.${i}`);
        }
    }

    const concurrency = 200; // Scan 200 at a time
    const results = [];

    for (let i = 0; i < tasks.length; i += concurrency) {
        const batch = tasks.slice(i, i + concurrency);
        // process.stdout.write(` Scanning batch starting at ${batch[0]} ...\r`);

        const batchResults = await Promise.all(batch.map(ip => checkIp(ip)));
        const found = batchResults.filter(r => r !== null);
        results.push(...found);
    }

    console.log('\nScan complete.');
    if (results.length === 0) {
        console.log('No printers found in the specify ranges.');
    } else {
        console.log('Found printers:', results);
    }
};

scan();
