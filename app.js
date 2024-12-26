const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const healthCheck = require('express-healthcheck');

// Environment Variables
require('dotenv').config();

const EMAIL_USER = process.env.EMAIL_USER || 'your-email@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'your-email-password';
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Connection
mongoose.connect(MONGO_URI, {
}).then(() => console.log('Connected to MongoDB')).catch(err => console.error('MongoDB connection error:', err));

// Notification Schema and Model
const notificationSchema = new mongoose.Schema({
    patientEmail: { type: String, required: true },
    message: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    status: { type: String, enum: ['Pending', 'Sent'], default: 'Pending' },
});
const Notification = mongoose.model('Notification', notificationSchema);

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

// Health Check Middleware
let healthy = true;
router.use('/unhealthy', (req, res) => {
    healthy = false;
    res.status(200).json({ healthy });
});
router.use('/healthcheck', (req, res, next) => {
    if (healthy) next();
    else next(new Error('unhealthy'));
}, healthCheck());

// Readiness Check
router.use('/readiness', (req, res) => {
    res.status(200).json({ ready: true });
});
// Routes

// Schedule a notification
router.post('/notifications', async (req, res) => {
    try {
        const { patientEmail, message, scheduledTime } = req.body;
        const notification = new Notification({ patientEmail, message, scheduledTime });
        await notification.save();

        // Schedule the notification
        schedule.scheduleJob(new Date(scheduledTime), async () => {
            try {
                await transporter.sendMail({
                    from: EMAIL_USER,
                    to: patientEmail,
                    subject: 'Appointment Reminder',
                    text: message,
                });

                notification.status = 'Sent';
                await notification.save();
                console.log(`Notification sent to ${patientEmail}`);
            } catch (error) {
                console.error(`Failed to send notification to ${patientEmail}:`, error);
            }
        });

        res.status(201).json({ message: 'Notification scheduled successfully', notification });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all notifications
router.get('/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find();
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a notification
router.delete('/notifications/:id', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndDelete(req.params.id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
