const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const notificationRoutes = require('../app'); // Adjust the path as necessary

const app = express();
app.use(express.json());
app.use('/api/v1/notification-service', notificationRoutes);

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn((mailOptions, callback) => callback(null, { response: 'success' })),
  })),
}));

beforeAll(async () => {
  const TEST_DB_URI = "mongodb+srv://navodasathsarani:chQf3ctN1Xwx7H6s@health-sync-mongo-db.okigg.mongodb.net/health-db?retryWrites=true&w=majority&appName=health-sync-mongo-db";
  await mongoose.connect(TEST_DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Notification Service Tests', () => {
  it('should schedule a notification successfully', async () => {
    const res = await request(app)
      .post('/api/v1/notification-service/notifications')
      .send({
        patientEmail: 'test@example.com',
        message: 'This is a test notification.',
        scheduledTime: new Date(Date.now() + 60000).toISOString(), // Schedule 1 minute later
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Notification scheduled successfully');
    expect(res.body.notification).toHaveProperty('status', 'Pending');
  });

  it('should retrieve all notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notification-service/notifications');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should delete a notification successfully', async () => {
    // Create a notification to delete
    const notification = await request(app)
      .post('/api/v1/notification-service/notifications')
      .send({
        patientEmail: 'delete@example.com',
        message: 'Delete this notification.',
        scheduledTime: new Date(Date.now() + 60000).toISOString(),
      });

    const notificationId = notification.body.notification._id;

    const res = await request(app)
      .delete(`/api/v1/notification-service/notifications/${notificationId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Notification deleted successfully');
  });

  it('should return 404 for deleting a non-existing notification', async () => {
    const res = await request(app)
      .delete('/api/v1/notification-service/notifications/64ce8dcddf36c23124e4c2f1'); // Random ID

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Notification not found');
  });

  it('should handle invalid notification creation data', async () => {
    const res = await request(app)
      .post('/api/v1/notification-service/notifications')
      .send({
        patientEmail: '', // Invalid email
        message: '', // Empty message
        scheduledTime: '', // Missing scheduled time
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
