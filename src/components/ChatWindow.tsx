import React, { useState, useEffect, useRef, JSX } from 'react';
import './ChatWindow.css';
import useBuildStore from '../stores/useBuildStore';
import Build from '../models/Build';
import LlmBuild from '../models/LlmBuild';
import { getBasePath } from '../utils/basePath';
import ModelPickerModal from './ModelPickerModal';
import ChatBuildCard from './ChatBuildCard';
import useCleanDataStore from '../stores/useCleanDataStore';
import { useDataFreshnessStore, hashString } from '../stores/useDataFreshnessStore';

interface OpenRouterModel {
  id: string;
  name: string;
  promptPrice: string;
  completionPrice: string;
  promptPriceRaw: number;
  completionPriceRaw: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelApplied?: boolean; // Track if a model was applied from this message
  modelJson?: string; // Store the JSON model that was applied
  inContext?: boolean; // Whether this message is included in LLM context
  buildSnapshot?: any; // Snapshot of the build at the time it was applied
  cost?: { promptTokens: number; completionTokens: number; totalCost: number }; // Cost info for assistant messages
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
  const [includeGameData, setIncludeGameData] = useState(() => {
    const saved = localStorage.getItem('chatIncludeGameData');
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

  // Prompts freshness tracking — compare in-memory prompts against disk file
  const [promptsStale, setPromptsStale] = useState(false);
  const [reloadingPrompts, setReloadingPrompts] = useState(false);
  const diskPromptsRef = useRef<Prompts | null>(null);

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
        const response = await fetch(`${getBasePath()}/clean/prompts.json`, { cache: 'no-store' });
        if (response.ok) {
          const defaultPrompts = await response.json();

          // Store what's on disk for comparison
          diskPromptsRef.current = {
            system: defaultPrompts.system || '',
            query: defaultPrompts.query || '',
            seasonal: defaultPrompts.seasonal || '',
            existing: defaultPrompts.existing || '',
          };

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

          // Check if what we're using differs from what's on disk
          const isDifferent = (Object.keys(diskPromptsRef.current) as Array<keyof Prompts>).some(
            (k) => savedPrompts[k] !== diskPromptsRef.current![k],
          );
          setPromptsStale(isDifferent);
        }
      } catch (error) {
        console.error('Failed to load prompts:', error);
      }
    };

