const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app'); // Import the app instance

describe('Notification Service Integration Tests', () => {
  beforeAll(async () => {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(
      'mongodb+srv://navodasathsarani:chQf3ctN1Xwx7H6s@health-sync-mongo-db.okigg.mongodb.net/health-db?retryWrites=true&w=majority&appName=health-sync-mongo-db',
      { useNewUrlParser: true, useUnifiedTopology: true }
    );
    console.log('Connected to MongoDB');
  });

  afterAll(async () => {
    console.log('Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  });

  jest.setTimeout(10000); // Increase timeout to 10 seconds

  it('should schedule a new notification', async () => {
    const response = await request(app)
      .post('/notifications')
      .send({
        patientEmail: 'test@example.com',
        message: 'This is a test notification.',
        scheduledTime: new Date(new Date().getTime() + 60000).toISOString() // 1 minute from now
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.notification.patientEmail).toBe('test@example.com');
    expect(response.body.notification.message).toBe('This is a test notification.');
  });

  it('should retrieve all notifications', async () => {
    const response = await request(app).get('/notifications');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should delete a specific notification by ID', async () => {
    // Create a notification to test deletion
    const createResponse = await request(app)
      .post('/notifications')
      .send({
        patientEmail: 'delete_test@example.com',
        message: 'This notification will be deleted.',
        scheduledTime: new Date(new Date().getTime() + 60000).toISOString()
      });
    const notificationId = createResponse.body.notification._id;

    const deleteResponse = await request(app).delete(`/notifications/${notificationId}`);
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body.message).toBe('Notification deleted successfully.');
  });

  it('should handle non-existent notification deletion gracefully', async () => {
    const response = await request(app).delete('/notifications/64d9f3d2e4b0b1f1f6a98c5f'); // Assuming a non-existent ID
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Notification not found');
  });
});
