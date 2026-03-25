import React, { useState, useEffect, useRef, JSX } from 'react';
import './ChatWindow.css';
import useBuildStore from '../stores/useBuildStore';
import Build from '../models/Build';
import LlmBuild from '../models/LlmBuild';
import { getBasePath } from '../utils/basePath';
import ModelPickerModal from './ModelPickerModal';

interface OpenRouterModel {
  id: string;
  name: string;
  promptPrice: string;
  completionPrice: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelApplied?: boolean; // Track if a model was applied from this message
  modelJson?: string; // Store the JSON model that was applied
  inContext?: boolean; // Whether this message is included in LLM context
}

interface Prompts {
  system: string;
  query: string;
  seasonal: string;
  existing: string;
}

function ChatWindow() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('openRouterModel') || 'google/gemini-flash-1.5';
  });
  const [tempApiKey, setTempApiKey] = useState('');
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>(() => {
    const cached = sessionStorage.getItem('openRouterModelsCache');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Load messages from localStorage on initialization
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        // Convert timestamp strings back to Date objects, default inContext to true
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          inContext: msg.inContext !== undefined ? msg.inContext : true,
        }));
      } catch (error) {
        console.error('Failed to load chat messages:', error);
        return [];
      }
    }
    return [];
  });
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [llmStatus, setLlmStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const jsonViewerRef = useRef<HTMLPreElement>(null);

  // Checkbox states
  const [includeBuild, setIncludeBuild] = useState(() => {
    const saved = localStorage.getItem('chatIncludeBuild');
    return saved !== null ? saved === 'true' : false;
  });
  const [includeSeasonalModifiers, setIncludeSeasonalModifiers] = useState(() => {
    const saved = localStorage.getItem('chatIncludeModifiers');
    return saved !== null ? saved === 'true' : false;
  });
  const [seasonalModifierText, setSeasonalModifierText] = useState('');
  const [showSeasonalInput, setShowSeasonalInput] = useState(false);

  // JSON viewer state
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [viewingJson, setViewingJson] = useState<string>('');

  // Prompts state
  const [prompts, setPrompts] = useState<Prompts>({
    system: '',
    query: '',
    seasonal: '',
    existing: '',
  });
  const [tempPrompts, setTempPrompts] = useState<Prompts>({
    system: '',
    query: '',
    seasonal: '',
    existing: '',
  });
  const [editingPrompt, setEditingPrompt] = useState<keyof Prompts | null>(null);
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [jsonEditorValue, setJsonEditorValue] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('openRouterApiKey');
    if (savedKey) {
      setOpenRouterApiKey(savedKey);
      // Only fetch if no session-cached models
      if (availableModels.length === 0) {
        fetchAvailableModels(savedKey);
      }
    }

    // Load prompts from file and localStorage
    const loadPrompts = async () => {
      try {
        const response = await fetch(`${getBasePath()}/clean/prompts.json`);
        if (response.ok) {
          const defaultPrompts = await response.json();

          // Load saved prompts from localStorage or use defaults
          const savedPrompts: Prompts = {
            system: localStorage.getItem('openRouterPrompt_system') || defaultPrompts.system || '',
            query: localStorage.getItem('openRouterPrompt_query') || defaultPrompts.query || '',
            seasonal:
              localStorage.getItem('openRouterPrompt_seasonal') || defaultPrompts.seasonal || '',
            existing:
              localStorage.getItem('openRouterPrompt_existing') || defaultPrompts.existing || '',
          };

          setPrompts(savedPrompts);
          setTempPrompts(savedPrompts);
        }
      } catch (error) {
        console.error('Failed to load prompts:', error);
      }
    };

    loadPrompts();
  }, []);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const maxHeight = lineHeight * 7;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  const fetchAvailableModels = async (apiKey: string) => {
    if (!apiKey) return;

    setIsLoadingModels(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');

      if (response.ok) {
        const data = await response.json();
        const models: OpenRouterModel[] = data.data
          .map((model: any) => {
            const promptPrice = parseFloat(model.pricing?.prompt || '0') * 1_000_000;
            const completionPrice = parseFloat(model.pricing?.completion || '0') * 1_000_000;
            return {
              id: model.id,
              name: model.name || model.id,
              promptPrice: promptPrice < 0.01 ? 'free' : `$${promptPrice.toFixed(2)}`,
              completionPrice: completionPrice < 0.01 ? 'free' : `$${completionPrice.toFixed(2)}`,
            };
          })
          .sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name));
        setAvailableModels(models);
        sessionStorage.setItem('openRouterModelsCache', JSON.stringify(models));

        // Update selected model if it's not in the list
        if (models.length > 0 && !models.find((m) => m.id === selectedModel)) {
          setSelectedModel(models[0].id);
          localStorage.setItem('openRouterModel', models[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const parseAndApplyModel = (
    responseText: string,
  ): { message: string; modelApplied: boolean; modelJson?: string } => {
    // Check if response contains the two-part format
    const messageMatch = responseText.match(/---MESSAGE---\s*([\s\S]*?)(?=---MODEL---|$)/);
    const modelMatch = responseText.match(/---MODEL---\s*([\s\S]*?)$/);

    if (!messageMatch) {
      return { message: responseText, modelApplied: false };
    }

    const message = messageMatch[1].trim();

    if (!modelMatch) {
      return { message, modelApplied: false };
    }

    // Try to parse and apply the MODEL
    try {
      let modelJson = modelMatch[1].trim();

      // Strip markdown code fences if present
      if (modelJson.startsWith('```')) {
        modelJson = modelJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(modelJson);

      const llmBuild = new LlmBuild({
        primaryWeapon: parsed.primaryWeapon,
        secondaryWeapon: parsed.secondaryWeapon,
        pistol: parsed.pistol,
        mask: parsed.mask,
        chest: parsed.chest,
        holster: parsed.holster,
        backpack: parsed.backpack,
        gloves: parsed.gloves,
        kneepads: parsed.kneepads,
      });

      const updates = Build.fromLlm(llmBuild);
      useBuildStore.getState().updateCurrentBuild(updates);

      return { message, modelApplied: true, modelJson };
    } catch (error) {
      console.error('Failed to parse or apply model:', error);
      return { message: message + '\n\n(Failed to apply build model)', modelApplied: false };
    }
  };

  const formatMessage = (text: string): string => {
    // Simple formatting to improve readability without breaking sentences
    let formatted = text;

    // Only add breaks after periods that are followed by TWO spaces or newline and a capital letter
    // This preserves normal sentences but adds spacing between paragraphs
    formatted = formatted.replace(/\.\s\s+([A-Z])/g, '.\n\n$1');
    formatted = formatted.replace(/\.\n([A-Z])/g, '.\n\n$1');

    // Normalize multiple line breaks (3 or more) to double spacing
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    return formatted;
  };

  const renderMarkdown = (text: string): JSX.Element => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentParagraph: string[] = [];
    let inList = false;
    let listItems: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ');
        elements.push(
          <p
            key={elements.length}
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(paragraphText) }}
          />,
        );
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={elements.length}>
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
            ))}
          </ul>,
        );
        listItems = [];
        inList = false;
      }
    };

    const formatInlineMarkdown = (text: string): string => {
      // Bold: **text** or __text__
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

      // Italic: *text* or _text_
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
      text = text.replace(/_(.+?)_/g, '<em>$1</em>');

      // Inline code: `code`
      text = text.replace(/`(.+?)`/g, '<code>$1</code>');

      return text;
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Numbered list item
      if (/^\d+\.\s+/.test(trimmedLine)) {
        flushParagraph();
        if (inList && listItems.length > 0) {
          flushList();
        }
        const content = trimmedLine.replace(/^\d+\.\s+/, '');
        listItems.push(content);
        inList = true;
      }
      // Bullet list item
      else if (/^[\*\-]\s+/.test(trimmedLine)) {
        flushParagraph();
        const content = trimmedLine.replace(/^[\*\-]\s+/, '');
        listItems.push(content);
        inList = true;
      }
      // Empty line
      else if (trimmedLine === '') {
        flushParagraph();
        flushList();
      }
      // Regular text
      else {
        if (inList && !/^[\*\-]\s+/.test(trimmedLine) && !/^\d+\.\s+/.test(trimmedLine)) {
          flushList();
        }
        currentParagraph.push(trimmedLine);
      }
    });

    // Flush any remaining content
    flushParagraph();
    flushList();

    return <>{elements}</>;
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !openRouterApiKey) {
      if (!openRouterApiKey) {
        setLlmStatus('Please configure your OpenRouter API key');
      }
      return;
    }

    // Build the complete prompt
    let userPrompt = prompts.query + inputValue;

    // Add build if checkbox is checked
    if (includeBuild) {
      const currentBuild = useBuildStore.getState().currentBuild;
      const llmBuild = currentBuild.toLlm(); // Convert to LlmBuild format
      userPrompt += '\n\n' + prompts.existing + JSON.stringify(llmBuild, null, 2);
    }

    // Add seasonal modifiers if checkbox is checked
    if (includeSeasonalModifiers && seasonalModifierText.trim()) {
      userPrompt += '\n\n' + prompts.seasonal + seasonalModifierText;
    }

    console.log('=== OPENROUTER REQUEST ===');
    console.log('User Input:', inputValue);
    console.log('Include Build:', includeBuild);
    console.log('Include Seasonal:', includeSeasonalModifiers);
    console.log('Full Prompt Length:', userPrompt.length);
    console.log('Full Prompt:', userPrompt);

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      inContext: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsGenerating(true);
    setLlmStatus('Connecting to OpenRouter...');

    // Add placeholder for assistant message
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        inContext: true,
      },
    ]);

    try {
      console.log('System Prompt:', prompts.system);
      console.log('System Prompt Length:', prompts.system.length);

      // Build conversation history in OpenAI chat format
      const chatMessages: { role: string; content: string }[] = [
        { role: 'system', content: prompts.system },
      ];

      for (const msg of messages) {
        if (msg.inContext === false) continue; // Skip messages excluded from context
        if (msg.role === 'user') {
          chatMessages.push({
            role: 'user',
            content: prompts.query + msg.content,
          });
        } else if (msg.role === 'assistant' && msg.content) {
          chatMessages.push({
            role: 'assistant',
            content: msg.content,
          });
        }
      }

      // Add current message
      chatMessages.push({
        role: 'user',
        content: userPrompt,
      });

      console.log('Conversation History Length:', chatMessages.length);
      console.log('Conversation Contents:', chatMessages);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterApiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: chatMessages,
          temperature: 0.7,
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('=== OPENROUTER ERROR ===');
        console.error('Status:', response.status);
        console.error('Response:', errorText);
        throw new Error(`API error: ${response.status}`);
      }

      setLlmStatus('Generating response...');

      const data = await response.json();

      console.log('=== OPENROUTER RESPONSE ===');
      console.log('Full Response:', JSON.stringify(data, null, 2));

      const choice = data.choices?.[0];
      if (choice?.message?.content) {
        const text = choice.message.content;
        console.log('Extracted Text Length:', text.length);
        console.log('Extracted Text:', text);

        // Parse the response and apply model if present
        const { message, modelApplied, modelJson } = parseAndApplyModel(text);

        console.log('=== PARSED RESPONSE ===');
        console.log('Message:', message);
        console.log('Model Applied:', modelApplied);

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role === 'assistant') {
            lastMessage.content = message;
            lastMessage.modelApplied = modelApplied;
            lastMessage.modelJson = modelJson;
          }
          return [...newMessages];
        });

        if (modelApplied) {
          setLlmStatus('Build updated successfully!');
          setTimeout(() => setLlmStatus(''), 2000);
        }
      } else {
        throw new Error('No response content from model');
      }

      setLlmStatus('');
    } catch (error) {
      console.error('=== OPENROUTER ERROR ===');
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
      setLlmStatus(`Error: ${errorMessage}`);

      setMessages((prev) => {
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSaveConfig = () => {
    localStorage.setItem('openRouterApiKey', tempApiKey);
    setOpenRouterApiKey(tempApiKey);
    fetchAvailableModels(tempApiKey);

    // Save prompts
    Object.entries(tempPrompts).forEach(([key, value]) => {
      localStorage.setItem(`openRouterPrompt_${key}`, value);
    });
    setPrompts(tempPrompts);

    setIsConfigOpen(false);
  };

  const handleOpenConfig = () => {
    setTempApiKey(openRouterApiKey);
    setTempPrompts(prompts);
    setIsConfigOpen(true);
  };

  const handleEditPrompt = (key: keyof Prompts) => {
    setEditingPrompt(key);
  };

  const handleSavePrompt = () => {
    setEditingPrompt(null);
  };

  const handleCancelPromptEdit = () => {
    setTempPrompts(prompts);
    setEditingPrompt(null);
  };

  const handlePromptChange = (key: keyof Prompts, value: string) => {
    setTempPrompts((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getPromptLabel = (key: keyof Prompts): string => {
    const labels: Record<keyof Prompts, string> = {
      system: 'System Prompt',
      query: 'Query Template',
      seasonal: 'Seasonal Template',
      existing: 'Existing Build Template',
    };
    return labels[key];
  };

  const handleOpenJsonEditor = () => {
    setJsonEditorOpen(true);
    setJsonEditorValue(JSON.stringify(tempPrompts, null, 2));
  };

  const handleSaveJsonEditor = () => {
    try {
      const parsed = JSON.parse(jsonEditorValue);

      // Validate that all required keys exist
      const requiredKeys: Array<keyof Prompts> = ['system', 'query', 'seasonal', 'existing'];
      const missingKeys = requiredKeys.filter((key) => !(key in parsed));

      if (missingKeys.length > 0) {
        alert(`Missing required keys: ${missingKeys.join(', ')}`);
        return;
      }

      // Update tempPrompts with parsed values
      setTempPrompts({
        system: parsed.system || '',
        query: parsed.query || '',
        seasonal: parsed.seasonal || '',
        existing: parsed.existing || '',
      });

      setJsonEditorOpen(false);
    } catch (error) {
      alert('Invalid JSON format. Please check your syntax.');
    }
  };

  const handleCancelJsonEditor = () => {
    setJsonEditorOpen(false);
    setJsonEditorValue('');
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h2>Chat</h2>
        <div className="chat-header-actions">
          {messages.length > 0 && (
            <button
              className="clear-chat-button"
              onClick={() => {
                if (confirm('Clear all chat messages?')) {
                  setMessages([]);
                  localStorage.removeItem('chatMessages');
                }
              }}
              title="Clear chat history"
            >
              🗑️
            </button>
          )}
          <button
            className="config-button"
            onClick={handleOpenConfig}
            title="Configure OpenRouter API"
          >
            ⚙️
          </button>
        </div>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            {openRouterApiKey
              ? 'Start a conversation...'
              : 'Configure your OpenRouter API key to start chatting'}
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role}${message.inContext === false ? ' excluded' : ''}`}
            >
              <div className="message-role">
                <label
                  className="context-toggle"
                  title={
                    message.inContext === false ? 'Excluded from context' : 'Included in context'
                  }
                >
                  <input
                    type="checkbox"
                    checked={message.inContext !== false}
                    onChange={() => {
                      setMessages((prev) => {
                        const updated = [...prev];
                        updated[index] = {
                          ...updated[index],
                          inContext: !updated[index].inContext,
                        };
                        return updated;
                      });
                    }}
                  />
                </label>
                {message.role === 'user' ? 'You' : 'Assistant'}
                {message.modelApplied && message.modelJson && (
                  <span
                    className="model-applied-badge clickable"
                    onClick={() => {
                      setViewingJson(message.modelJson || '');
                      setShowJsonViewer(true);
                    }}
                    title="Click to view JSON model"
                  >
                    ✓ Build Updated
                  </span>
                )}
              </div>
              <div className="message-content">{renderMarkdown(message.content)}</div>
            </div>
          ))
        )}
        {llmStatus && <div className="llm-status">{llmStatus}</div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <div className="chat-controls-row">
          <button
            className="model-selector-button"
            onClick={() => setIsModelPickerOpen(true)}
            disabled={isLoadingModels || availableModels.length === 0 || isGenerating}
            title={selectedModel}
          >
            {isLoadingModels
              ? 'Loading...'
              : availableModels.find((m) => m.id === selectedModel)?.name || selectedModel}
          </button>
          <label className="chat-checkbox">
            <input
              type="checkbox"
              checked={includeBuild}
              onChange={(e) => {
                setIncludeBuild(e.target.checked);
                localStorage.setItem('chatIncludeBuild', String(e.target.checked));
              }}
            />
            Build
          </label>
          <label className="chat-checkbox">
            <input
              type="checkbox"
              checked={includeSeasonalModifiers}
              onChange={(e) => {
                setIncludeSeasonalModifiers(e.target.checked);
                localStorage.setItem('chatIncludeModifiers', String(e.target.checked));
              }}
            />
            <span
              className="seasonal-link"
              onClick={(e) => {
                e.preventDefault();
                setShowSeasonalInput(!showSeasonalInput);
              }}
            >
              Modifiers
            </span>
          </label>
        </div>
        {showSeasonalInput && (
          <div className="seasonal-input-container">
            <textarea
              className="seasonal-textarea"
              placeholder="Explain the seasonal modifier..."
              value={seasonalModifierText}
              onChange={(e) => setSeasonalModifierText(e.target.value)}
            />
          </div>
        )}
        <div className="chat-input">
          <textarea
            ref={inputRef}
            className="chat-input-textarea"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              autoResize(e.target);
            }}
            onKeyPress={handleKeyPress}
            disabled={isGenerating}
            rows={1}
          />
        </div>
      </div>

      {isConfigOpen && (
        <div className="overlay-backdrop" onClick={() => setIsConfigOpen(false)}>
          <div className="overlay-content config-overlay" onClick={(e) => e.stopPropagation()}>
            <h2>OpenRouter Configuration</h2>
            <div className="config-field">
              <label htmlFor="openRouterApiKey">OpenRouter API Key</label>
              <input
                id="openRouterApiKey"
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="Enter your OpenRouter API Key"
              />
            </div>

            <div className="config-section">
              <div className="section-header">
                <h3>Prompts</h3>
                <button className="json-link" onClick={handleOpenJsonEditor}>
                  json
                </button>
              </div>
              <div className="prompts-list">
                {(Object.keys(prompts) as Array<keyof Prompts>).map((key) => (
                  <div key={key} className="prompt-item">
                    <div className="prompt-header">
                      <span className="prompt-label">{getPromptLabel(key)}</span>
                      <button className="prompt-edit-btn" onClick={() => handleEditPrompt(key)}>
                        ✏️ Edit
                      </button>
                    </div>
                    <div className="prompt-preview">
                      {tempPrompts[key]
                        ? tempPrompts[key].substring(0, 100) +
                          (tempPrompts[key].length > 100 ? '...' : '')
                        : 'Not set'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overlay-actions">
              <button onClick={handleSaveConfig}>Save</button>
              <button onClick={() => setIsConfigOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingPrompt && (
        <div className="overlay-backdrop" onClick={handleCancelPromptEdit}>
          <div
            className="overlay-content prompt-editor-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Edit {getPromptLabel(editingPrompt)}</h2>
            <textarea
              className="prompt-textarea"
              value={tempPrompts[editingPrompt]}
              onChange={(e) => handlePromptChange(editingPrompt, e.target.value)}
              placeholder={`Enter ${getPromptLabel(editingPrompt).toLowerCase()}...`}
              autoFocus
            />
            <div className="overlay-actions">
              <button onClick={handleSavePrompt}>Done</button>
              <button onClick={handleCancelPromptEdit}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {jsonEditorOpen && (
        <div className="overlay-backdrop" onClick={handleCancelJsonEditor}>
          <div
            className="overlay-content prompt-editor-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Edit Prompts (JSON)</h2>
            <textarea
              className="prompt-textarea json-editor"
              value={jsonEditorValue}
              onChange={(e) => setJsonEditorValue(e.target.value)}
              placeholder="Enter prompts in JSON format..."
              autoFocus
            />
            <div className="overlay-actions">
              <button onClick={handleSaveJsonEditor}>Save</button>
              <button onClick={handleCancelJsonEditor}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showJsonViewer && (
        <div className="overlay-backdrop" onClick={() => setShowJsonViewer(false)}>
          <div
            className="overlay-content prompt-editor-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Applied Build Model (JSON)</h2>
            <textarea
              className="prompt-textarea json-viewer"
              value={viewingJson}
              onChange={(e) => setViewingJson(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
            <div className="overlay-actions">
              <button
                onClick={() => {
                  try {
                    // Parse and validate JSON
                    const parsed = JSON.parse(viewingJson);

                    // Use the same parseAndApplyModel logic by wrapping in MODEL format
                    const wrappedJson = `---MESSAGE---\nBuild applied from JSON viewer\n\n---MODEL---\n${viewingJson}`;
                    const { modelApplied } = parseAndApplyModel(wrappedJson);

                    if (modelApplied) {
                      setLlmStatus('Build applied successfully!');
                      setTimeout(() => setLlmStatus(''), 2000);
                      setShowJsonViewer(false);
                    } else {
                      alert('Failed to apply build. Check console for errors.');
                    }
                  } catch (error) {
                    alert('Invalid JSON format. Please check your syntax.');
                    console.error('JSON parse error:', error);
                  }
                }}
              >
                Apply
              </button>
              <button onClick={() => setShowJsonViewer(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <ModelPickerModal
        isOpen={isModelPickerOpen}
        onClose={() => setIsModelPickerOpen(false)}
        models={availableModels}
        selectedModelId={selectedModel}
        onSelectModel={(modelId) => {
          setSelectedModel(modelId);
          localStorage.setItem('openRouterModel', modelId);
        }}
      />
    </div>
  );
}

export default ChatWindow;
