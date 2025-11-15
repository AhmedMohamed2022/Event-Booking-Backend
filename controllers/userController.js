// // userController.js

// const User = require('../models/User');

// // Get user profile
// exports.getUserProfile = async (req, res) => {
//     try {
//         const user = await User.findById(req.user.id);
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// };

// // Update user profile
// exports.updateUserProfile = async (req, res) => {
//     try {
//         const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// };
