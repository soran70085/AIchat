const API_KEY = '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';
const API_URL = 'https://api.openai.com/v1/chat/completions';

const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const chatForm = document.getElementById('chatForm');
const sendBtn = document.getElementById('sendBtn');
const themeToggle = document.getElementById('themeToggle');
const newChatBtn = document.getElementById('newChatBtn');
const chatHistory = document.getElementById('chatHistory');

let conversations = [];
let currentConversationId = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', () => {
    loadConversations();
    setupEventListeners();
    loadTheme();
    createNewConversation();
});

function setupEventListeners() {
    chatForm.addEventListener('submit', handleSendMessage);
    themeToggle.addEventListener('click', toggleTheme);
    newChatBtn.addEventListener('click', createNewConversation);
    userInput.addEventListener('input', autoResizeTextarea);
}

async function handleSendMessage(e) {
    e.preventDefault();
    
    const message = userInput.value.trim();
    if (!message || isLoading) return;
    
    isLoading = true;
    sendBtn.disabled = true;
    userInput.value = '';
    autoResizeTextarea();
    
    addMessageToUI('user', message);
    
    if (currentConversationId) {
        const conversation = conversations.find(c => c.id === currentConversationId);
        if (conversation) {
            conversation.messages.push({ role: 'user', content: message });
        }
    }
    
    try {
        const response = await fetchAIResponse(message);
        addMessageToUI('ai', response);
        
        if (currentConversationId) {
            const conversation = conversations.find(c => c.id === currentConversationId);
            if (conversation) {
                conversation.messages.push({ role: 'assistant', content: response });
            }
        }
        
        saveConversations();
    } catch (error) {
        console.error('Error:', error);
        addMessageToUI('ai', '申し訳ありません。エラーが発生しました。もう一度試してください。');
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

async function fetchAIResponse(userMessage) {
    const conversation = conversations.find(c => c.id === currentConversationId);
    const messages = conversation ? conversation.messages : [];
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message || 'API Error');
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

function addMessageToUI(role, content) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    
    contentEl.innerHTML = formatMessage(content);
    
    messageEl.appendChild(contentEl);
    messagesEl.appendChild(messageEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function formatMessage(text) {
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
    });
    
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createNewConversation() {
    const id = Date.now().toString();
    const conversation = {
        id: id,
        title: '新しいチャット',
        messages: [],
        createdAt: new Date().toISOString()
    };
    
    conversations.unshift(conversation);
    currentConversationId = id;
    
    messagesEl.innerHTML = '';
    saveConversations();
    renderChatHistory();
}

function selectConversation(id) {
    currentConversationId = id;
    messagesEl.innerHTML = '';
    
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
        conversation.messages.forEach(msg => {
            addMessageToUI(msg.role, msg.content);
        });
    }
    
    renderChatHistory();
}

function renderChatHistory() {
    chatHistory.innerHTML = '';
    
    conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = `chat-item ${conv.id === currentConversationId ? 'active' : ''}`;
        
        let title = conv.title;
        if (conv.messages.length > 0) {
            const firstMessage = conv.messages[0].content;
            title = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
        }
        
        item.textContent = title;
        item.addEventListener('click', () => selectConversation(conv.id));
        
        chatHistory.appendChild(item);
    });
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    updateThemeButton();
}

function updateThemeButton() {
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
}

function loadTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateThemeButton();
}

function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
}

function loadConversations() {
    const saved = localStorage.getItem('conversations');
    conversations = saved ? JSON.parse(saved) : [];
    renderChatHistory();
}
