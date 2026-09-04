import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, type ChatConversation, type ChatMessage } from '@/lib/supabase';
import { mockPatents, suggestedQuestions } from '@/lib/mockPatentData';
import { Send, Sparkles, Plus, MessageSquare, Trash2, Bot, User, Loader2 } from 'lucide-react';

type LocalMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export default function Chatbot() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    if (!user?.id) return;
    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (data && data.length > 0) {
      setConversations(data as ChatConversation[]);
      if (!activeConversation) setActiveConversation(data[0].id);
    } else {
      // Create initial conversation
      const { data: newConv } = await supabase
        .from('chat_conversations')
        .insert({ user_id: user.id, title: 'New Conversation' })
        .select('*')
        .maybeSingle();
      if (newConv) {
        setConversations([newConv as ChatConversation]);
        setActiveConversation(newConv.id);
      }
    }
    setLoadingConversations(false);
  }

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })));
    } else {
      setMessages([]);
    }
  }

  async function createConversation() {
    if (!user?.id) return;
    const { data } = await supabase
      .from('chat_conversations')
      .insert({ user_id: user.id, title: 'New Conversation' })
      .select('*')
      .maybeSingle();
    if (data) {
      setConversations([data as ChatConversation, ...conversations]);
      setActiveConversation(data.id);
    }
  }

  async function deleteConversation(convId: string) {
    await supabase.from('chat_conversations').delete().eq('id', convId);
    const updated = conversations.filter(c => c.id !== convId);
    setConversations(updated);
    if (activeConversation === convId) {
      setActiveConversation(updated[0]?.id || null);
    }
  }

  async function sendMessage(text?: string) {
    const content = text || input.trim();
    if (!content || !activeConversation || !user?.id) return;

    setInput('');
    setLoading(true);

    // Add user message to UI immediately
    const userMsg: LocalMessage = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Save user message to DB
    await supabase.from('chat_messages').insert({
      conversation_id: activeConversation,
      user_id: user.id,
      role: 'user',
      content,
    });

    // Update conversation title if it's the first message
    if (conversations.find(c => c.id === activeConversation)?.title === 'New Conversation') {
      const title = content.slice(0, 40) + (content.length > 40 ? '...' : '');
      await supabase.from('chat_conversations').update({ title, updated_at: new Date().toISOString() }).eq('id', activeConversation);
      setConversations(prev => prev.map(c => c.id === activeConversation ? { ...c, title } : c));
    }

    // Generate AI response — try edge function first, fall back to local
    let aiResponse = '';
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'X-Client-Info': 'patentscope-web',
        },
        body: JSON.stringify({
          message: content,
          conversationId: activeConversation,
          context: {
            patentCount: mockPatents.length,
            categories: [...new Set(mockPatents.map(p => p.category))],
            avgSimilarity: mockPatents.reduce((s, p) => s + p.similarity_score, 0) / mockPatents.length,
          },
        }),
      });

      if (!res.ok) throw new Error(`Edge function returned ${res.status}`);

      const data = await res.json();
      if (!data || typeof data.response !== 'string') {
        throw new Error('Invalid response from server');
      }
      aiResponse = data.response;
    } catch {
      // Fall back to local context-aware response
      aiResponse = generateContextualResponse(content);
    }

    // Ensure a minimum delay for natural feel
    await new Promise(r => setTimeout(r, 400));

    // Add assistant message
    const aiMsg: LocalMessage = {
      id: 'temp-ai-' + Date.now(),
      role: 'assistant',
      content: aiResponse,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, aiMsg]);

    // Save assistant message to DB
    await supabase.from('chat_messages').insert({
      conversation_id: activeConversation,
      user_id: user.id,
      role: 'assistant',
      content: aiResponse,
    });

    setLoading(false);
  }

  function generateContextualResponse(query: string): string {
    const lower = query.toLowerCase();

    // Context-aware responses based on patent data
    if (lower.includes('highest') || lower.includes('similarity')) {
      const sorted = [...mockPatents].sort((a, b) => b.similarity_score - a.similarity_score);
      const top = sorted.slice(0, 5);
      return `Here are the patents with the highest similarity scores:\n\n${top.map((p, i) => `${i + 1}. ${p.title} (${p.patent_number})\n   Similarity: ${p.similarity_score.toFixed(2)} | Citations: ${p.citations_count}\n   Applicant: ${p.applicant}`).join('\n\n')}\n\nThese patents show strong technical overlap and are likely the most relevant references for your analysis.`;
    }

    if (lower.includes('cited') || lower.includes('citation')) {
      const sorted = [...mockPatents].sort((a, b) => b.citations_count - a.citations_count);
      const top = sorted.slice(0, 5);
      return `The most cited patents in your portfolio are:\n\n${top.map((p, i) => `${i + 1}. ${p.title} (${p.patent_number})\n   Citations: ${p.citations_count} | Status: ${p.status}\n   Applicant: ${p.applicant}`).join('\n\n')}\n\nHigh citation counts indicate these patents are foundational references in their respective fields.`;
    }

    if (lower.includes('pending')) {
      const pending = mockPatents.filter(p => p.status === 'pending');
      return `There are ${pending.length} patents currently pending approval:\n\n${pending.map((p, i) => `${i + 1}. ${p.title} (${p.patent_number})\n   Filed: ${p.filing_date} | Applicant: ${p.applicant}\n   Classification: ${p.classification}`).join('\n\n')}\n\nThese patents are under review. Consider monitoring their status for updates.`;
    }

    if (lower.includes('ai') || lower.includes('machine learning')) {
      const aiPatents = mockPatents.filter(p => p.category === 'AI & Machine Learning');
      return `I found ${aiPatents.length} patents related to AI & Machine Learning:\n\n${aiPatents.map((p, i) => `${i + 1}. ${p.title} (${p.patent_number})\n   Similarity: ${p.similarity_score.toFixed(2)} | Citations: ${p.citations_count}\n   Status: ${p.status}`).join('\n\n')}\n\nThis category shows strong innovation activity, particularly in transformer architectures and federated learning approaches.`;
    }

    if (lower.includes('quantum')) {
      const quantum = mockPatents.filter(p => p.category === 'Quantum Computing');
      const ai = mockPatents.filter(p => p.category === 'AI & Machine Learning');
      return `Quantum computing patents show interesting intersections with AI:\n\nQuantum Patents:\n${quantum.map(p => `- ${p.title} (${p.patent_number})`).join('\n')}\n\nThe quantum-AI crossover is primarily seen in optimization algorithms where quantum-enhanced approaches can accelerate ML training pipelines. Patent ${quantum[0]?.patent_number} is linked to AI patents through shared optimization techniques.`;
    }

    if (lower.includes('technology') || lower.includes('innovation') || lower.includes('area')) {
      const categories = [...new Set(mockPatents.map(p => p.category))];
      return `Your patent portfolio spans ${categories.length} technology areas:\n\n${categories.map((cat, i) => {
        const count = mockPatents.filter(p => p.category === cat).length;
        const avgSim = (mockPatents.filter(p => p.category === cat).reduce((s, p) => s + p.similarity_score, 0) / count).toFixed(2);
        return `${i + 1}. ${cat}: ${count} patents (avg similarity: ${avgSim})`;
      }).join('\n')}\n\nAI & Machine Learning leads in volume, while Quantum Computing shows high individual similarity scores.`;
    }

    if (lower.includes('relationship') || lower.includes('related') || lower.includes('connection')) {
      return `Patent relationships in your portfolio are defined by citation links:\n\nKey connections:\n- US-10421873 (Neural Networks) → links to US-10532198 (Transformers), US-10893456 (Edge Computing), US-10893456 (Federated Learning)\n- US-10532198 (Transformers) → links to US-10421873, US-10678432 (Reinforcement Learning), US-11023456 (GANs)\n- US-10781234 (Quantum) → links to US-10678432, US-10956789 (Blockchain)\n\nUse the 3D Visualization page to explore these connections interactively.`;
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return `Hello! I'm your AI patent analytics assistant. I can help you:\n\n- Analyze patent similarity scores and citations\n- Identify trends across technology categories\n- Find pending, granted, or rejected patents\n- Explore patent relationships and connections\n- Get insights on specific technology areas\n\nWhat would you like to know about your patent portfolio?`;
    }

    // Default response
    return `I can help you analyze your patent portfolio. Here's what I found regarding "${query}":\n\nYour portfolio contains ${mockPatents.length} patents across ${new Set(mockPatents.map(p => p.category)).size} technology categories. The average similarity score is ${(mockPatents.reduce((s, p) => s + p.similarity_score, 0) / mockPatents.length).toFixed(2)} with ${mockPatents.reduce((s, p) => s + p.citations_count, 0)} total citations.\n\nTry asking me about:\n- Highest similarity patents\n- Most cited patents\n- Pending patents\n- AI or quantum technology areas\n- Patent relationships`;
  }

  return (
    <div className="flex h-screen lg:h-screen bg-slate-950">
      {/* Sidebar - Conversations */}
      <div className="w-64 lg:w-72 border-r border-slate-800 flex flex-col bg-slate-900/50 hidden md:flex">
        <div className="p-4 border-b border-slate-800">
          <button
            onClick={createConversation}
            id="chatbot-new-btn"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-8">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  activeConversation === conv.id
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile conversation selector */}
        <div className="md:hidden p-3 border-b border-slate-800 bg-slate-900/50">
          <select
            value={activeConversation || ''}
            onChange={(e) => setActiveConversation(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
          >
            {conversations.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Header */}
        <div id="chatbot-header" className="px-4 lg:px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">AI Patent Assistant</h1>
              <p className="text-slate-500 text-xs">Context-aware patent analytics chatbot</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div id="chatbot-messages" className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-sky-400" />
              </div>
              <h2 className="text-white text-lg font-semibold mb-2">Ask me about your patents</h2>
              <p className="text-slate-500 text-sm mb-6">I can analyze your portfolio, find trends, and answer questions about patent relationships.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-300 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-sky-500 to-cyan-500'
                  : 'bg-slate-700'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-sky-500/10 border border-sky-500/20 text-white'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-200'
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div id="chatbot-input" className="p-4 lg:p-6 border-t border-slate-800">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about patents, trends, relationships..."
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
