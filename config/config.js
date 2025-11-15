// This file holds configuration constants such as API keys and other environment-specific settings.

const config = {
    PORT: process.env.PORT || 3000,
    DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/event-booking',
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
    API_KEY: process.env.API_KEY || 'your_api_key',
};

module.exports = config;