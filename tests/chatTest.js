const io = require("socket.io-client");
const axios = require("axios");

// Test configuration
const BASE_URL = "http://localhost:5000";
let userToken1, userToken2;
let socket1, socket2;

// Test users
const testUser1 = {
  phone: "+962791111111",
  name: "Test User 1",
};

const testUser2 = {
  phone: "+962792222222",
  name: "Test User 2",
};

// Helper functions
async function loginUser(user) {
  try {
    console.log(`Requesting OTP for ${user.phone}...`);
    const otpResponse = await axios.post(`${BASE_URL}/api/auth/send-otp`, {
      phone: user.phone,
      name: user.name,
    });
    console.log("OTP Response:", otpResponse.data);

    // Use the OTP from response
    const testOtp = otpResponse.data.testOtp;
    if (!testOtp) {
      throw new Error("No test OTP received");
    }

    console.log("Verifying OTP...");
    const response = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      phone: user.phone,
      otp: testOtp,
      name: user.name,
    });

    if (!response.data.token || !response.data.user) {
      throw new Error("Invalid response from verification");
    }

    console.log(`User ${user.name} logged in successfully`);
    return {
      token: response.data.token,
      user: response.data.user,
    };
  } catch (error) {
    console.error("Login error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

async function connectSocket(token) {
  const socket = io(BASE_URL, {
    auth: { token },
    transports: ["websocket"],
  });

  return new Promise((resolve, reject) => {
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      reject(error);
    });
  });
}

// Test execution
async function runTest() {
  try {
    // 1. Login both users
    console.log("Logging in users...");
    const auth1 = await loginUser(testUser1);
    const auth2 = await loginUser(testUser2);
    userToken1 = auth1.token;
    userToken2 = auth2.token;

    const user1Id = auth1.user.id;
    const user2Id = auth2.user.id;

    // 2. Connect sockets
    console.log("Connecting sockets...");
    socket1 = await connectSocket(userToken1);
    socket2 = await connectSocket(userToken2);

    // 3. Setup message listeners
    socket2.on("receiveMessage", (message) => {
      console.log("User 2 received message:", message);
    });

    // 4. Join rooms with actual user IDs
    socket1.emit("join", user1Id);
    socket2.emit("join", user2Id);

    // 5. Send test message with actual user ID
    console.log("Sending test message...");
    socket1.emit("sendMessage", {
      to: user2Id,
      text: "Hello from User 1!",
    });

    // Wait for message processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 6. Test HTTP endpoints with actual user ID
    console.log("Testing HTTP endpoints...");
    const headers = { Authorization: `Bearer ${userToken1}` };

    const msgResponse = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        to: user2Id,
        text: "Hello via HTTP!",
      },
      { headers }
    );

    const convoResponse = await axios.get(`${BASE_URL}/api/chat/${user2Id}`, {
      headers,
    });

    console.log("Message sent:", msgResponse.data);
    console.log("Conversation:", convoResponse.data);
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    // Cleanup
    if (socket1) socket1.disconnect();
    if (socket2) socket2.disconnect();
  }
}

if (process.env.NODE_ENV === "production") {
  console.log("Chat tests are disabled in production");
  process.exit(0);
}

console.log("Starting chat test...");
runTest().catch(console.error);
