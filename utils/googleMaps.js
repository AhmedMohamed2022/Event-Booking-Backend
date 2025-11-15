exports.generateGoogleMapLinks = (lat, lng) => {
  const googleMapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return { googleMapUrl, directionUrl };
};
