import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set up axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Initialize socket connection
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);

      // Get user info and users list
      fetchUserData();
    }
  }, []);

  useEffect(() => {
    if (socket && user) {
      socket.emit('join', user.id);
      
      socket.on('newMessage', (message) => {
        setMessages(prev => [...prev, message]);
      });

      socket.on('userTyping', (data) => {
        if (data.sender === selectedUser?.id) {
          setIsTyping(data.isTyping);
        }
      });

      return () => {
        socket.off('newMessage');
        socket.off('userTyping');
      };
    }
  }, [socket, user, selectedUser]);

  const fetchUserData = async () => {
    try {
      const [usersResponse] = await Promise.all([
        axios.get(`${API_URL}/users`)
      ]);
      setUsers(usersResponse.data);
      
      // Get user info from token
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ id: payload.userId, username: payload.username });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      fetchUserData();
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const response = await axios.post(`${API_URL}/register`, { username, email, password });
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      fetchUserData();
    } catch (error) {
      alert('Registration failed: ' + (error.response?.data?.message || error.message));
    }
  };

  const selectUser = async (selectedUserData) => {
    setSelectedUser(selectedUserData);
    
    try {
      const response = await axios.get(`${API_URL}/messages/${selectedUserData._id}`);
      setMessages(response.data);
      
      // Mark messages as read
      await axios.put(`${API_URL}/messages/read/${selectedUserData._id}`);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const response = await axios.post(`${API_URL}/messages`, {
        receiver: selectedUser._id,
        content: newMessage.trim()
      });
      
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      
      // Stop typing indicator
      if (socket) {
        socket.emit('typing', {
          receiver: selectedUser._id,
          sender: user.id,
          isTyping: false
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && selectedUser) {
      socket.emit('typing', {
        receiver: selectedUser._id,
        sender: user.id,
        isTyping: e.target.value.length > 0
      });
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setUsers([]);
    setSelectedUser(null);
    setMessages([]);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <input type="email" name="email" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password" required />
            <button type="submit">Login</button>
          </form>
          
          <h2>Register</h2>
          <form onSubmit={handleRegister}>
            <input type="text" name="username" placeholder="Username" required />
            <input type="email" name="email" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password" required />
            <button type="submit">Register</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Welcome, {user.username}</h3>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
        
        <div className="users-list">
          <h4>Users</h4>
          {users.map(userData => (
            <div
              key={userData._id}
              className={`user-item ${selectedUser?._id === userData._id ? 'selected' : ''}`}
              onClick={() => selectUser(userData)}
            >
              <div className="user-avatar">
                {userData.username.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{userData.username}</div>
                <div className={`user-status ${userData.online ? 'online' : 'offline'}`}>
                  {userData.online ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-container">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <div className="chat-user-info">
                <div className="chat-user-avatar">
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="chat-user-name">{selectedUser.username}</div>
                  <div className={`chat-user-status ${selectedUser.online ? 'online' : 'offline'}`}>
                    {selectedUser.online ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
            </div>

            <div className="messages-container">
              {messages.map(message => (
                <div
                  key={message._id}
                  className={`message ${message.sender._id === user.id ? 'sent' : 'received'}`}
                >
                  <div className="message-content">{message.content}</div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="typing-indicator">
                  <span>{selectedUser.username} is typing...</span>
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} className="message-form">
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder="Type a message..."
                className="message-input"
              />
              <button type="submit" className="send-button">Send</button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <h3>Select a user to start chatting</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
