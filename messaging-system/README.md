# Messaging System for Supabase Integration

A real-time messaging system designed to integrate with your existing Supabase authentication.

## Features

- **No Authentication Required**: Works with your existing Supabase auth
- **Real-time Messaging**: Send and receive messages instantly using Socket.io
- **User Management**: View all users and their online status
- **Message History**: Persistent message storage in MongoDB
- **Typing Indicators**: See when someone is typing
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Backend
- Node.js & Express.js
- Socket.io for real-time communication
- MongoDB with Mongoose
- Simple user ID validation (no JWT)

### Frontend
- React.js component ready for integration
- Socket.io-client
- Axios for API calls
- CSS3 for styling

## Installation

### Backend Setup

1. Navigate to the project root directory:
```bash
cd messaging-system
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/messaging-app
```

4. Start the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Integration

1. Copy the `MessagingSystem` component to your Supabase app:
   - `client/src/components/MessagingSystem.js`
   - `client/src/components/MessagingSystem.css`

2. Install required dependencies in your Supabase app:
```bash
npm install socket.io-client axios
```

3. Import and use the component in your app:
```javascript
import MessagingSystem from './components/MessagingSystem';

// In your component
<MessagingSystem 
  currentUser={user} 
  onClose={() => setShowMessaging(false)} 
/>
```

## API Endpoints

### Users
- `POST /api/users` - Create or update user (call when user logs in)
- `GET /api/users` - Get all users (requires user-id header)
- `PUT /api/users/status` - Update user online status

### Messages
- `GET /api/messages/:receiverId` - Get messages between users
- `POST /api/messages` - Send a new message
- `PUT /api/messages/read/:senderId` - Mark messages as read

## Integration Steps

1. **User Registration**: When a user logs in via Supabase, call the `/api/users` endpoint to register them in the messaging system.

2. **Headers**: Include the Supabase user ID in the `user-id` header for all API calls.

3. **Component Usage**: Use the `MessagingSystem` component in your app, passing the current Supabase user.

## Database Schema

### User Schema
```javascript
{
  userId: String (required, unique), // Supabase user ID
  username: String (required),
  email: String (required),
  avatar: String,
  online: Boolean (default: false),
  lastSeen: Date (default: Date.now)
}
```

### Message Schema
```javascript
{
  senderId: String (required), // Supabase user ID
  receiverId: String (required), // Supabase user ID
  content: String (required),
  timestamp: Date (default: Date.now),
  read: Boolean (default: false),
  messageType: String (enum: ['text', 'image', 'file'], default: 'text')
}
```

## Socket Events

### Client to Server
- `join` - Join user's personal room
- `typing` - Send typing indicator

### Server to Client
- `newMessage` - Receive new message
- `userTyping` - Receive typing indicator

## Example Integration

```javascript
// In your Supabase app
import MessagingSystem from './components/MessagingSystem';

function MyApp() {
  const [user, setUser] = useState(null);
  const [showMessaging, setShowMessaging] = useState(false);

  // Your existing Supabase auth logic...

  return (
    <div>
      {/* Your existing app content */}
      
      {showMessaging && user && (
        <MessagingSystem 
          currentUser={user} 
          onClose={() => setShowMessaging(false)} 
        />
      )}
    </div>
  );
}
```

## Development

### Running in Development Mode

1. Start MongoDB service
2. Run backend: `npm run dev` (from root directory)
3. Integrate the React component into your Supabase app

### Production Deployment

1. Set production environment variables
2. Deploy backend to your preferred hosting service
3. Build and deploy your Supabase app with the messaging component

## Security Considerations

- The system uses simple user ID validation
- You can enhance security by validating Supabase tokens on the backend
- Use HTTPS in production
- Implement rate limiting
- Add input validation and sanitization

## Customization

The messaging system is designed to be easily customizable:

- Modify the UI styling in `MessagingSystem.css`
- Add new message types (images, files) by extending the message schema
- Add features like message reactions, replies, etc.
- Integrate with your existing user management system

## License

This project is open source and available under the MIT License.