    loadPrompts();
  }, []);

  // Periodically check if prompts.json on disk differs from what we're using
  useEffect(() => {
    const checkPromptsOnDisk = async () => {
      try {
        const response = await fetch(`${getBasePath()}/clean/prompts.json`, { cache: 'no-store' });
        if (!response.ok) return;
        const diskData = await response.json();
        const disk: Prompts = {
          system: diskData.system || '',
          query: diskData.query || '',
          seasonal: diskData.seasonal || '',
          existing: diskData.existing || '',
        };
        diskPromptsRef.current = disk;

        setPrompts((current) => {
          const isDifferent = (Object.keys(disk) as Array<keyof Prompts>).some(
            (k) => current[k] !== disk[k],
          );
          setPromptsStale(isDifferent);
          return current;
        });
      } catch {
        // skip
      }
    };

    const interval = setInterval(checkPromptsOnDisk, 5 * 60 * 1000);
    return () => clearInterval(interval);
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
              promptPriceRaw: promptPrice,
              completionPriceRaw: completionPrice,
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
  ): { message: string; modelApplied: boolean; modelJson?: string; buildSnapshot?: any } => {
    // Try structured JSON format first (from response_format)
    let message: string;
    let modelObj: any = null;
    let modelJson: string | undefined;

    try {
      const structured = JSON.parse(responseText);
      if (structured.message !== undefined) {
        message = structured.message;
        modelObj = structured.model;
        if (modelObj) modelJson = JSON.stringify(modelObj, null, 2);
      } else {
        // Valid JSON but not our schema — treat as raw text
        message = responseText;
      }
    } catch {
      // Not JSON — fall back to ---MESSAGE---/---MODEL--- markers
      const messageMatch = responseText.match(/---MESSAGE---\s*([\s\S]*?)(?=---MODEL---|$)/);
      const modelMatch = responseText.match(/---MODEL---\s*([\s\S]*?)$/);

      if (!messageMatch) {
        return { message: responseText, modelApplied: false };
      }

      message = messageMatch[1].trim();

      if (modelMatch) {
        try {
          let raw = modelMatch[1].trim();
          if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }
          modelObj = JSON.parse(raw);
          modelJson = raw;
        } catch (err) {
          console.error('Failed to parse model JSON from markers:', err);
          return { message: message + '\n\n(Failed to apply build model)', modelApplied: false };
        }
      }
    }

    if (!modelObj) {
      return { message, modelApplied: false };
    }

    // Build a snapshot for the ChatBuildCard without auto-applying to any slot.
    // The user can choose which slot to send it to via the "Send To" buttons.
    try {
      const llmBuild = new LlmBuild({
        primaryWeapon: modelObj.primaryWeapon,
        secondaryWeapon: modelObj.secondaryWeapon,
        pistol: modelObj.pistol,
        mask: modelObj.mask,
        chest: modelObj.chest,
        holster: modelObj.holster,
        backpack: modelObj.backpack,
        gloves: modelObj.gloves,
        kneepads: modelObj.kneepads,
      });

      const reconstructed = Build.fromLlm(llmBuild);
      const buildSnapshot = {
        mask: reconstructed.mask ?? null,
        chest: reconstructed.chest ?? null,
        holster: reconstructed.holster ?? null,
        backpack: reconstructed.backpack ?? null,
        gloves: reconstructed.gloves ?? null,
        kneepads: reconstructed.kneepads ?? null,
        primaryWeapon: reconstructed.primaryWeapon ?? null,
        secondaryWeapon: reconstructed.secondaryWeapon ?? null,
        pistol: reconstructed.pistol ?? null,
      };

      return { message, modelApplied: true, modelJson, buildSnapshot };
    } catch (error) {
      console.error('Failed to parse build model:', error);
      return { message: message + '\n\n(Failed to parse build model)', modelApplied: false };
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

    // Add game data if checkbox is checked
    if (includeGameData) {
      const { text } = useCleanDataStore.getState().getPromptDataSummary();
      if (text) {
        userPrompt += '\n\nAVAILABLE GAME DATA:\n' + text;
      }
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
          temperature: 0.1,
          max_tokens: 8192,
          provider: { require_parameters: true },
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'chat_response',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  model: {
                    description: 'The Division 2 build data object',
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          specialization: { type: 'string' },
                          primaryWeapon: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              primaryAttrib1: { type: 'string' },
                              primaryAttrib2: { type: 'string' },
                              secondaryAttrib: { type: 'string' },
                              talent: { type: 'string' },
                              attachments: { type: 'object' },
                            },
                            required: ['name', 'primaryAttrib1', 'attachments'],
                            additionalProperties: false,
                          },
                          secondaryWeapon: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              primaryAttrib1: { type: 'string' },
                              primaryAttrib2: { type: 'string' },
                              secondaryAttrib: { type: 'string' },
                              talent: { type: 'string' },
                              attachments: { type: 'object' },
                            },
                            required: ['name', 'primaryAttrib1', 'attachments'],
                            additionalProperties: false,
                          },
                          pistol: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              primaryAttrib1: { type: 'string' },
                              talent: { type: 'string' },
                              attachments: { type: 'object' },
                            },
                            required: ['name', 'primaryAttrib1', 'attachments'],
                            additionalProperties: false,
                          },
                          mask: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              core: { type: 'string' },
                              gearAttrib1: { type: 'string' },
                              gearAttrib2: { type: 'string' },
                              gearMods: { type: 'array', items: { type: 'string' } },
                            },
                            required: ['name', 'core', 'gearAttrib1'],
                            additionalProperties: false,
                          },
                          chest: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              core: { type: 'string' },
                              gearAttrib1: { type: 'string' },
                              gearAttrib2: { type: 'string' },
                              talent: { type: 'string' },
                              gearMods: { type: 'array', items: { type: 'string' } },
                            },
                            required: ['name', 'core', 'gearAttrib1', 'talent'],
                            additionalProperties: false,
                          },
                          holster: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              core: { type: 'string' },
                              gearAttrib1: { type: 'string' },
                              gearAttrib2: { type: 'string' },
                            },
                            required: ['name', 'core', 'gearAttrib1'],
                            additionalProperties: false,
                          },
                          backpack: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              core: { type: 'string' },
                              gearAttrib1: { type: 'string' },
                              gearAttrib2: { type: 'string' },
                              talent: { type: 'string' },
                              gearMods: { type: 'array', items: { type: 'string' } },
                            },
                            required: ['name', 'core', 'gearAttrib1', 'talent'],
                            additionalProperties: false,
                          },
                          gloves: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              core: { type: 'string' },
                              gearAttrib1: { type: 'string' },
                              gearAttrib2: { type: 'string' },
                            },
                            required: ['name', 'core', 'gearAttrib1'],
                            additionalProperties: false,
                          },
                          kneepads: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              core: { type: 'string' },
                              gearAttrib1: { type: 'string' },
                              gearAttrib2: { type: 'string' },
                            },
                            required: ['name', 'core', 'gearAttrib1'],
                            additionalProperties: false,
                          },
                        },
                        required: [
                          'specialization',
                          'primaryWeapon',
                          'secondaryWeapon',
                          'pistol',
                          'mask',
                          'chest',
                          'holster',
                          'backpack',
                          'gloves',
                          'kneepads',
                        ],
                        additionalProperties: false,
                      },
                      { type: 'null' },
                    ],
                  },
                  message: {
                    type: 'string',
                    description: 'Full Markdown response to the user',
                  },
                },
                required: ['model', 'message'],
                additionalProperties: false,
              },
            },
          },
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
        const { message, modelApplied, modelJson, buildSnapshot } = parseAndApplyModel(text);

        // Calculate cost from usage data
        let cost: ChatMessage['cost'] = undefined;
        const usage = data.usage;
        const promptTokens = usage?.prompt_tokens ?? 0;
        const completionTokens = usage?.completion_tokens ?? 0;
        if (promptTokens || completionTokens) {
          const currentModel = availableModels.find((m) => m.id === selectedModel);
          const promptPricePer1M = currentModel?.promptPriceRaw ?? 0;
          const completionPricePer1M = currentModel?.completionPriceRaw ?? 0;
          const promptCost = (promptTokens / 1_000_000) * promptPricePer1M;
          const completionCost = (completionTokens / 1_000_000) * completionPricePer1M;
          cost = {
            promptTokens,
            completionTokens,
            totalCost: promptCost + completionCost,
          };
        }

        console.log('=== PARSED RESPONSE ===');
        console.log('Message:', message);
        console.log('Model Applied:', modelApplied);
        console.log('Cost:', cost);

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role === 'assistant') {
            lastMessage.content = message;
            lastMessage.modelApplied = modelApplied;
            lastMessage.modelJson = modelJson;
            lastMessage.buildSnapshot = buildSnapshot;
            lastMessage.cost = cost;
          }
          return [...newMessages];
        });

        if (modelApplied) {
          setLlmStatus('Build ready — use Send To to apply it');
          setTimeout(() => setLlmStatus(''), 3000);
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

    // Re-check if saved prompts now differ from disk
    if (diskPromptsRef.current) {
      const isDifferent = (Object.keys(diskPromptsRef.current) as Array<keyof Prompts>).some(
        (k) => tempPrompts[k] !== diskPromptsRef.current![k],
      );
      setPromptsStale(isDifferent);
    }

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

  const handleReloadPrompts = async () => {
    setReloadingPrompts(true);
    try {
      const response = await fetch(`${getBasePath()}/clean/prompts.json`, { cache: 'no-store' });
      if (response.ok) {
        const text = await response.text();
        const defaultPrompts = JSON.parse(text);

        // Clear any localStorage overrides so we pick up the new defaults
        const keys: Array<keyof Prompts> = ['system', 'query', 'seasonal', 'existing'];
        keys.forEach((k) => localStorage.removeItem(`openRouterPrompt_${k}`));

        const fresh: Prompts = {
          system: defaultPrompts.system || '',
          query: defaultPrompts.query || '',
          seasonal: defaultPrompts.seasonal || '',
          existing: defaultPrompts.existing || '',
        };
        setPrompts(fresh);
        setTempPrompts(fresh);
        diskPromptsRef.current = fresh;
        setPromptsStale(false);

        // Also update the freshness store baseline so DivisionDB modal stays in sync
        useDataFreshnessStore.getState().setLoadedHash('prompts', hashString(text));
        useDataFreshnessStore.getState().markFresh('prompts');
      }
    } catch (error) {
      console.error('Failed to reload prompts:', error);
    } finally {
      setReloadingPrompts(false);
    }
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
      {promptsStale && (
        <div className="chat-stale-banner">
          <span>Prompts have changed on disk</span>
          <button onClick={handleReloadPrompts} disabled={reloadingPrompts}>
            {reloadingPrompts ? 'Reloading…' : '↻ Reload'}
          </button>
        </div>
      )}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            {openRouterApiKey ? (
              <div className="onboarding">
                <div className="onboarding-section">
                  <div className="onboarding-heading">Choosing a model</div>
                  <p className="onboarding-text">
                    Initial testing was done against{' '}
                    <span className="highlight">Gemini 3 Flash Preview</span>. Click the model
                    button below to pick a different one. If you find a model that works well, open
                    a GitHub issue with your results so we can track tested models.
                  </p>
                </div>

                <div className="onboarding-section">
                  <div className="onboarding-heading">Chat options</div>
                  <ul className="onboarding-list">
                    <li>
                      <span className="highlight">Add Build</span> — sends your current loadout to
                      the LLM so it can refine or critique what you already have.
                    </li>
                    <li>
                      <span className="highlight">Game Data</span> — includes gear sets, brand sets,
                      talents, and other reference data so the model can make accurate suggestions.
                    </li>
                    <li>
                      <span className="highlight">Modifiers</span> — attach seasonal or event
                      modifier text (click to expand) so the model accounts for active global
                      effects.
                    </li>
                  </ul>
                  <p className="onboarding-text">
                    To change or update the prompts sent to the model, open{' '}
                    <span className="highlight">⚙️ Configuration</span> and edit them under the
                    Prompts section.
                  </p>
                </div>
              </div>
            ) : (
              'Configure your OpenRouter API key to start chatting'
            )}
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
              </div>
              <div className="message-content">{renderMarkdown(message.content)}</div>
              {message.cost && (
                <div className="message-cost">
                  {message.cost.promptTokens.toLocaleString()} in ·{' '}
                  {message.cost.completionTokens.toLocaleString()} out · $
                  {message.cost.totalCost < 0.0001
                    ? message.cost.totalCost.toExponential(2)
                    : message.cost.totalCost.toFixed(4)}
                </div>
              )}
              {message.modelApplied && (
                <ChatBuildCard
                  buildSnapshot={message.buildSnapshot}
                  modelJson={message.modelJson}
                  onViewJson={(json) => {
                    setViewingJson(json);
                    setShowJsonViewer(true);
                  }}
                />
              )}
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
            Add Build
          </label>
          <label className="chat-checkbox">
            <input
              type="checkbox"
              checked={includeGameData}
              onChange={(e) => {
                setIncludeGameData(e.target.checked);
                localStorage.setItem('chatIncludeGameData', String(e.target.checked));
              }}
            />
            Game Data
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
                    // Parse JSON and apply directly to the current build slot
                    const parsed = JSON.parse(viewingJson);
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
                    setLlmStatus('Build applied successfully!');
                    setTimeout(() => setLlmStatus(''), 2000);
                    setShowJsonViewer(false);
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
