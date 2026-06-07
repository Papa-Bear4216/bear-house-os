'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow, parseISO, isPast } from 'date-fns';
import {
  Settings2, ChevronUp, ChevronDown, Sparkles, RefreshCw, CheckCircle2, Circle,
  CalendarDays, UtensilsCrossed, Wallet, ShoppingCart, Star, Zap, Users,
  Clock, AlertCircle, X, Plus, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFamilyMembers } from '@/hooks/use-family';
import { useTasks } from '@/hooks/use-tasks';
import { useEvents } from '@/hooks/use-events';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDashboard, WIDGET_LABELS, type WidgetId } from '@/hooks/use-dashboard';
import { useMeals, getWeekStart } from '@/hooks/use-meals';
import { useShopping } from '@/hooks/use-shopping';
import { askHermes } from '@/lib/hermes';
import { trackUsage, getHermesMemory, buildMemorySummary } from '@/lib/usage-tracker';
import { getRecipeById } from '@/lib/recipes';
import { HeartTrail } from '@/components/HeartTrail';

// ─── Widgets ────────────────────────────────────────────────────────────────

function DailyBriefWidget() {
  const { users } = useFamilyMembers();
  const { tasks } = useTasks();
  const { events } = useEvents();
  const { currentUser } = useCurrentUser();
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    try {
      const memory = await getHermesMemory();
      const usageMemory = memory ? buildMemorySummary(memory) : undefined;
      const todayTasks = tasks.filter(t => t.date === format(new Date(), 'yyyy-MM-dd') && t.status !== 'done');
      const todayEvents = events.filter(e => e.date?.startsWith(format(new Date(), 'yyyy-MM-dd')));

      const { content } = await askHermes(
        [{ role: 'user', content: `Give me a brief, warm morning briefing for ${currentUser?.name ?? 'the family'}. What needs attention today? Keep it to 2-3 sentences max. Be specific to what's actually happening.` }],
        {
          currentUser,
          users,
          tasks: todayTasks,
          events: todayEvents,
          date: format(new Date(), 'EEEE, MMMM d h:mma'),
          usageMemory,
        },
      );
      setBrief(content);
      setFetched(true);
    } catch {
      setBrief("Hermes is offline. Set ANTHROPIC_API_KEY in Vercel to activate.");
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, [currentUser, users, tasks, events]);

  useEffect(() => {
    if (!fetched && currentUser) fetchBrief();
  }, [currentUser, fetched, fetchBrief]);

  return (
    <WidgetCard icon={<Sparkles className="w-4 h-4 text-purple-600" />} title="Hermes" accent="bg-purple-100">
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Thinking…
        </div>
      ) : brief ? (
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-slate-700 leading-relaxed">{brief}</p>
          <button onClick={fetchBrief} className="flex-shrink-0 p-1 hover:text-purple-500 transition-colors">
            <RefreshCw className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      ) : (
        <button onClick={fetchBrief} className="text-sm text-purple-500 font-bold hover:underline">
          Get today&apos;s brief →
        </button>
      )}
    </WidgetCard>
  );
}

