const request = require('supertest');
const app = require('../app'); // Adjust the path as necessary
const Event = require('../models/Event');

describe('Event Management', () => {
    beforeEach(async () => {
        await Event.deleteMany({});
    });

    it('should create a new event', async () => {
        const res = await request(app)
            .post('/api/events')
            .send({
                title: 'Test Event',
                date: '2023-10-01',
                location: 'Test Location',
                description: 'This is a test event.'
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('event');
    });

    it('should fetch all events', async () => {
        await Event.create({
            title: 'Test Event',
            date: '2023-10-01',
            location: 'Test Location',
            description: 'This is a test event.'
        });

        const res = await request(app).get('/api/events');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('events');
        expect(res.body.events.length).toBeGreaterThan(0);
    });

    it('should update an event', async () => {
        const event = await Event.create({
            title: 'Test Event',
            date: '2023-10-01',
            location: 'Test Location',
            description: 'This is a test event.'
        });

        const res = await request(app)
            .put(`/api/events/${event._id}`)
            .send({
                title: 'Updated Test Event'
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body.event.title).toEqual('Updated Test Event');
    });

    it('should delete an event', async () => {
        const event = await Event.create({
            title: 'Test Event',
            date: '2023-10-01',
            location: 'Test Location',
            description: 'This is a test event.'
        });

        const res = await request(app).delete(`/api/events/${event._id}`);
        expect(res.statusCode).toEqual(204);
    });
});