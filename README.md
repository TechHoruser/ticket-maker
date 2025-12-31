# Ticket Maker

Ticket Maker is a Node.js API built with [Fastify](https://www.fastify.io/) designed to send print jobs to network thermal printers (specifically targeted for **Xprinter 80T**). It supports dynamic ticket layouts and QR code printing using `node-thermal-printer` and `escpos`.

## Features

- **Print Tickets**: Flexible ticket construction with various section types:
  - Text (standard, bold, varied sizes and alignments)
  - Tables (summary, totals)
  - Products lists (auto-formatted)
  - Barcodes (EAN13, etc.)
  - QR Codes
  - Images
  - Spacing and lines
- **Print QR**: Dedicated endpoint for quickly printing a QR code from a URL.
- **Swagger UI**: Interactive API documentation available at `/documentation`.
- **Network Printing**: Configurable IP and port for the thermal printer.

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **Network Thermal Printer**: Connected to the same network as the server.
  - Tested with: Xprinter 80T

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd ticket-maker
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure environment variables:
    Create a `.env` file in the root directory (copy from .env.example if available) or add the following variables:

    ```env
    PORT=3000
    PRINTER_IP=192.168.1.200
    PRINTER_PORT=9100
    ```

    *   `PORT`: The port on which the API server will run (default: 3000).
    *   `PRINTER_IP`: The IP address of your thermal printer.
    *   `PRINTER_PORT`: The network port of your printer (default is usually 9100).

## Usage

### Development
Run the server with hot-reload enabled:
```bash
npm run dev
```

### Production
Start the server:
```bash
npm start
```

## API Documentation

Once the server is running, visit **[http://localhost:3000/documentation](http://localhost:3000/documentation)** to view the full Swagger API documentation and test endpoints interactively.

### Key Endpoints

#### POST `/print-ticket`
Sends a complex ticket structure to the printer.

**Example Body:**
```json
{
  "sections": [
    {
      "type": "text",
      "value": "MY STORE",
      "align": "center",
      "style": "b",
      "size": [2, 2]
    },
    {
      "type": "line"
    },
    {
      "type": "products",
      "rows": [
        {
          "count": 2,
          "description": "Item A",
          "amount": 10.00
        }
      ]
    },
    {
      "type": "barcode",
      "code": "1234567890128",
      "barcodeType": "EAN13"
    }
  ]
}
```

## Project Structure

- `server.js`: Application entry point.
- `src/app.js`: Fastify app factory and plugin registration.
- `src/config/`: Configuration handling (env vars).
- `src/handlers/`: Business logic for route handlers.
- `src/routes/`: API route definitions (schemas).
- `src/services/`: Services for printer communication (`printerService.js`).
- `src/plugins/`: Fastify plugins (e.g., Swagger).
