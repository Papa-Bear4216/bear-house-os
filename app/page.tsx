'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Filter, ArrowUpDown, ChevronDown, CalendarPlus, CheckSquare, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser, Task } from '@/lib/familyos';
import { useFamilyMembers } from '@/hooks/use-family';
import { useTasks } from '@/hooks/use-tasks';
import { useEvents } from '@/hooks/use-events';
import { useCurrentUser } from '@/hooks/use-current-user';

import { HeartTrail } from '@/components/HeartTrail';
import { BulletinBoard } from '@/components/BulletinBoard';
import { WhatsHappening } from '@/components/WhatsHappening';
import { Star, Gift, Trophy, PartyPopper, Sparkles, Trash2 } from 'lucide-react';

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { tasks, isLoaded, addTask, updateTaskStatus, deleteTask } = useTasks();
  const { events, isLoaded: eventsLoaded, addEvent, deleteEvent } = useEvents();
  const { users, isLoaded: usersLoaded, updatePoints } = useFamilyMembers();
  const { currentUser } = useCurrentUser();

  const isAbriana = currentUser?.name === 'Abriana';
  const isChild = currentUser?.role === 'child';

  const [addingType, setAddingType] = useState<'task'|'event'>('task');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('1');
  const [eventStartTime, setEventStartTime] = useState<string>('09:00');
  const [eventEndTime, setEventEndTime] = useState<string>('10:00');

  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('default');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding for previous month's days to align week start (Sunday)
  const startDay = monthStart.getDay();
  const paddingDays = Array.from({ length: startDay }).map((_, i) => {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startDay - i));
    return d;
  });

  const allDays = [...paddingDays, ...daysInMonth];

  // Tasks and Events for selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedTasks = tasks.filter(t => t.date === selectedDateStr);
  const selectedEvents = events.filter(e => e.date === selectedDateStr);

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...selectedTasks];
    if (assigneeFilter !== 'all') {
      result = result.filter(t => t.assigneeId === assigneeFilter);
    }
    if (sortOrder === 'incomplete') {
      result.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
    } else if (sortOrder === 'completed') {
      result.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? -1 : 1));
    }
    return result;
  }, [selectedTasks, assigneeFilter, sortOrder]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleSelectDate = (date: Date) => setSelectedDate(date);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    if (addingType === 'task') {
      const pts = (window as any)._tempPoints || 10;
      addTask({
        title: newTaskTitle.trim(),
        assigneeId: newTaskAssignee,
        date: selectedDateStr,
        completed: false,
        status: 'todo',
        pointsValue: pts,
      });
    } else {
      addEvent({
        title: newTaskTitle.trim(),
        userId: newTaskAssignee,
        date: selectedDateStr,
        startTime: eventStartTime,
        endTime: eventEndTime,
      });
    }
    setNewTaskTitle('');
  };

  const handleTaskClick = (task: Task) => {
    if (!currentUser) return;
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
    const dbStatus = task.status || (task.completed ? 'done' : 'todo');

    if (isAdmin) {
      if (dbStatus === 'done') {
        updateTaskStatus(task.id, 'todo');
        updatePoints(task.assigneeId, -(task.pointsValue || 10));
      } else {
        updateTaskStatus(task.id, 'done');
        updatePoints(task.assigneeId, task.pointsValue || 10);
      }
    } else {
      if (dbStatus === 'todo') {
        updateTaskStatus(task.id, 'pending');
      } else if (dbStatus === 'pending') {
        updateTaskStatus(task.id, 'todo');
      } else if (dbStatus === 'done') {
        alert("A parent already approved this! Awesome job.");
      }
    }
  };

  if (!isLoaded || !eventsLoaded || !usersLoaded) return null;

  if (isAbriana) {
    const abrianaTasks = tasks.filter(t => t.assigneeId === currentUser?.id);
    const todoTasks = abrianaTasks.filter(t => t.status !== 'done');
    const doneTasks = abrianaTasks.filter(t => t.status === 'done');

    return (
      <div className="min-h-screen bg-pink-50 overflow-x-hidden relative">
        <HeartTrail />
        <main className="max-w-4xl mx-auto p-6 md:p-12">
          <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center md:text-left"
            >
              <h1 className="text-5xl font-display font-bold text-pink-600 flex items-center gap-3">
                Hi Abriana! <Star className="w-10 h-10 text-yellow-400 fill-yellow-400 animate-pulse" />
              </h1>
              <p className="text-pink-400 text-xl mt-2 font-medium">Ready for some fun today?</p>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-4 border-pink-100 flex items-center gap-6"
            >
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Gift className="w-8 h-8 text-yellow-500" />
              </div>
              <div>
                <p className="text-pink-300 text-sm font-bold uppercase tracking-widest">My Stars</p>
                <p className="text-4xl font-display font-black text-pink-600">{currentUser?.points || 0}</p>
              </div>
            </motion.div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <div className="flex items-center justify-between mb-6 px-4">
                <h2 className="text-2xl font-bold text-pink-500 flex items-center gap-2">
                  <Sparkles className="w-6 h-6" /> To Do
                </h2>
                <span className="bg-pink-100 text-pink-500 px-4 py-1 rounded-full text-sm font-bold">
                  {todoTasks.length} left
                </span>
              </div>

              <div className="space-y-4">
                {todoTasks.length === 0 ? (
                  <div className="bg-white/50 border-2 border-dashed border-pink-200 rounded-3xl p-12 text-center">
                    <PartyPopper className="w-12 h-12 text-pink-300 mx-auto mb-4" />
                    <p className="text-pink-400 font-medium">Hurray! All tasks done!</p>
                  </div>
                ) : (
                  todoTasks.map((task, idx) => (
                    <motion.button
                      key={task.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ scale: 1.02, rotate: 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTaskClick(task)}
                      className="w-full bg-white p-6 rounded-3xl shadow-sm border-2 border-transparent hover:border-pink-300 transition-all flex items-center gap-6 text-left group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                        {task.status === 'pending' ? (
                          <Clock className="w-7 h-7 text-amber-500" />
                        ) : (
                          <Star className="w-7 h-7 text-pink-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xl font-bold text-slate-800">{task.title}</p>
                        <p className="text-pink-400 font-bold mt-1 text-sm">+{task.pointsValue || 10} Stars</p>
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-pink-100 flex items-center justify-center group-hover:bg-pink-500 group-hover:border-pink-500 transition-all">
                        <CheckSquare className="w-5 h-5 text-transparent group-hover:text-white" />
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-400 mb-6 px-4 flex items-center gap-2">
                <Trophy className="w-6 h-6" /> Completed
              </h2>
              <div className="space-y-4 opacity-70">
                {doneTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="bg-white/60 p-5 rounded-3xl border-2 border-slate-100 flex items-center gap-4 text-left line-through grayscale"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="font-medium text-slate-500">{task.title}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <main className="flex flex-col xl:flex-row bg-slate-50 h-full">
      <WhatsHappening />
      {/* Calendar Area */}
      <section className="flex-1 p-4 sm:p-8 xl:p-12 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto flex flex-col h-full space-y-8">
          {/* Header */}
          <header className="flex justify-between items-start md:items-end flex-col md:flex-row gap-4">
            <div>
              <h1 className="font-display text-5xl font-black tracking-tighter text-slate-900 uppercase">
                Bear House <Sparkles className="inline w-8 h-8 text-[#be185d] fill-[#be185d]" />
              </h1>
              <p className="text-slate-900 font-bold mt-2 text-base sm:text-lg tracking-tight bg-[#facc15] inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0_#1e293b]">Family Calendar & Tasks</p>
              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => window.dispatchEvent(new Event('openBriefing'))}
                  className="text-sm font-black uppercase tracking-wider text-slate-900 bg-[#c084fc] px-4 py-2 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4 inline mr-1" /> Brief
                </button>
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: 'Bear House OS', url: window.location.href });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }
                  }}
                  className="text-sm font-black uppercase tracking-wider text-slate-900 bg-[#ccff00] px-4 py-2 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  Share Link
                </button>
                <a href="/app-release.apk" download className="text-sm font-black uppercase tracking-wider text-white bg-[#be185d] px-4 py-2 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 flex items-center justify-center">
                  Get Android APK
                </a>
              </div>
            </div>
            
            <div className="flex -space-x-4 mr-2">
              {users.map(u => (
                <div key={u.id} className="relative group">
                  {u.avatarUrl ? (
                    <Image 
                      src={u.avatarUrl} 
                      alt={u.name} 
                      width={48}
                      height={48}
                      className={`w-12 h-12 rounded-full border-4 border-slate-900 object-cover shadow-[4px_4px_0_#1e293b] group-hover:scale-125 group-hover:-translate-y-2 group-hover:shadow-[8px_8px_0_#1e293b] group-hover:z-20 transition-all duration-300 relative ${u.isExempt ? 'opacity-70' : ''}`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full border-4 border-slate-900 ${u.color} flex items-center justify-center text-lg text-slate-900 font-black shadow-[4px_4px_0_#1e293b] group-hover:scale-110 group-hover:-translate-y-1 relative z-10 transition-transform`}>
                      {u.name[0]}
                    </div>
                  )}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-slate-900 text-[#ccff00] font-black uppercase tracking-widest text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none border-2 border-slate-900 shadow-[4px_4px_0_#1e293b]">
                    {u.name}
                  </span>
                </div>
              ))}
            </div>
          </header>

          {/* Calendar Wrapper */}
          <div className="bg-[#a7f3d0] rounded-[2rem] shadow-[8px_8px_0_#1e293b] border-4 border-slate-900 p-6 flex-1 flex flex-col min-h-[600px] transition-all">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-display font-black text-slate-900 tracking-tighter uppercase">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex space-x-2">
                <button onClick={handlePrevMonth} className="p-2 border-2 border-slate-900 bg-white rounded-xl shadow-[2px_2px_0_#1e293b] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all text-slate-900">
                  <ChevronLeft className="w-5 h-5 stroke-[3]" />
                </button>
                <button onClick={handleNextMonth} className="p-2 border-2 border-slate-900 bg-white rounded-xl shadow-[2px_2px_0_#1e293b] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all text-slate-900">
                  <ChevronRight className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-black uppercase tracking-widest text-slate-900/60 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 flex-1">
              {allDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayTasks = tasks.filter(t => t.date === dayStr);
                const dayEvents = events.filter(e => e.date === dayStr);
                
                // Combine users who have either tasks or events today
                const usersWithActivity = users.filter(u => 
                  dayTasks.some(t => t.assigneeId === u.id) || 
                  dayEvents.some(e => e.userId === u.id)
                );
                
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = isSameDay(day, selectedDate);
                const today = isToday(day);

                return (
                  <button
                    key={dayStr}
                    onClick={() => handleSelectDate(day)}
                    className={`
                      relative flex flex-col p-2 sm:p-3 rounded-2xl transition-all duration-200 border-2
                      focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-500
                      ${!isCurrentMonth ? 'opacity-40 hover:opacity-100' : 'hover:-translate-y-1 hover:shadow-[4px_4px_0_#1e293b]'}
                      ${isSelected && isCurrentMonth ? 'bg-[#facc15] border-slate-900 shadow-[4px_4px_0_#1e293b]' : 'bg-white border-slate-900 shadow-[2px_2px_0_#1e293b]'}
                      ${isSelected && !isCurrentMonth ? 'bg-[#facc15] border-slate-900 opacity-100 shadow-[4px_4px_0_#1e293b]' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className={`text-base sm:text-lg font-black flex-1 text-left
                        ${today ? 'text-[#be185d]' : 'text-slate-900'}
                      `}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-auto pt-2">
                      {usersWithActivity.map(u => (
                        u.avatarUrl ? (
                          <Image 
                            key={u.id} 
                            src={u.avatarUrl} 
                            width={16}
                            height={16}
                            className="w-4 h-4 rounded-full border border-slate-900" 
                            alt={u.name}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div key={u.id} className={`w-2 h-2 rounded border border-slate-900 ${u.color}`} title={u.name} />
                        )
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <BulletinBoard />
        </div>
      </section>

      {/* Sidebar Task view */}
      <aside className="w-full xl:w-96 bg-[#f8fafc] flex flex-col h-full border-t-4 xl:border-t-0 xl:border-l-4 border-slate-900 border-x-0 border-b-0">
        <div className="p-6 border-b-4 border-slate-900 flex items-center justify-between bg-white">
          <h3 className="font-display text-2xl font-black uppercase text-slate-900 tracking-tighter">
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM do')}
          </h3>
          <span className="px-4 py-1.5 bg-[#facc15] border-2 border-slate-900 shadow-[2px_2px_0_#1e293b] text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl">
            {filteredAndSortedTasks.length} {filteredAndSortedTasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        <div className="px-6 py-4 border-b-4 border-slate-900 bg-[#e2e8f0] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Filter className="w-4 h-4 text-slate-900 stroke-[3]" />
              </div>
              <select 
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full text-xs font-black uppercase tracking-wider pl-9 pr-9 py-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0_#1e293b] bg-white text-slate-900 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none appearance-none cursor-pointer hover:bg-slate-50 transition-all"
              >
                <option value="all">All Family</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronDown className="w-4 h-4 text-slate-900 stroke-[3]" />
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <ArrowUpDown className="w-4 h-4 text-slate-900 stroke-[3]" />
              </div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full text-xs font-black uppercase tracking-wider pl-9 pr-9 py-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0_#1e293b] bg-white text-slate-900 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none appearance-none cursor-pointer hover:bg-slate-50 transition-all"
              >
                <option value="default">Sort</option>
                <option value="incomplete">Incomplete</option>
                <option value="completed">Completed</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronDown className="w-4 h-4 text-slate-900 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
          {selectedEvents.length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#be185d] mb-3 bg-pink-100 border-2 border-[#be185d] inline-block px-3 py-1 rounded-lg">Schedule</h4>
              <div className="space-y-4">
                {selectedEvents.map((event) => {
                  const eventUser = users.find(u => u.id === event.userId);
                  if (!eventUser) return null;

                  return (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, y: 10, rotate: -2 }}
                      animate={{ opacity: 1, y: 0, rotate: 0 }}
                      className="group flex flex-col p-4 rounded-2xl bg-white border-4 border-slate-900 shadow-[4px_4px_0_#1e293b] hover:-translate-y-1 transition-transform"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black text-slate-900">{event.title}</p>
                          <div className="flex items-center mt-2 space-x-3 bg-slate-100 p-2 rounded-xl border-2 border-slate-900">
                            <span className="text-xs font-black bg-[#facc15] px-2 py-1 rounded-md border-2 border-slate-900 shadow-sm text-slate-900">
                              {event.startTime} - {event.endTime}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {eventUser.avatarUrl ? (
                                <Image 
                                  src={eventUser.avatarUrl} 
                                  alt={eventUser.name} 
                                  width={24}
                                  height={24}
                                  className="w-6 h-6 rounded-full object-cover border-2 border-slate-900" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className={`w-2 h-2 rounded border border-slate-900 ${eventUser.color} shadow-sm`} />
                              )}
                              <span className="text-xs text-slate-900 font-bold uppercase tracking-wider">{eventUser.name}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteEvent(event.id)}
                          className="opacity-0 group-hover:opacity-100 bg-rose-500 text-white rounded-full p-2 border-2 border-slate-900 shadow-[2px_2px_0_#1e293b] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all ml-3"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#0369a1] mb-4 bg-sky-100 border-2 border-[#0369a1] inline-block px-3 py-1 rounded-lg">Tasks</h4>
            <AnimatePresence initial={false}>
              {filteredAndSortedTasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center p-8 text-slate-900 space-y-4 bg-slate-100 border-4 border-slate-900 border-dashed rounded-[2rem]"
              >
                <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-900 shadow-[4px_4px_0_#1e293b] flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 stroke-[3]" />
                </div>
                <p className="font-bold text-center">{selectedTasks.length === 0 ? 'Nothing for today. You rock!' : 'No matching tasks'}</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedTasks.map((task) => {
                  const assignee = users.find(u => u.id === task.assigneeId);
                  if (!assignee) return null;

                  return (
                    <motion.div 
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10, rotate: 2 }}
                      animate={{ opacity: 1, y: 0, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group flex items-start gap-4 p-4 rounded-2xl border-4 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0_#1e293b]
                        ${task.status === 'done' || task.completed ? 'bg-slate-100 border-slate-900 opacity-70 shadow-none hover:opacity-100' : 'bg-white border-slate-900 shadow-[4px_4px_0_#1e293b]'}
                      `}
                    >
                      <button 
                        onClick={() => handleTaskClick(task)}
                        className="mt-0.5 flex-shrink-0 text-slate-900 bg-white border-2 border-slate-900 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
                        title={task.status === 'pending' ? 'Pending parent confirmation' : ''}
                      >
                        {(task.status === 'done' || task.completed) ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 stroke-[3] fill-emerald-100" />
                        ) : task.status === 'pending' ? (
                          <Clock className="w-6 h-6 text-amber-500 stroke-[3] fill-amber-100" />
                        ) : (
                          <Circle className="w-6 h-6 stroke-[3]" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-black truncate transition-colors ${(task.status === 'done' || task.completed) ? 'text-slate-500 line-through decoration-wavy' : 'text-slate-900'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center mt-2 space-x-3 bg-slate-100 p-1.5 rounded-lg border-2 border-slate-900 w-max">
                          <div className="flex items-center gap-1.5">
                            {assignee.avatarUrl ? (
                              <Image 
                                src={assignee.avatarUrl} 
                                alt={assignee.name} 
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded-full object-cover border-2 border-slate-900 hover:scale-125 transition-transform" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className={`w-3 h-3 rounded-full ${assignee.color} border border-slate-900`} />
                            )}
                            <span className="text-[10px] font-black uppercase text-slate-900">{assignee.name}</span>
                          </div>
                          <span className="text-[10px] font-black bg-[#ccff00] border-2 border-slate-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                            +{task.pointsValue || 10} pts
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 bg-rose-500 text-white rounded-full p-1.5 border-2 border-slate-900 shadow-[2px_2px_0_#1e293b] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-6 border-t-4 border-slate-900 bg-[#cbd5e1] mt-auto">
          <div className="flex gap-2 mb-4">
             <button 
               type="button"
               onClick={() => setAddingType('task')}
               className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 border-2 border-slate-900 transition-all ${addingType === 'task' ? 'bg-[#c084fc] shadow-[4px_4px_0_#1e293b] text-slate-900 -translate-y-[2px]' : 'bg-white hover:bg-slate-50 border-slate-400 text-slate-500'}`}
             >
               <CheckSquare className="w-4 h-4 stroke-[3]" /> Task
             </button>
             <button 
               type="button"
               onClick={() => setAddingType('event')}
               className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 border-2 transition-all ${addingType === 'event' ? 'bg-[#ccff00] border-slate-900 shadow-[4px_4px_0_#1e293b] text-slate-900 -translate-y-[2px]' : 'bg-white hover:bg-slate-50 border-slate-400 text-slate-500'}`}
             >
               <CalendarPlus className="w-4 h-4 stroke-[3]" /> Event
             </button>
          </div>
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-3">
            <input 
              type="text" 
              placeholder={addingType === 'task' ? "NEW TASK..." : "EVENT TITLE..."}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0_#1e293b] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none text-base font-black bg-white uppercase placeholder-slate-400"
            />
            <div className="flex flex-col gap-3">
              <select 
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0_#1e293b] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none text-sm font-bold bg-white text-slate-900"
              >
                {users.filter(u => addingType === 'task' ? !u.isExempt : true).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              
              <div className="flex gap-2">
                {addingType === 'task' ? (
                  <input 
                    type="number"
                    placeholder="PTS"
                    defaultValue={10}
                    className="flex-1 px-3 py-2 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0_#1e293b] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none text-sm font-black bg-white text-slate-900 text-center"
                    id="taskPoints"
                  />
                ) : (
                  <>
                    <input 
                      type="time"
                      value={eventStartTime}
                      onChange={(e) => setEventStartTime(e.target.value)}
                      className="flex-1 px-2 py-2 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0_#1e293b] focus:outline-none text-sm font-bold bg-white text-slate-900"
                    />
                    <input 
                      type="time"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                      className="flex-1 px-2 py-2 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0_#1e293b] focus:outline-none text-sm font-bold bg-white text-slate-900"
                    />
                  </>
                )}
                
                <button 
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  onClick={(e) => {
                    if (addingType === 'task') {
                      const ptsElement = document.getElementById('taskPoints') as HTMLInputElement;
                      if (ptsElement) {
                        (window as any)._tempPoints = parseInt(ptsElement.value) || 10;
                      }
                    }
                  }}
                  className="px-6 py-2 bg-slate-900 text-white font-black text-lg uppercase tracking-wider rounded-xl hover:bg-slate-800 focus:outline-none shadow-[4px_4px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 transition-all flex items-center gap-1 active:scale-95"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  Add
                </button>
              </div>
            </div>
          </form>
        </div>
      </aside>
    </main>
  );
}
