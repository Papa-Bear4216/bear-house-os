'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { useEvents } from '@/hooks/use-events';
import { useFamilyMembers } from '@/hooks/use-family';
import { format } from 'date-fns';
import { runLocalAI } from '@/lib/local-ai';

export default function AssistantPage() {
  const { tasks, addTask } = useTasks();
  const { events, addEvent } = useEvents();
  const { users, addUser } = useFamilyMembers();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string, text: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getAppStateString = () => {
    return JSON.stringify({
      currentDate: format(new Date(), 'yyyy-MM-dd HH:mm'),
      users,
      tasks,
      events
    });
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');

    try {
      const chatContext = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
      
      const systemInstruction = `You are the Bear House OS digital assistant running locally. You help the family manage their calendar, tasks, and points. Be conversational, friendly, and very concise. Give the user briefings on their day when asked. 
If the user wants to add tasks, events, or family members, output EXACTLY AND ONLY a valid JSON object wrapped in \`\`\`json block. The JSON object should have an "actions" array where each object has a "type" ("add_task", "add_event", or "add_user") and an "args" object.
For "add_task", args: { title: string, assigneeId: string, date: string (YYYY-MM-DD), pointsValue: number }.
For "add_event", args: { title: string, userId: string, date: string (YYYY-MM-DD), startTime: string (HH:MM), endTime: string (HH:MM) }.
For "add_user", args: { name: string, role: string ("parent" | "child"), color: string (e.g. "bg-red-500"), points: number }.
If no actions are needed, do NOT output JSON, just reply conversationally.`;

      const prompt = `Current App State:\n${getAppStateString()}\n\nRecent Chat History:\n${chatContext}\n\nUser: ${text}`;

      const responseText = await runLocalAI(prompt, { systemInstruction });

      let addedCount = 0;
      let replyText = responseText;

      const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
         try {
            const data = JSON.parse(jsonMatch[1]);
            if (data.actions && Array.isArray(data.actions)) {
               for (const action of data.actions) {
                  if (action.type === 'add_task') {
                     addTask(action.args);
                     addedCount++;
                  } else if (action.type === 'add_event') {
                     addEvent(action.args);
                     addedCount++;
                  } else if (action.type === 'add_user') {
                     addUser({
                       id: Math.random().toString(36).substring(7),
                       name: action.args.name || "Unknown",
                       role: action.args.role === "admin" ? "admin" : action.args.role === "superadmin" ? "superadmin" : "child",
                       color: action.args.color || "bg-indigo-500",
                       points: action.args.points || 0
                     });
                     addedCount++;
                  }
               }
            }
            replyText = responseText.replace(/```json\s*(\{[\s\S]*?\})\s*```/, '').trim() || `Got it! I processsed ${addedCount} action(s).`;
         } catch (e) {
            console.error("Failed to parse actions JSON:", e);
         }
      }

      setMessages(prev => [...prev, { role: 'assistant', text: replyText }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry! I encountered an error connecting to my local AI brain. Please ensure the flags are enabled." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-50 relative">
      {/* Header */}
      <header className="p-4 sm:p-6 border-b border-slate-100 flex items-center gap-3 bg-white">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 leading-none mb-1">Digital Assistant</h1>
          <p className="text-slate-500 text-xs sm:text-sm leading-none">Powered by Gemini AI</p>
        </div>
      </header>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
         {messages.length === 0 && (
           <div className="flex flex-col items-center justify-center h-full text-slate-400">
             <Sparkles className="w-12 h-12 mb-4 text-blue-200" />
             <p className="font-medium text-slate-600 text-center">How can I help you today?</p>
             <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <button 
                  onClick={() => handleSend("Give me a brief of today's schedule and tasks.")}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Brief me on today
                </button>
                <button 
                  onClick={() => setInput("Schedule a dentist appointment for Julia next Tuesday at 3pm to 4pm")}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Try an import
                </button>
             </div>
           </div>
         )}
         {messages.map((m, i) => (
           <div key={`${i}-${m.text.substring(0, 10)}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-5 py-3 ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
               <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
             </div>
           </div>
         ))}
         {isLoading && (
           <div className="flex justify-start">
             <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-5 py-3 text-slate-500 flex items-center gap-2 shadow-sm">
               <Loader2 className="w-4 h-4 animate-spin" />
               <span className="text-sm">Thinking...</span>
             </div>
           </div>
         )}
         <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-white md:bg-transparent">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex relative items-center max-w-4xl mx-auto"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me to schedule a meeting or summarize your day..."
            className="w-full pl-5 pr-14 py-4 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 shadow-sm bg-white"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors flex items-center justify-center shadow-md active:scale-95"
          >
            <Send className="w-5 h-5 ml-1 mb-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
