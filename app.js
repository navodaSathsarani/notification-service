// Notification Service

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');

const app = express();
const PORT = process.env.PORT || 50002;

// Middleware
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://navodasathsarani:chQf3ctN1Xwx7H6s@health-sync-mongo-db.okigg.mongodb.net/health-db?retryWrites=true&w=majority&appName=health-sync-mongo-db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB')).catch(err => console.error('MongoDB connection error:', err));

// Define Notification Schema and Model
const notificationSchema = new mongoose.Schema({
    patientEmail: { type: String, required: true },
    message: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    status: { type: String, enum: ['Pending', 'Sent'], default: 'Pending' }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-email-password'
    }
});

// Routes

// Schedule a notification
app.post('/notifications', async (req, res) => {
    try {
        const { patientEmail, message, scheduledTime } = req.body;
        const notification = new Notification({ patientEmail, message, scheduledTime });
        await notification.save();

        // Schedule the notification
        schedule.scheduleJob(new Date(scheduledTime), async () => {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER || 'your-email@gmail.com',
                    to: patientEmail,
                    subject: 'Appointment Reminder',
                    text: message
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
app.get('/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find();
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a notification
app.delete('/notifications/:id', async (req, res) => {
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

// Start the server
app.listen(PORT, () => {
    console.log(`Notification Service is running on port ${PORT}`);
});
