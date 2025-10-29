// Example usage in your Supabase app
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import MessagingSystem from './components/MessagingSystem';

const supabase = createClient('your-supabase-url', 'your-supabase-key');

function App() {
  const [user, setUser] = useState(null);
  const [showMessaging, setShowMessaging] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    });
    if (error) console.error('Error:', error);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error:', error);
  };

  return (
    <div className="app">
      <div className="header">
        <h1>My App</h1>
        {user ? (
          <div className="user-info">
            <span>Welcome, {user.email}</span>
            <button onClick={() => setShowMessaging(true)}>Messages</button>
            <button onClick={signOut}>Sign Out</button>
          </div>
        ) : (
          <button onClick={signIn}>Sign In</button>
        )}
      </div>

      <div className="main-content">
        <h2>Your App Content</h2>
        <p>This is your existing app content...</p>
      </div>

      {showMessaging && user && (
        <MessagingSystem 
          currentUser={user} 
          onClose={() => setShowMessaging(false)} 
        />
      )}
    </div>
  );
}

export default App;
