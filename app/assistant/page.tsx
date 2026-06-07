'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Cpu } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { useEvents } from '@/hooks/use-events';
import { useFamilyMembers } from '@/hooks/use-family';
import { format } from 'date-fns';
import { askHermes, type HermesMessage } from '@/lib/hermes';
import { trackUsage, trackHermesQuery, getHermesMemory, buildMemorySummary } from '@/lib/usage-tracker';

const QUICK_PROMPTS = [
  "Brief me on today",
  "What should we have for dinner?",
  "Who's been most active this week?",
  "Suggest a family activity for the weekend",
];

export default function AssistantPage() {
  const { tasks, addTask } = useTasks();
  const { events, addEvent } = useEvents();
  const { users, addUser } = useFamilyMembers();

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string; model?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { trackUsage('assistant'); }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  async function handleSend(text: string) {
    if (!text.trim() || isLoading) return;

    const userMsg = text.trim();
    setHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const messages: HermesMessage[] = [
        ...history.map(m => ({ role: m.role, content: m.text })),
        { role: 'user', content: userMsg },
      ];

      trackHermesQuery(userMsg);
      const memory = await getHermesMemory();
      const context = {
        date: format(new Date(), 'yyyy-MM-dd HH:mm EEEE'),
        users,
        tasks,
        events,
        usageMemory: memory ? buildMemorySummary(memory) : undefined,
      };

      const systemOverride = `You are Hermes, the Bear House Family OS AI. You know this family deeply.

When the user asks you to ADD tasks, events, or family members, output a JSON block like:
\`\`\`json
{"actions":[{"type":"add_task","args":{"title":"...","assigneeId":"...","date":"YYYY-MM-DD","pointsValue":10}}]}
\`\`\`
Action types: add_task (title, assigneeId, date, pointsValue), add_event (title, userId, date, startTime HH:MM, endTime HH:MM), add_user (name, role, color like "bg-red-500", points).
Only output JSON when creating things. Otherwise reply conversationally and warmly.`;

      const { content, model } = await askHermes(messages, context, systemOverride);

      // Parse any action JSON
      let replyText = content;
      const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          let count = 0;
          if (data.actions && Array.isArray(data.actions)) {
            for (const action of data.actions) {
              if (action.type === 'add_task') { addTask(action.args); count++; }
              else if (action.type === 'add_event') { addEvent(action.args); count++; }
              else if (action.type === 'add_user') {
                addUser({ id: crypto.randomUUID(), name: action.args.name ?? 'New Member', role: action.args.role ?? 'child', color: action.args.color ?? 'bg-indigo-500', points: action.args.points ?? 0 });
                count++;
              }
            }
          }
          replyText = content.replace(/```json[\s\S]*?```/, '').trim() || `Done! Added ${count} item${count !== 1 ? 's' : ''}.`;
        } catch { /* leave replyText as-is */ }
      }

      setHistory(prev => [...prev, { role: 'assistant', text: replyText, model }]);
    } catch (err) {
      console.error(err);
      setHistory(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting right now. Set OPENROUTER_API_KEY in your Vercel env vars to use Hermes." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-50 relative">
      {/* Header */}
      <header className="p-4 sm:p-6 border-b border-slate-100 flex items-center gap-3 bg-white">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 leading-none mb-1">Hermes</h1>
          <p className="text-slate-500 text-xs sm:text-sm leading-none">Your family AI — learns, understands, anticipates</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Sparkles className="w-12 h-12 mb-4 text-purple-300" />
            <p className="font-medium text-slate-600 text-center">What can I help with?</p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:bg-purple-50 hover:border-purple-300 transition-colors shadow-sm"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-5 py-3 ${
              m.role === 'user'
                ? 'bg-purple-600 text-white rounded-br-none'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              {m.model && (
                <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-purple-300' : 'text-slate-400'}`}>
                  via {m.model}
                </p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-5 py-3 text-slate-500 flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span className="text-sm">Hermes is thinking…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-white md:bg-transparent">
        <form
          onSubmit={e => { e.preventDefault(); handleSend(input); }}
          className="flex relative items-center max-w-4xl mx-auto"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Hermes anything about your family…"
            className="w-full pl-5 pr-14 py-4 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 shadow-sm bg-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-md active:scale-95"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
