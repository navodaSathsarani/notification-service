const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Import the server file to ensure routes are loaded

describe('Notification Service Integration Tests', () => {
  beforeAll(async () => {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(
      process.env.MONGO_URI, // Use environment variable for MongoDB URI
      {}
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
      .post('/api/v1/notification-service/notifications') // Adjust the base path to match your server
      .send({
        patientEmail: 'test@example.com',
        message: 'This is a test notification.',
        scheduledTime: new Date(new Date().getTime() + 60000).toISOString() // 1 minute from now
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.notification.patientEmail).toBe('test@example.com');
    expect(response.body.notification.message).toBe('This is a test notification.');
    expect(response.body.notification.status).toBe('Pending'); // Verify default status
  });

  it('should retrieve all notifications', async () => {
    const response = await request(app).get('/api/v1/notification-service/notifications'); // Adjust the base path
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // it('should delete a specific notification by ID', async () => {
  //   // Create a notification to test deletion
  //   const createResponse = await request(app)
  //     .post('/api/v1/notification-service/notifications')
  //     .send({
  //       patientEmail: 'delete_test@example.com',
  //       message: 'This notification will be deleted.',
  //       scheduledTime: new Date(new Date().getTime() + 60000).toISOString()
  //     });
  //   const notificationId = createResponse.body.notification._id;

  //   const deleteResponse = await request(app).delete(`/api/v1/notification-service/notifications/${notificationId}`);
  //   expect(deleteResponse.statusCode).toBe(200);
  //   expect(deleteResponse.body.message).toBe('Notification deleted successfully.');
  // });

  it('should handle non-existent notification deletion gracefully', async () => {
    const nonExistentId = new mongoose.Types.ObjectId(); // Generate a valid but non-existent ObjectId
    const response = await request(app).delete(`/api/v1/notification-service/notifications/${nonExistentId}`);
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Notification not found');
  });
});
