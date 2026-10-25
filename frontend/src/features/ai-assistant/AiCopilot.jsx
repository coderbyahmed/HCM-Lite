import React, { useState } from 'react';
import { sendAiChat } from '../../services/api.js';
import { useAuth } from '../../app/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Wrench,
  ShieldCheck,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';

export const AiCopilot = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name}! I am HCM Copilot, your intelligent workforce and HR assistant. I can query company operational policies, check leave balances, calculate working days, and provide organizational summaries scoped strictly to your ${user?.role} authorization.`,
      toolCalls: [],
    },
  ]);

  const suggestions =
    user?.role === 'Employee'
      ? [
          'How many casual and sick leave days do I have remaining?',
          'What is the company office start time and attendance grace period?',
          'Calculate working days between 2026-06-01 and 2026-06-05',
          'How is gross salary and medical allowance calculated?',
        ]
      : [
          'Give me an operational summary of today\'s attendance and leaves',
          'What are the 5-tier progressive annual income tax slabs?',
          'List employees currently registered in Engineering',
          'Explain the half-day attendance policy threshold and deductions',
        ];

  const handleSend = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', content: text.trim() };
    const newChatHistory = [...messages, userMsg];
    setMessages(newChatHistory);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await sendAiChat(text.trim(), messages);
      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.reply,
            toolCalls: res.toolCalls || [],
          },
        ]);
      }
    } catch (err) {
      addToast(err.message || 'AI assistant request failed', 'error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue fulfilling your request. Please ensure the server is connected and try again.',
          toolCalls: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">HCM Copilot</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Gemini 3.8 Flash Powered
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Tool Calling Enabled · Scoped to {user?.role} Permissions
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 text-xs leading-relaxed max-w-3xl ${
              m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
              }`}
            >
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className="space-y-2">
              <div
                className={`p-4 rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>

              {/* Tool Execution Badges */}
              {m.toolCalls && m.toolCalls.length > 0 && (
                <div className="space-y-1.5 pl-1">
                  {m.toolCalls.map((tc, tcIdx) => (
                    <div
                      key={tcIdx}
                      className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-700 flex items-center gap-2"
                    >
                      <Wrench className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <div>
                        Executed Function Tool: <span className="font-mono font-bold">{tc.toolName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2 animate-pulse">
            <Bot className="w-4 h-4 text-indigo-500" />
            <span>HCM Copilot is executing tool queries and analyzing response...</span>
          </div>
        )}
      </div>

      {/* Query Suggestions Strip */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2 overflow-x-auto">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="text-[11px] font-semibold text-slate-500 shrink-0">Quick Queries:</span>
        <div className="flex items-center gap-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 whitespace-nowrap transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask HCM Copilot about policies, leave balance, attendance, or payroll calculations..."
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
