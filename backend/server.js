const express = require('express');
const cors = require('cors');
const prisma = require('./lib/db');
const { scanQueue } = require('./lib/queue');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow the frontend (which we will build later) to talk to us
app.use(cors());
app.use(express.json());

// --- ROUTES ---

// 1. POST /api/scan -> Start a new audit
app.post('/api/scan', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        console.log(`Received request to scan: ${url}`);

        // A: Create a record in the Database (Status: PENDING)
        const newScan = await prisma.scan.create({
            data: {
                url: url,
                status: 'PENDING'
            }
        });

        // B: Add the job to the Redis Queue
        // This tells the worker: "Hey, work on scanId X for this URL"
        await scanQueue.add('audit-job', {
            scanId: newScan.id,
            url: newScan.url
        });

        console.log(`Scan started! ID: ${newScan.id}`);

        // C: Return the Scan ID to the user immediately
        res.json({ scanId: newScan.id, message: 'Scan started' });

    } catch (error) {
        console.error("Error starting scan:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. GET /api/scan/:id -> Check the results
app.get('/api/scan/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const scan = await prisma.scan.findUnique({
            where: { id }
        });

        if (!scan) {
            return res.status(404).json({ error: 'Scan not found' });
        }

        res.json(scan);

    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(PORT, () => {
    console.log(`Core API running on http://localhost:${PORT}`);
});