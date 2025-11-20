const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Connect to the Redis container running in Docker
const connection = new IORedis({
  host: 'localhost', 
  port: 6379,
  maxRetriesPerRequest: null,
});

// Create a specific queue named 'scan-queue'
const scanQueue = new Queue('scan-queue', { connection });

module.exports = { scanQueue, connection };