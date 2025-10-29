const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/messaging-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema (simplified - you'll connect this to your Supabase users)
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Supabase user ID
  username: { type: String, required: true },
  email: { type: String, required: true },
  avatar: { type: String, default: '' },
  online: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
});

// Message Schema
const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true }, // Supabase user ID
  receiverId: { type: String, required: true }, // Supabase user ID
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  messageType: { type: String, enum: ['text', 'image', 'file'], default: 'text' }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Middleware to validate user ID (you can customize this for your Supabase integration)
const validateUserId = (req, res, next) => {
  const userId = req.headers['user-id'];
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  req.userId = userId;
  next();
};

// Routes

// Create or update user (call this when user logs in via Supabase)
app.post('/api/users', async (req, res) => {
  try {
    const { userId, username, email, avatar } = req.body;
    
    const user = await User.findOneAndUpdate(
      { userId },
      { 
        userId, 
        username, 
        email, 
        avatar: avatar || '',
        online: true,
        lastSeen: new Date()
      },
      { upsert: true, new: true }
    );

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users
app.get('/api/users', validateUserId, async (req, res) => {
  try {
    const users = await User.find({ userId: { $ne: req.userId } })
      .sort({ online: -1, lastSeen: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get messages between two users
app.get('/api/messages/:receiverId', validateUserId, async (req, res) => {
  try {
    const { receiverId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: req.userId, receiverId: receiverId },
        { senderId: receiverId, receiverId: req.userId }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send message
app.post('/api/messages', validateUserId, async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text' } = req.body;

    const message = new Message({
      senderId: req.userId,
      receiverId,
      content,
      messageType
    });

    await message.save();

    // Emit to receiver
    io.to(receiverId).emit('newMessage', message);

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark messages as read
app.put('/api/messages/read/:senderId', validateUserId, async (req, res) => {
  try {
    const { senderId } = req.params;
    
    await Message.updateMany(
      { senderId: senderId, receiverId: req.userId, read: false },
      { read: true }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user online status
app.put('/api/users/status', validateUserId, async (req, res) => {
  try {
    const { online } = req.body;
    
    await User.findOneAndUpdate(
      { userId: req.userId },
      { 
        online: online !== undefined ? online : true,
        lastSeen: new Date()
      }
    );

    res.json({ message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(data.receiverId).emit('userTyping', {
      senderId: data.senderId,
      isTyping: data.isTyping
    });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
