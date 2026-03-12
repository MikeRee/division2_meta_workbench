import React, { useState } from 'react';
import ChatWindow from './ChatWindow';
import './FloatingChat.css';

function FloatingChat() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Floating chat icon */}
      <button 
        className="floating-chat-icon"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Chat"
      >
        💬
      </button>

      {/* Expanded chat window */}
      {isExpanded && (
        <div className="floating-chat-overlay" onClick={() => setIsExpanded(false)}>
          <div 
            className="floating-chat-window"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="floating-chat-header">
              <button 
                className="floating-chat-close"
                onClick={() => setIsExpanded(false)}
              >
                ✕
              </button>
            </div>
            <ChatWindow />
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingChat;
