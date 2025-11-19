const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// A simple health check route
app.get('/', (req, res) => {
    res.send('GreenPage AI Core API is running! 🌿');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});