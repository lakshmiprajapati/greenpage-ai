const { Worker } = require('bullmq');
const prisma = require('./lib/db');
const { connection } = require('./lib/queue');
const puppeteer = require('puppeteer');
const { co2 } = require('@tgwf/co2');

console.log("👷 Auditor Worker started! Waiting for jobs...");

const worker = new Worker('scan-queue', async (job) => {
    const { scanId, url } = job.data;
    console.log(`[Job ${job.id}] Starting audit for: ${url}`);

    let browser;
    try {
        // 1. Launch Browser
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox']
        });
        const page = await browser.newPage();

        // 2. Visit URL (Wait until network is quiet)
        console.log(`[Job ${job.id}] Visiting page...`);
        await page.goto(url, { waitUntil: 'networkidle0' });

        // 3. extract Network Data using the browser's built-in Performance API
        // This is much more stable than external libraries
        const audit = await page.evaluate(() => {
            // Get all resources (images, scripts, etc.)
            const resources = performance.getEntriesByType('resource');
            // Get the main HTML file itself
            const navigation = performance.getEntriesByType('navigation')[0];

            let totalBytes = (navigation && navigation.transferSize) || 0;
            const fileList = [];

            resources.forEach(r => {
                totalBytes += r.transferSize;
                fileList.push({
                    url: r.name,
                    type: r.initiatorType,
                    size: r.transferSize
                });
            });

            return { totalBytes, fileList };
        });

        const { totalBytes, fileList } = audit;
        
        console.log(`[Job ${job.id}] Page size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

        // 4. Calculate Carbon
        const swd = new co2({ model: "swd" }); 
        const emissions = swd.perByte(totalBytes); 

        console.log(`[Job ${job.id}] Carbon Score: ${emissions.toFixed(4)}g CO2`);

        // 5. Save to Database
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: 'COMPLETED',
                carbonScore: emissions,
                reportData: fileList // Save the list of files for the frontend to show
            }
        });

        console.log(`[Job ${job.id}] Audit Complete!`);

    } catch (error) {
        console.error(`[Job ${job.id}] Failed:`, error);
        
        await prisma.scan.update({
            where: { id: scanId },
            data: { status: 'FAILED' }
        });
    } finally {
        if (browser) await browser.close();
    }

}, { connection });

worker.on('error', err => console.error(err));