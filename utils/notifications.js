module.exports = {
    sendBookingConfirmation: (userEmail, bookingDetails) => {
        // Logic to send booking confirmation notification to the user
        console.log(`Sending booking confirmation to ${userEmail} with details:`, bookingDetails);
    },
    
    sendEventReminder: (userEmail, eventDetails) => {
        // Logic to send event reminder notification to the user
        console.log(`Sending event reminder to ${userEmail} for event:`, eventDetails);
    },
    
    sendCancellationNotice: (userEmail, bookingId) => {
        // Logic to send cancellation notice to the user
        console.log(`Sending cancellation notice to ${userEmail} for booking ID: ${bookingId}`);
    }
};