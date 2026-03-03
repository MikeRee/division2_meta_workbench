import React from 'react';
import './ChatWindow.css';

function ChatWindow() {
  return (
    <div className="chat-window">
      <h2>Chat</h2>
      <div className="chat-messages">
        {/* Chat messages will appear here */}
      </div>
      <div className="chat-input">
        <input type="text" placeholder="Type a message..." />
      </div>
    </div>
  );
}

export default ChatWindow;
