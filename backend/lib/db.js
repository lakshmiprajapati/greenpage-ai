const { PrismaClient } = require('@prisma/client');

// Create a single instance of the database client
const prisma = new PrismaClient();

module.exports = prisma;