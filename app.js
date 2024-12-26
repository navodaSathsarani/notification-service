
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
mongoose.connect('mongodb+srv://navodasathsarani:chQf3ctN1Xwx7H6s@health-sync-mongo-db.okigg.mongodb.net/health-db?retryWrites=true&w=majority&appName=health-sync-mongo-db', {
}).then(() => console.log('Connected to MongoDB server')).catch(err => console.error('MongoDB connection error:', err));
const router = express.Router();
router.use(bodyParser.json());

const EMAIL_USER = process.env.EMAIL_USER || 'navodasathsarani@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'Navoda1993,.';


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

// Set unhealthy status
router.use('/unhealthy', (req, res) => {
    healthy = false;
    res.status(200).json({ healthy });
});

// Liveness Check
router.use('/healthcheck', (req, res, next) => {
    if (healthy) {
        next();
    } else {
        next(new Error('unhealthy'));
    }
});

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
