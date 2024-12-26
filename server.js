require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const appRoutes = require('./app'); // Import app.js routes
const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;
const BASE_PATH = process.env.BASE_PATH || '/api/v1/notification-service';
const MONGO_URI = process.env.MONGO_URI;
app.use(BASE_PATH, appRoutes);
module.exports = app;
// Start Server
app.listen(PORT, () => {
    console.log(`Notification service Service is running on port ${PORT}`);
});