function MyTasksWidget() {
  const { tasks, updateTaskStatus } = useTasks();
  const { currentUser } = useCurrentUser();
  const today = format(new Date(), 'yyyy-MM-dd');

  const myTasks = tasks
    .filter(t => t.assigneeId === currentUser?.id && t.status !== 'done')
    .sort((a, b) => {
      const aUrgent = a.date && a.date <= today;
      const bUrgent = b.date && b.date <= today;
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      return 0;
    })
    .slice(0, 5);

  return (
    <WidgetCard icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} title="My Tasks" accent="bg-green-100"
      action={<Link href="/missions" className="text-xs text-green-600 font-bold hover:underline">See all</Link>}
    >
      {myTasks.length === 0 ? (
        <p className="text-sm text-slate-400">All clear! 🎉</p>
      ) : (
        <div className="space-y-2">
          {myTasks.map(task => {
            const overdue = task.date && task.date < today;
            return (
              <div key={task.id} className="flex items-center gap-2.5">
                <button onClick={() => updateTaskStatus(task.id, 'done')} className="flex-shrink-0">
                  <Circle className="w-4 h-4 text-slate-300 hover:text-green-500 transition-colors" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${overdue ? 'text-red-600' : 'text-slate-800'}`}>{task.title}</p>
                  {task.date && (
                    <p className={`text-[10px] ${overdue ? 'text-red-400' : 'text-slate-400'}`}>
                      {overdue ? '⚠️ Overdue · ' : ''}{format(parseISO(task.date), 'MMM d')}
                    </p>
                  )}
                </div>
                {task.pointsValue > 0 && (
                  <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">+{task.pointsValue}pts</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}

function FamilyTasksWidget() {
  const { tasks, updateTaskStatus } = useTasks();
  const { users } = useFamilyMembers();
  const today = format(new Date(), 'yyyy-MM-dd');

  const urgentTasks = tasks
    .filter(t => t.status !== 'done' && t.date && t.date <= today)
    .slice(0, 6);

  return (
    <WidgetCard icon={<Users className="w-4 h-4 text-blue-600" />} title="Family Tasks" accent="bg-blue-100"
      action={<Link href="/missions" className="text-xs text-blue-600 font-bold hover:underline">All tasks</Link>}
    >
      {urgentTasks.length === 0 ? (
        <p className="text-sm text-slate-400">No urgent tasks — family&apos;s on track 🐻</p>
      ) : (
        <div className="space-y-2">
          {urgentTasks.map(task => {
            const assignee = users.find(u => u.id === task.assigneeId);
            const overdue = task.date && task.date < today;
            return (
              <div key={task.id} className="flex items-center gap-2">
                <button onClick={() => updateTaskStatus(task.id, 'done')}>
                  <Circle className="w-3.5 h-3.5 text-slate-300 hover:text-green-500" />
                </button>
                <p className={`flex-1 text-sm truncate ${overdue ? 'text-red-600 font-medium' : 'text-slate-700'}`}>{task.title}</p>
                {assignee && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${assignee.color}`}>{assignee.name.split(' ')[0]}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}

function TodaysScheduleWidget() {
  const { events } = useEvents();
  const { users } = useFamilyMembers();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const todayEvents = events
    .filter(e => e.date?.startsWith(todayStr))
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));

  const tomorrowEvents = events
    .filter(e => {
      const d = e.date?.split('T')[0] ?? '';
      const tom = new Date(); tom.setDate(tom.getDate() + 1);
      return d === format(tom, 'yyyy-MM-dd');
    });

  return (
    <WidgetCard icon={<CalendarDays className="w-4 h-4 text-indigo-600" />} title="Today's Schedule" accent="bg-indigo-100"
      action={<Link href="/" className="text-xs text-indigo-600 font-bold hover:underline">Calendar</Link>}
    >
      {todayEvents.length === 0 && tomorrowEvents.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing scheduled today</p>
      ) : (
        <div className="space-y-1.5">
          {todayEvents.map(ev => {
            const member = users.find(u => u.id === ev.userId);
            return (
              <div key={ev.id} className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{ev.title}</p>
                  {ev.startTime && <p className="text-[10px] text-slate-400">{ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</p>}
                </div>
                {member && <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ${member.color}`}>{member.name.split(' ')[0]}</span>}
              </div>
            );
          })}
          {tomorrowEvents.length > 0 && (
            <p className="text-[10px] text-slate-400 pt-1">+{tomorrowEvents.length} tomorrow</p>
          )}
        </div>
      )}
    </WidgetCard>
  );
}

function MealTonightWidget() {
  const { meals } = useMeals(getWeekStart());
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dinner = meals.find(m => m.date === todayStr && m.slot === 'dinner');
  const recipe = dinner ? getRecipeById(dinner.recipeId) : null;

  return (
    <WidgetCard icon={<UtensilsCrossed className="w-4 h-4 text-orange-600" />} title="Dinner Tonight" accent="bg-orange-100"
      action={<Link href="/meals" className="text-xs text-orange-600 font-bold hover:underline">Meal planner</Link>}
    >
      {recipe ? (
        <div className="flex items-center gap-3">
          <span className="text-3xl">{recipe.emoji}</span>
          <div>
            <p className="font-bold text-slate-800">{recipe.name}</p>
            <p className="text-xs text-slate-400">{recipe.prepMinutes + recipe.cookMinutes} min · {recipe.servings} servings</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Nothing planned yet</p>
          <Link href="/meals" className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-1 rounded-lg hover:bg-orange-200 transition-colors">Plan it</Link>
        </div>
      )}
    </WidgetCard>
  );
}

function BudgetPulseWidget() {
  return (
    <WidgetCard icon={<Wallet className="w-4 h-4 text-green-700" />} title="Budget Pulse" accent="bg-green-100"
      action={<Link href="/budget" className="text-xs text-green-700 font-bold hover:underline">Full view</Link>}
    >
      <p className="text-sm text-slate-500">
        <Link href="/budget" className="text-green-600 font-bold hover:underline">Open Budget →</Link>
        <span className="block text-xs text-slate-400 mt-0.5">Link a bank to see live balance here</span>
      </p>
    </WidgetCard>
  );
}

function MyMissionsWidget() {
  const { tasks, updateTaskStatus } = useTasks();
  const { currentUser } = useCurrentUser();

  const missions = tasks
    .filter(t => t.assigneeId === currentUser?.id && t.status !== 'done')
    .slice(0, 3);

  const completed = tasks.filter(t => t.assigneeId === currentUser?.id && t.status === 'done').length;

  return (
    <WidgetCard icon={<Star className="w-4 h-4 text-yellow-500" />} title="My Missions" accent="bg-yellow-100"
      action={<Link href="/missions" className="text-xs text-yellow-600 font-bold hover:underline">All missions</Link>}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="text-center">
          <p className="text-2xl font-black text-yellow-500">{currentUser?.points ?? 0}</p>
          <p className="text-[10px] text-slate-400">points</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-green-500">{completed}</p>
          <p className="text-[10px] text-slate-400">done</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {missions.map(m => (
          <div key={m.id} className="flex items-center gap-2">
            <button onClick={() => updateTaskStatus(m.id, 'done')}>
              <Circle className="w-3.5 h-3.5 text-slate-300 hover:text-yellow-500" />
            </button>
            <p className="text-sm text-slate-700 flex-1 truncate">{m.title}</p>
            {m.pointsValue > 0 && <span className="text-[10px] font-bold text-yellow-600">+{m.pointsValue}</span>}
          </div>
        ))}
        {missions.length === 0 && <p className="text-sm text-slate-400">No active missions 🎉</p>}
      </div>
    </WidgetCard>
  );
}

function FamilyStatusWidget() {
  const { users } = useFamilyMembers();
  const { tasks } = useTasks();
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <WidgetCard icon={<Users className="w-4 h-4 text-slate-600" />} title="Family Status" accent="bg-slate-100">
      <div className="grid grid-cols-2 gap-2">
        {users.map(u => {
          const pending = tasks.filter(t => t.assigneeId === u.id && t.status !== 'done' && t.date === today).length;
          return (
            <div key={u.id} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${u.color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>
                {u.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{u.name.split(' ')[0]}</p>
                <p className="text-[10px] text-slate-400">{pending > 0 ? `${pending} task${pending > 1 ? 's' : ''} today` : '✓ clear'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}

function QuickAddWidget() {
  const { addTask } = useTasks();
  const { addEvent } = useEvents();
  const { currentUser } = useCurrentUser();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'task' | 'event'>('task');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    if (mode === 'task') {
      addTask({ title: input, assigneeId: currentUser?.id ?? '1', date: format(new Date(), 'yyyy-MM-dd'), pointsValue: 10, status: 'pending', completed: false });
    } else {
      addEvent({ title: input, userId: currentUser?.id ?? '1', date: new Date().toISOString(), startTime: '', endTime: '' });
    }
    setInput('');
    setDone(true);
    setTimeout(() => setDone(false), 1500);
    trackUsage('home', `quick-add-${mode}`);
  }

  return (
    <WidgetCard icon={<Zap className="w-4 h-4 text-yellow-500" />} title="Quick Add" accent="bg-yellow-50">
      <div className="flex gap-1 mb-2">
        {(['task', 'event'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-1 text-xs font-bold rounded-lg capitalize transition-all ${mode === m ? 'bg-yellow-400 text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {m}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={mode === 'task' ? 'Add a task…' : 'Add an event…'}
          className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <button type="submit" className={`p-1.5 rounded-lg transition-colors ${done ? 'bg-green-400 text-white' : 'bg-yellow-400 hover:bg-yellow-500 text-white'}`}>
          {done ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </form>
    </WidgetCard>
  );
}

function ShoppingReminderWidget() {
  const { items } = useShopping();
  const urgent = items.filter(i => !i.checked);

  return (
    <WidgetCard icon={<ShoppingCart className="w-4 h-4 text-green-600" />} title="Shopping" accent="bg-green-50"
      action={<Link href="/shopping" className="text-xs text-green-600 font-bold hover:underline">Full list</Link>}
    >
      {urgent.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing needed right now</p>
      ) : (
        <div>
          <p className="text-2xl font-black text-green-600 mb-0.5">{urgent.length}</p>
          <p className="text-xs text-slate-500">
            item{urgent.length !== 1 ? 's' : ''} to pick up · {urgent.slice(0, 3).map(i => i.name).join(', ')}{urgent.length > 3 ? '…' : ''}
          </p>
        </div>
      )}
    </WidgetCard>
  );
}

// ─── Widget shell ────────────────────────────────────────────────────────────

function WidgetCard({ icon, title, accent, action, children }: {
  icon: React.ReactNode; title: string; accent: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded-lg ${accent}`}>{icon}</span>
          <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const WIDGET_COMPONENTS: Record<WidgetId, React.FC> = {
  'daily-brief': DailyBriefWidget,
  'my-tasks': MyTasksWidget,
  'family-tasks': FamilyTasksWidget,
  'todays-schedule': TodaysScheduleWidget,
  'meal-tonight': MealTonightWidget,
  'budget-pulse': BudgetPulseWidget,
  'my-missions': MyMissionsWidget,
  'family-status': FamilyStatusWidget,
  'quick-add': QuickAddWidget,
  'shopping-reminder': ShoppingReminderWidget,
};

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Home() {
  const { currentUser } = useCurrentUser();
  const isParent = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  const { enabledWidgets, config, toggleWidget, moveWidget } = useDashboard(
    currentUser?.id ?? 'default',
    currentUser?.role ?? 'child',
  );

  const [customizing, setCustomizing] = useState(false);

  // Track home page visit
  useEffect(() => {
    trackUsage('home');
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-6">
      <HeartTrail />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{greeting()},</p>
          <h1 className="text-lg font-black text-slate-900 leading-tight">
            {currentUser?.name?.split(' ')[0] ?? 'Bear House'} 🐻
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400">{format(new Date(), 'EEE, MMM d')}</p>
          <button
            onClick={() => setCustomizing(c => !c)}
            className={`p-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${customizing ? 'bg-yellow-400' : 'bg-white'}`}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customize mode */}
      <AnimatePresence>
        {customizing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-yellow-50 border-b-2 border-yellow-300 px-4 py-4 overflow-hidden"
          >
            <p className="text-xs font-black text-yellow-800 uppercase tracking-wide mb-3">Customize your dashboard</p>
            <div className="grid grid-cols-1 gap-2">
              {[...config.widgets].sort((a, b) => a.order - b.order).map(w => (
                <div key={w.id} className={`flex items-center gap-3 bg-white rounded-xl px-3 py-2 border-2 ${w.enabled ? 'border-black' : 'border-slate-200 opacity-60'}`}>
                  <button
                    onClick={() => toggleWidget(w.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${w.enabled ? 'bg-green-400 border-green-400' : 'border-slate-300'}`}
                  >
                    {w.enabled && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="flex-1 text-sm font-medium text-slate-700">{WIDGET_LABELS[w.id]}</span>
                  {w.enabled && (
                    <div className="flex gap-1">
                      <button onClick={() => moveWidget(w.id, 'up')} className="p-1 hover:text-slate-600 text-slate-300"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => moveWidget(w.id, 'down')} className="p-1 hover:text-slate-600 text-slate-300"><ChevronDown className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setCustomizing(false)} className="mt-3 w-full py-2 bg-yellow-400 border-2 border-black rounded-xl font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget grid */}
      <div className="px-4 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence>
          {enabledWidgets.map((w, i) => {
            const Component = WIDGET_COMPONENTS[w.id];
            if (!Component) return null;
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
              >
                <Component />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
