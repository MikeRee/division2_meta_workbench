import React, { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';

interface GeminiModel {
  name: string;
  displayName: string;
  supportedGenerationMethods: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function ChatWindow() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('models/gemini-1.5-flash');
  const [tempApiKey, setTempApiKey] = useState('');
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [llmStatus, setLlmStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) {
      setGeminiApiKey(savedKey);
      fetchAvailableModels(savedKey);
    }
    const savedModel = localStorage.getItem('geminiModel');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchAvailableModels = async (apiKey: string) => {
    if (!apiKey) return;
    
    setIsLoadingModels(true);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const models = data.models
          .filter((model: any) => 
            model.supportedGenerationMethods?.includes('generateContent')
          )
          .map((model: any) => ({
            name: model.name, // Keep full name like "models/gemini-1.5-flash"
            displayName: model.displayName || model.name.replace('models/', ''),
            supportedGenerationMethods: model.supportedGenerationMethods
          }));
        setAvailableModels(models);
        
        // Update selected model if it's not in the list
        if (models.length > 0 && !models.find((m: any) => m.name === selectedModel)) {
          setSelectedModel(models[0].name);
          localStorage.setItem('geminiModel', models[0].name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !geminiApiKey) {
      if (!geminiApiKey) {
        setLlmStatus('Please configure your Gemini API key');
      }
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    const messageText = inputValue;
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGenerating(true);
    setLlmStatus('Connecting to Gemini...');

    // Add placeholder for assistant message
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }]);

    try {
      // Use non-streaming endpoint for reliability
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/${selectedModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: messageText
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API error: ${response.status}`);
      }

      setLlmStatus('Generating response...');

      const data = await response.json();
      
      // Extract text from the response
      const candidates = data.candidates;
      if (candidates && candidates.length > 0) {
        const content = candidates[0].content;
        if (content && content.parts && content.parts.length > 0) {
          const text = content.parts[0].text;
          if (text) {
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage?.role === 'assistant') {
                lastMessage.content = text;
              }
              return [...newMessages];
            });
          } else {
            throw new Error('No text in response');
          }
        } else {
          throw new Error('No content in response');
        }
      } else {
        throw new Error('No candidates in response');
      }

      setLlmStatus('');
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
      setLlmStatus(`Error: ${errorMessage}`);
      
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.role === 'assistant' && !lastMessage.content) {
          lastMessage.content = `Sorry, I encountered an error: ${errorMessage}. Please check your API key and model selection.`;
        }
        return [...newMessages];
      });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setLlmStatus(''), 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSaveConfig = () => {
    localStorage.setItem('geminiApiKey', tempApiKey);
    setGeminiApiKey(tempApiKey);
    fetchAvailableModels(tempApiKey);
    setIsConfigOpen(false);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    setSelectedModel(model);
    localStorage.setItem('geminiModel', model);
  };

  const handleOpenConfig = () => {
    setTempApiKey(geminiApiKey);
    setIsConfigOpen(true);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h2>Chat</h2>
        <button className="config-button" onClick={handleOpenConfig} title="Configure Gemini API">
          ⚙️
        </button>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            {geminiApiKey ? 'Start a conversation...' : 'Configure your Gemini API key to start chatting'}
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-role">{message.role === 'user' ? 'You' : 'Gemini'}</div>
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}
        {llmStatus && (
          <div className="llm-status">{llmStatus}</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <select 
          className="model-selector" 
          value={selectedModel} 
          onChange={handleModelChange}
          disabled={isLoadingModels || availableModels.length === 0 || isGenerating}
        >
          {isLoadingModels ? (
            <option>Loading models...</option>
          ) : availableModels.length > 0 ? (
            availableModels.map((model) => (
              <option key={model.name} value={model.name}>
                {model.displayName}
              </option>
            ))
          ) : (
            <>
              <option value="models/gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="models/gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="models/gemini-2.0-flash-exp">Gemini 2.0 Flash (Exp)</option>
            </>
          )}
        </select>
        <div className="chat-input">
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isGenerating}
          />
        </div>
      </div>

      {isConfigOpen && (
        <div className="overlay-backdrop" onClick={() => setIsConfigOpen(false)}>
          <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
            <h2>Gemini Configuration</h2>
            <div className="config-field">
              <label htmlFor="geminiApiKey">Gemini API Key</label>
              <input
                id="geminiApiKey"
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="Enter your Gemini API Key"
              />
            </div>
            <div className="overlay-actions">
              <button onClick={handleSaveConfig}>Save</button>
              <button onClick={() => setIsConfigOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;
