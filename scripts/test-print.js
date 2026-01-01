const http = require('http');

const data = JSON.stringify({
    "sections": [
        {
            "type": "products",
            "rows": [
                {
                    "count": 2,
                    "description": "Coca Cola Zero 33cl",
                    "amount": 3
                },
                {
                    "count": 1,
                    "description": "Bocadillo Jamón Serr.",
                    "amount": 5.5
                }
            ]
        },
        {
            "type": "table",
            "rows": [
                [
                    "Subtotal",
                    "13.00€"
                ],
                [
                    "IVA (21%)",
                    "2.73€"
                ],
                [
                    "TOTAL",
                    "15.73€"
                ]
            ]
        }
    ]
});

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/print-ticket',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(data);
req.end();
