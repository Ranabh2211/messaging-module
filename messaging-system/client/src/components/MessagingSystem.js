import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './MessagingSystem.css';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const MessagingSystem = ({ currentUser, onClose }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (currentUser) {
      // Initialize socket connection
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);

      // Register/update user in messaging system
      registerUser();
      fetchUsers();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (socket && currentUser) {
      socket.emit('join', currentUser.id);
      
      socket.on('newMessage', (message) => {
        setMessages(prev => [...prev, message]);
      });

      socket.on('userTyping', (data) => {
        if (data.senderId === selectedUser?.userId) {
          setIsTyping(data.isTyping);
        }
      });

      return () => {
        socket.off('newMessage');
        socket.off('userTyping');
      };
    }
  }, [socket, currentUser, selectedUser]);

  const registerUser = async () => {
    try {
      await axios.post(`${API_URL}/users`, {
        userId: currentUser.id,
        username: currentUser.user_metadata?.username || currentUser.email,
        email: currentUser.email,
        avatar: currentUser.user_metadata?.avatar_url || ''
      });
    } catch (error) {
      console.error('Error registering user:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { 'user-id': currentUser.id }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const selectUser = async (userData) => {
    setSelectedUser(userData);
    
    try {
      const response = await axios.get(`${API_URL}/messages/${userData.userId}`, {
        headers: { 'user-id': currentUser.id }
      });
      setMessages(response.data);
      
      // Mark messages as read
      await axios.put(`${API_URL}/messages/read/${userData.userId}`, {}, {
        headers: { 'user-id': currentUser.id }
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const response = await axios.post(`${API_URL}/messages`, {
        receiverId: selectedUser.userId,
        content: newMessage.trim()
      }, {
        headers: { 'user-id': currentUser.id }
      });
      
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      
      // Stop typing indicator
      if (socket) {
        socket.emit('typing', {
          receiverId: selectedUser.userId,
          senderId: currentUser.id,
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
        receiverId: selectedUser.userId,
        senderId: currentUser.id,
        isTyping: e.target.value.length > 0
      });
    }
  };

  const updateOnlineStatus = async (online) => {
    try {
      await axios.put(`${API_URL}/users/status`, { online }, {
        headers: { 'user-id': currentUser.id }
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  useEffect(() => {
    updateOnlineStatus(true);
    
    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateOnlineStatus(false);
    };
  }, []);

  return (
    <div className="messaging-system">
      <div className="messaging-header">
        <h3>Messages</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <div className="messaging-content">
        <div className="users-sidebar">
          <div className="users-list">
            {users.map(userData => (
              <div
                key={userData.userId}
                className={`user-item ${selectedUser?.userId === userData.userId ? 'selected' : ''}`}
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
                    className={`message ${message.senderId === currentUser.id ? 'sent' : 'received'}`}
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
    </div>
  );
};

export default MessagingSystem;
