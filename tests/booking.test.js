const request = require('supertest');
const app = require('../app'); // Adjust the path as necessary
const Booking = require('../models/Booking');

describe('Booking API', () => {
    beforeEach(async () => {
        // Clear the database before each test
        await Booking.deleteMany({});
    });

    it('should create a new booking', async () => {
        const bookingData = {
            userId: '12345',
            eventId: '67890',
            date: '2023-10-01',
            time: '18:00',
            guests: 2
        };

        const response = await request(app)
            .post('/api/bookings') // Adjust the route as necessary
            .send(bookingData)
            .expect(201);

        expect(response.body).toHaveProperty('_id');
        expect(response.body.userId).toBe(bookingData.userId);
        expect(response.body.eventId).toBe(bookingData.eventId);
    });

    it('should retrieve all bookings', async () => {
        const response = await request(app)
            .get('/api/bookings') // Adjust the route as necessary
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
    });

    // Add more tests as needed
});