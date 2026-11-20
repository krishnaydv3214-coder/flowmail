"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Inbox, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  Settings as SettingsIcon, 
  LayoutDashboard,
  Search, 
  Command as CommandIcon, 
  Plus, 
  Send, 
  ArrowRight,
  Clock, 
  MapPin, 
  Users, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  Check, 
  ChevronRight,
  RefreshCw,
  Sparkles,
  Bot,
  User,
  X,
  Keyboard,
  AlignLeft,
  Trash2
} from 'lucide-react';
import { UserButton, useAuth } from '@clerk/nextjs';

// Definitions
interface Email {
  id: string;
  threadId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  receivedAt: string;
  direction: 'incoming' | 'outgoing';
  isRead: boolean;
  snippet: string;
  priority?: 'Critical' | 'Important' | 'Normal' | 'Low';
  reason?: string;
  actionItems?: string[];
  inviteEvent?: {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    googleMeetLink?: string;
    organizer: string;
    organizerName?: string;
    guests?: {
      name: string;
      email: string;
      avatarUrl?: string;
      isOrganizer?: boolean;
      status: 'yes' | 'no' | 'maybe' | 'awaiting';
    }[];
    notifications?: string[];
  };
}

interface EmailThread {
  id: string;
  subject: string;
  snippet: string;
  priority: 'Critical' | 'Important' | 'Normal' | 'Low';
  updatedAt: string;
  emails: Email[];
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  attendees?: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function WorkspacePage() {
  const { isSignedIn } = useAuth();
  // Navigation & View states
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'inbox' | 'calendar' | 'chat' | 'settings'>('dashboard');
  
  // Data stores
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Connection statuses
  const [gmailConnected, setGmailConnected] = useState<boolean>(true);
  const [calendarConnected, setCalendarConnected] = useState<boolean>(true);
  const [gmailSignInLink, setGmailSignInLink] = useState<string | null>(null);
  const [calendarSignInLink, setCalendarSignInLink] = useState<string | null>(null);
  
  // Search Overlay
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Compose modal
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  
  // Calendar event creation modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  
  // Chat agent state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your FlowMail MCP Agent. I can manage your inbox and calendar via natural language. 
Try asking me:
- *"Schedule Standup sync tomorrow at 3 PM"*
- *"Send an email to alex@startup.co about database indexing issues"*
- *"Draft a reply to Sarah"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  
  // Command Palette
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  
  // Reply in Reading pane
  const [replyBody, setReplyBody] = useState('');

  // Inbox filter: All, Unread, Critical
  const [inboxFilter, setInboxFilter] = useState<'All' | 'Unread' | 'Critical'>('All');

  // Calendar week navigation (0 = current week, -1 = last week, +1 = next week)
  const [calWeekOffset, setCalWeekOffset] = useState(0);

  // Mini month calendar active viewed month/year date
  const [miniCalDate, setMiniCalDate] = useState(() => new Date());

  // Event details modal state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{msg: string; type: 'success'|'error'} | null>(null);
  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [rsvps, setRsvps] = useState<Record<string, 'yes' | 'no' | 'maybe'>>({});

  const handleRsvp = async (email: Email, status: 'yes' | 'no' | 'maybe') => {
    if (!email.inviteEvent) return;
    setRsvps(prev => ({ ...prev, [email.id]: status }));
    if (status === 'yes') {
      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: email.inviteEvent.title,
            description: email.inviteEvent.description || '',
            startTime: email.inviteEvent.startTime,
            endTime: email.inviteEvent.endTime,
            location: email.inviteEvent.location || ''
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`"${email.inviteEvent.title}" added to your calendar ✓`);
          loadData(calWeekOffset);
        } else {
          showToast(data.error || 'Failed to add event to calendar', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Something went wrong adding the event', 'error');
      }
    } else {
      showToast(`RSVP set to "${status.toUpperCase()}"`);
    }
  };

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  // Fetch init data — optionally specify a weekOffset to load the right date range
  const loadData = async (weekOffset = 0) => {
    setIsLoading(true);
    try {
      const inboxRes = await fetch('/api/inbox');
      const inboxData = await inboxRes.json();
      if (inboxData.success) {
        setThreads(inboxData.threads);
        if (inboxData.threads.length > 0) {
          setSelectedThread(inboxData.threads[0]);
        }
        setGmailConnected(inboxData.connected !== false);
        setGmailSignInLink(inboxData.signInLink || null);
      }

      // Compute date range: fetch 3 weeks centred on viewed week so prev/next nav works
      const baseDay = new Date();
      baseDay.setDate(baseDay.getDate() - baseDay.getDay() + weekOffset * 7);
      const rangeStart = new Date(baseDay);
      rangeStart.setDate(baseDay.getDate() - 7); // 1 week before viewed week
      const rangeEnd = new Date(baseDay);
      rangeEnd.setDate(baseDay.getDate() + 14); // 2 weeks after viewed week

      const calendarRes = await fetch(
        `/api/calendar?start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`
      );
      const calendarData = await calendarRes.json();
      if (calendarData.success) {
        setEvents(calendarData.events);
        setCalendarConnected(calendarData.connected !== false);
        setCalendarSignInLink(calendarData.signInLink || null);
      }
    } catch (e) {
      console.error('Failed to load workspace data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (type: 'gmail' | 'calendar') => {
    try {
      const link = type === 'gmail' ? gmailSignInLink : calendarSignInLink;
      if (link) {
        window.open(link, '_blank');
        return;
      }
      
      // Fallback: hit /api/corsair/connect to get a general connect link
      const res = await fetch('/api/corsair/connect');
      const data = await res.json();
      if (data.success && data.url) {
        window.open(data.url, '_blank');
      } else {
        alert(data.error || 'Failed to get connection link.');
      }
    } catch (e) {
      console.error(e);
      alert('Error initiating connection flow.');
    }
  };


  useEffect(() => {
    loadData(0);
  }, []);

  // Synchronize mini calendar month with the big calendar week navigation offset
  useEffect(() => {
    const base = new Date();
    base.setDate(base.getDate() - base.getDay() + calWeekOffset * 7);
    setMiniCalDate(base);
  }, [calWeekOffset]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAgentTyping]);

  // Scroll calendar to current time on tab change
  useEffect(() => {
    if (currentTab === 'calendar' && calendarScrollRef.current) {
      setTimeout(() => {
        if (calendarScrollRef.current) {
          const currentHour = new Date().getHours();
          const scrollHour = Math.max(0, currentHour - 2);
          calendarScrollRef.current.scrollTop = scrollHour * 64;
        }
      }, 50);
    }
  }, [currentTab]);

  // Set default start/end times in event modal when opened
  useEffect(() => {
    if (isEventModalOpen && !eventStart) {
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      
      setEventStart(`${year}-${month}-${day}T${hours}:${minutes}`);
      
      now.setHours(now.getHours() + 1);
      const endHours = String(now.getHours()).padStart(2, '0');
      const endMinutes = String(now.getMinutes()).padStart(2, '0');
      const endDay = String(now.getDate()).padStart(2, '0');
      const endMonth = String(now.getMonth() + 1).padStart(2, '0');
      const endYear = now.getFullYear();
      
      setEventEnd(`${endYear}-${endMonth}-${endDay}T${endHours}:${endMinutes}`);
    }
  }, [isEventModalOpen, eventStart]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut if typing in inputs
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.getAttribute('contenteditable') === 'true';

      // CMD+K or CTRL+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
        setTimeout(() => paletteInputRef.current?.focus(), 50);
        return;
      }

      if (isInput) return;

      // Single-key shortcuts
      switch (e.key) {
        case 'c':
          e.preventDefault();
          setIsComposeOpen(true);
          break;
        case 'g':
          e.preventDefault();
          setCurrentTab('inbox');
          break;
        case 's':
          e.preventDefault();
          setIsSearchOpen(true);
          break;
        case 'm':
          e.preventDefault();
          setIsEventModalOpen(true);
          break;
        case 'k':
          e.preventDefault();
          setIsPaletteOpen(true);
          setTimeout(() => paletteInputRef.current?.focus(), 50);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Send Email
  const handleSendEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) return;

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsComposeOpen(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        // Reload list
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Thread Reply
  const handleSendReply = async () => {
    if (!selectedThread || !replyBody) return;
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedThread.emails[selectedThread.emails.length - 1].sender,
          subject: `Re: ${selectedThread.subject}`,
          body: replyBody,
          threadId: selectedThread.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setReplyBody('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Schedule Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventStart || !eventEnd) return;

    try {
      const startDate = new Date(eventStart);
      const endDate = new Date(eventEnd);
      if (endDate <= startDate) {
        showToast('End time must be after start time', 'error');
        return;
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDesc,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          location: eventLocation
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEventModalOpen(false);
        setEventTitle('');
        setEventStart('');
        setEventEnd('');
        setEventLocation('');
        setEventDesc('');
        // Navigate to the week containing the created event
        const today = new Date();
        const todaySunday = new Date(today);
        todaySunday.setDate(today.getDate() - today.getDay());
        const eventSunday = new Date(startDate);
        eventSunday.setDate(startDate.getDate() - startDate.getDay());
        const diffWeeks = Math.round(
          (eventSunday.getTime() - todaySunday.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        setCalWeekOffset(diffWeeks);
        setCurrentTab('calendar');
        await loadData(diffWeeks);
        showToast(`"${eventTitle}" added to your calendar ✓`);
      } else {
        showToast(data.error || 'Failed to create event', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Something went wrong creating the event', 'error');
    }
  };

  // Handle Delete Event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      const res = await fetch(`/api/events?id=${selectedEvent.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setIsDetailsModalOpen(false);
        setSelectedEvent(null);
        loadData(calWeekOffset);
        showToast('Event deleted successfully ✓');
      } else {
        showToast(data.error || 'Failed to delete event', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Something went wrong deleting the event', 'error');
    }
  };

  // Handle Workspace Search
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!searchQuery) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.results);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Handle Agent Message Submit
  const handleAgentSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAgentTyping(true);

    try {
      // Build history payload
      const history = chatMessages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history
        })
      });
      
      const data = await res.json();
      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: Math.random().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, assistantMsg]);
        
        // If actions were executed, reload database items (emails/meetings)
        if (data.actionsExecuted && data.actionsExecuted.length > 0) {
          loadData();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAgentTyping(false);
    }
  };

  // Command palette navigation
  const runPaletteAction = (action: string) => {
    setIsPaletteOpen(false);
    setPaletteSearch('');
    
    if (action === 'compose') {
      setIsComposeOpen(true);
    } else if (action === 'meeting') {
      setIsEventModalOpen(true);
    } else if (action === 'inbox') {
      setCurrentTab('inbox');
    } else if (action === 'calendar') {
      setCurrentTab('calendar');
    } else if (action === 'chat') {
      setCurrentTab('chat');
    } else if (action === 'settings') {
      setCurrentTab('settings');
    }
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'Important':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Normal':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Low':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#07080b] font-sans text-gray-200 antialiased overflow-hidden">
      
      {/* 1. SIDEBAR Navigation */}
      <aside className="w-64 border-r border-[#191b24] bg-[#0c0d12] flex flex-col justify-between p-4 select-none">
        <div className="space-y-6">
          {/* App Header */}
          <div className="flex items-center space-x-3 px-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 pulse-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center">
                FlowMail <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AI</span>
              </h1>
              <p className="text-[10px] text-gray-400">Workspace Dashboard</p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 px-1 text-xs">
            <div className="bg-[#12131b]/60 border border-[#1f2230] rounded-md p-2 flex flex-col">
              <span className="text-[10px] text-gray-400">Unread Threads</span>
              <span className="text-lg font-bold text-white mt-1">
                {threads.filter(t => t.emails.some(e => !e.isRead)).length}
              </span>
            </div>
            <div className="bg-[#12131b]/60 border border-[#1f2230] rounded-md p-2 flex flex-col">
              <span className="text-[10px] text-gray-400">Today's Events</span>
              <span className="text-lg font-bold text-white mt-1">
                {events.filter(e => new Date(e.startTime).toDateString() === new Date().toDateString()).length}
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
              { id: 'inbox', label: 'Inbox', icon: Inbox },
              { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
              { id: 'chat', label: 'AI MCP Agent', icon: Bot },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
            ].map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive 
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-inner' 
                      : 'text-gray-400 hover:bg-[#12131b]/60 hover:text-gray-200 border border-transparent'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="border-t border-[#191b24] pt-4 flex items-center justify-between px-2">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {isSignedIn ? (
                <UserButton />
              ) : (
                <div className="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-indigo-400" />
                </div>
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-white">Workspace User</span>
              <span className="text-[9px] text-gray-400">you@flowmail.ai</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsPaletteOpen(true)}
            className="p-1.5 hover:bg-[#12131b] border border-[#1f2230] rounded-md text-gray-400 hover:text-white transition-colors"
            title="Open keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#07080b]">
        
        {/* Top Header Panel */}
        <header className="h-14 border-b border-[#191b24] px-6 flex items-center justify-between bg-[#090a0f] shrink-0">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold capitalize text-white">{currentTab}</span>
            <span className="text-xs text-gray-500">|</span>
            <div className="flex items-center space-x-1.5 text-xs text-gray-400 bg-[#12131b] border border-[#1f2230] px-2 py-1 rounded-md">
              <span className="kbd-key">K</span>
              <span>Command Palette</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Search Triggers */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center space-x-2 bg-[#12131b] border border-[#1f2230] hover:border-indigo-500/30 rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-all w-64"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search emails & events...</span>
              <span className="ml-auto kbd-key">S</span>
            </button>

            {/* Quick Create buttons */}
            <button 
              onClick={() => setIsComposeOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg px-3 py-1.5 flex items-center space-x-1 shadow-md shadow-indigo-600/10 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Compose</span>
              <span className="ml-1.5 text-[9px] opacity-70 bg-black/20 px-1 py-0.5 rounded">C</span>
            </button>
          </div>
        </header>

        {/* Interactive Tab Views */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-[#07080b]/90 flex items-center justify-center z-50">
              <div className="flex flex-col items-center space-y-3">
                <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                <span className="text-xs text-gray-400">Syncing with Corsair...</span>
              </div>
            </div>
          )}

          {/* VIEW: OVERVIEW/DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="h-full overflow-y-auto p-6 space-y-6">
              {/* Welcome Alert */}
              <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-transparent border border-indigo-500/30 rounded-xl p-5 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center">
                      Welcome back, Maker! <Sparkles className="h-4.5 w-4.5 text-cyan-400 ml-1.5" />
                    </h2>
                    <p className="text-sm text-gray-300 mt-1 max-w-xl">
                      FlowMail AI has integrated Gmail & Google Calendar through Corsair. Use natural language AI chat to automate scheduling or keyboard navigation to navigate fast.
                    </p>
                  </div>
                  <button 
                    onClick={() => setCurrentTab('chat')}
                    className="bg-white text-black font-semibold text-xs rounded-lg px-3 py-2 flex items-center space-x-1.5 hover:bg-gray-100 transition-colors w-fit shrink-0"
                  >
                    <span>Talk to MCP Agent</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Connection Warning Alert */}
              {(!gmailConnected || !calendarConnected) && (
                <div className="bg-gradient-to-r from-yellow-950/40 via-amber-900/20 to-transparent border border-amber-500/30 rounded-xl p-5 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-400 mr-2 shrink-0" />
                        Google Account Connection Required
                      </h2>
                      <p className="text-xs text-gray-300 mt-1 max-w-xl">
                        To load your actual emails and calendar events instead of mock data, you need to connect your Google account via Corsair.
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setCurrentTab('settings');
                      }}
                      className="bg-amber-500 text-black font-semibold text-xs rounded-lg px-3 py-2 flex items-center space-x-1.5 hover:bg-amber-400 transition-colors w-fit shrink-0"
                    >
                      <span>Connect Now</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}


              {/* Stats & Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Critical Actions & Suggestions */}
                <div className="bg-[#0c0d12] border border-[#191b24] rounded-xl p-4 flex flex-col space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Action suggestions</h3>
                  
                  <div className="space-y-2.5">
                    {/* Action 1 */}
                    <div className="bg-[#12131b] border border-[#1f2230] rounded-lg p-3 flex items-start space-x-3 hover:border-indigo-500/20 transition-all cursor-pointer">
                      <div className="h-7 w-7 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-white block">Production db migration sync</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Alex requested sync for index locks at 4:30 PM.</span>
                        <button 
                          onClick={() => {
                            setCurrentTab('calendar');
                          }}
                          className="text-[10px] text-indigo-400 font-semibold mt-1 hover:underline flex items-center"
                        >
                          View Meeting <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
                        </button>
                      </div>
                    </div>

                    {/* Action 2 */}
                    <div className="bg-[#12131b] border border-[#1f2230] rounded-lg p-3 flex items-start space-x-3 hover:border-indigo-500/20 transition-all cursor-pointer">
                      <div className="h-7 w-7 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-white block">Review Figma prototypes</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">UX sync tomorrow 10:00 AM with Sarah.</span>
                        <button 
                          onClick={() => {
                            setCurrentTab('inbox');
                            const uxT = threads.find(t => t.id === 'thread_2');
                            if (uxT) setSelectedThread(uxT);
                          }}
                          className="text-[10px] text-indigo-400 font-semibold mt-1 hover:underline flex items-center"
                        >
                          Read Sarah's Feedback <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Priority Mail Overview */}
                <div className="bg-[#0c0d12] border border-[#191b24] rounded-xl p-4 flex flex-col space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Critical & Important Inbox</h3>
                    <button 
                      onClick={() => setCurrentTab('inbox')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline flex items-center"
                    >
                      <span>Open full inbox</span>
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-[#191b24]">
                    {threads.filter(t => t.priority === 'Critical' || t.priority === 'Important').slice(0, 3).map(thread => (
                      <div 
                        key={thread.id} 
                        onClick={() => {
                          setSelectedThread(thread);
                          setCurrentTab('inbox');
                        }}
                        className="py-3 flex items-center justify-between hover:bg-[#12131b]/35 px-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getPriorityBadgeStyle(thread.priority)}`}>
                            {thread.priority}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-white block truncate">{thread.subject}</span>
                            <span className="text-[11px] text-gray-400 block truncate">{thread.snippet}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-500 ml-4 shrink-0">
                          {new Date(thread.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Upcoming Schedule */}
                <div className="bg-[#0c0d12] border border-[#191b24] rounded-xl p-4 flex flex-col space-y-4 lg:col-span-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Today's Agenda</h3>
                    <button 
                      onClick={() => setCurrentTab('calendar')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline flex items-center"
                    >
                      <span>View full calendar</span>
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.slice(0, 3).map(event => (
                      <div key={event.id} className="bg-[#12131b] border border-[#1f2230] rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/30 transition-all duration-150">
                        <div>
                          <span className="text-xs font-bold text-white block">{event.title}</span>
                          <span className="text-[11px] text-gray-400 block mt-1 line-clamp-2">{event.description}</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-[#1f2230] space-y-1.5 text-[10px] text-gray-400">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="h-3.5 w-3.5 text-indigo-400" />
                            <span>
                              {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center space-x-1.5 truncate">
                              <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: INBOX */}
          {currentTab === 'inbox' && (
            <div className="h-full flex" style={{background: '#07080b'}}>
              {/* LEFT: Thread List */}
              <div className="flex flex-col h-full bg-[#0a0b10] border-r border-[#181921]" style={{width: '380px', minWidth: '320px'}}>
                {/* Toolbar */}
                <div className="px-4 py-3 border-b border-[#181921] flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">Inbox</span>
                    {threads.filter(t => t.emails.some(e => !e.isRead)).length > 0 && (
                      <span className="text-[10px] font-bold bg-indigo-600 text-white rounded-full px-2 py-0.5">
                        {threads.filter(t => t.emails.some(e => !e.isRead)).length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setIsComposeOpen(true)} className="p-1.5 rounded-lg hover:bg-[#1f2230] text-gray-400 hover:text-white transition-colors" title="Compose">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button onClick={() => loadData(calWeekOffset)} className="p-1.5 rounded-lg hover:bg-[#1f2230] text-gray-400 hover:text-white transition-colors" title="Refresh">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="px-4 py-2 flex items-center space-x-1 border-b border-[#181921] shrink-0">
                  {['All', 'Unread', 'Critical'].map(tab => {
                    const isActive = inboxFilter === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setInboxFilter(tab as any)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                          isActive
                            ? 'bg-indigo-600/20 text-indigo-400'
                            : 'text-gray-400 hover:bg-[#1f2230] hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                {/* Thread rows */}
                <div className="flex-1 overflow-y-auto">
                  {(() => {
                    const filteredThreads = threads.filter(thread => {
                      if (inboxFilter === 'Unread') {
                        return thread.emails.some(e => !e.isRead);
                      }
                      if (inboxFilter === 'Critical') {
                        return thread.priority === 'Critical';
                      }
                      return true; // 'All'
                    });

                    if (filteredThreads.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                          <Inbox className="h-12 w-12 opacity-20" />
                          <span className="text-sm">
                            {inboxFilter === 'Unread'
                              ? 'No unread emails'
                              : inboxFilter === 'Critical'
                              ? 'No critical emails'
                              : 'No emails yet'}
                          </span>
                        </div>
                      );
                    }

                    return filteredThreads.map(thread => {
                    const isSelected = selectedThread?.id === thread.id;
                    const hasUnread = thread.emails.some(e => !e.isRead);
                    const lastEmail = thread.emails[thread.emails.length - 1];
                    const senderName = lastEmail?.sender?.split('@')[0] || 'Unknown';
                    const senderInitial = senderName[0]?.toUpperCase() || '?';
                    const priorityDotColor = {
                      Critical: 'bg-red-500',
                      Important: 'bg-orange-500',
                      Normal: 'bg-blue-400',
                      Low: 'bg-emerald-400',
                    }[thread.priority] || 'bg-gray-500';
                    // Avatar gradient per sender
                    const avatarColors = [
                      'from-violet-600 to-indigo-600',
                      'from-rose-600 to-pink-500',
                      'from-emerald-600 to-teal-500',
                      'from-amber-500 to-orange-500',
                      'from-cyan-600 to-blue-600',
                    ];
                    const colorIdx = senderName.charCodeAt(0) % avatarColors.length;

                    return (
                      <div
                        key={thread.id}
                        onClick={() => setSelectedThread(thread)}
                        className={`px-4 py-3 flex items-start space-x-3 cursor-pointer transition-all duration-100 border-b border-[#12131b] relative group ${
                          isSelected
                            ? 'bg-indigo-600/10 border-l-[3px] border-l-indigo-500'
                            : 'hover:bg-[#0f1018] border-l-[3px] border-l-transparent'
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center font-bold text-sm text-white shrink-0 mt-0.5`}>
                          {senderInitial}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-[13px] truncate ${hasUnread ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>
                              {senderName}
                            </span>
                            <span className="text-[10px] text-gray-500 shrink-0 ml-2">
                              {new Date(thread.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            {hasUnread && <span className={`h-1.5 w-1.5 rounded-full ${priorityDotColor} shrink-0`} />}
                            <p className={`text-[12px] truncate ${hasUnread ? 'font-semibold text-gray-200' : 'text-gray-400'}`}>
                              {thread.subject}
                            </p>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {thread.snippet}
                          </p>
                        </div>

                        {/* Priority indicator on right */}
                        <div className="flex flex-col items-end space-y-1 shrink-0">
                          {thread.priority === 'Critical' && (
                            <span className="text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                              !
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
                </div>
              </div>

              {/* RIGHT: Thread Viewer */}
              <div className="flex-1 flex flex-col h-full min-w-0" style={{background: '#07080b'}}>
                {selectedThread ? (
                  <div className="flex flex-col h-full">
                    {/* Thread header bar */}
                    <div className="px-8 py-4 border-b border-[#181921] shrink-0 bg-[#09090e]">
                      <h2 className="text-[15px] font-bold text-white leading-tight">{selectedThread.subject}</h2>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getPriorityBadgeStyle(selectedThread.priority)}`}>
                          {selectedThread.priority} Priority
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {selectedThread.emails.length} message{selectedThread.emails.length !== 1 ? 's' : ''} · Updated {new Date(selectedThread.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        {selectedThread.emails[0]?.reason && (
                          <span className="text-[10px] text-indigo-400 flex items-center">
                            <Sparkles className="h-3 w-3 mr-1" /> AI classified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Email messages */}
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                      {selectedThread.emails.map((email, idx) => {
                        const isOut = email.direction === 'outgoing';
                        const sInit = email.sender?.[0]?.toUpperCase() || '?';
                        return (
                          <div key={email.id} className="group">
                            {/* Sender row */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                                  isOut ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-gradient-to-br from-gray-600 to-gray-700'
                                }`}>
                                  {sInit}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[13px] font-semibold text-white">{email.sender}</span>
                                    {isOut && <span className="text-[10px] bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded font-bold">You</span>}
                                  </div>
                                  <span className="text-[10px] text-gray-500">to {email.recipient}</span>
                                </div>
                              </div>
                              <span className="text-[11px] text-gray-500">
                                {new Date(email.receivedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Email body card */}
                            <div className={`ml-11 rounded-2xl p-5 ${
                              isOut
                                ? 'bg-indigo-600/10 border border-indigo-500/20'
                                : 'bg-[#0f1018] border border-[#1a1c28]'
                            }`}>
                              {/* Calendar Invite Block */}
                              {email.inviteEvent && (
                                <div className="mb-6 border border-[#232430] rounded-xl overflow-hidden bg-[#10111a] text-gray-300 max-w-lg shadow-2xl relative">
                                  {/* Top Right Action Icons */}
                                  <div className="absolute top-4 right-4 flex items-center space-x-3 text-gray-400">
                                    <button className="hover:text-white p-1 transition-colors" title="Edit Event">
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button className="hover:text-white p-1 transition-colors" title="Delete Event">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                    <button className="hover:text-white p-1 transition-colors">
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                    </button>
                                    <button className="hover:text-white p-1 transition-colors">
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="p-6 space-y-6">
                                    {/* Title & Date Section */}
                                    <div className="flex items-start space-x-3 pr-24">
                                      {/* Blue color dot */}
                                      <span className="h-4.5 w-4.5 rounded bg-[#039be5] mt-1 shrink-0 block" />
                                      <div>
                                        <h4 className="text-xl font-medium text-white tracking-tight leading-tight">
                                          {email.inviteEvent.title}
                                        </h4>
                                        <p className="text-[13px] text-gray-400 mt-1">
                                          {new Date(email.inviteEvent.startTime).toLocaleString(undefined, {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long'
                                          })}
                                          {' · '}
                                          {new Date(email.inviteEvent.startTime).toLocaleTimeString(undefined, {
                                            hour: 'numeric',
                                            minute: '2-digit'
                                          }).toLowerCase()}
                                          {' – '}
                                          {new Date(email.inviteEvent.endTime).toLocaleTimeString(undefined, {
                                            hour: 'numeric',
                                            minute: '2-digit'
                                          }).toLowerCase()}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Google Meet Section */}
                                    {email.inviteEvent.googleMeetLink && (
                                      <div className="flex items-start space-x-3">
                                        <svg className="h-5 w-5 mt-1 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M21.3 3H2.7A1.7 1.7 0 001 4.7v14.6A1.7 1.7 0 002.7 21h18.6a1.7 1.7 0 001.7-1.7V4.7A1.7 1.7 0 0021.3 3zm-6.8 13.5l-3.5-3.5v3.5H7.5v-7h3.5v3.5l3.5-3.5h4v7h-4z"/>
                                        </svg>
                                        <div className="flex-1">
                                          <a 
                                            href={email.inviteEvent.googleMeetLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center space-x-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                                          >
                                            <span>Join with Google Meet</span>
                                          </a>
                                          <span className="block text-[11px] text-gray-500 mt-1 font-mono">
                                            {email.inviteEvent.googleMeetLink.replace('https://', '')}
                                          </span>
                                        </div>
                                        <button className="text-gray-400 hover:text-white p-1" title="Copy link">
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 00-2 2v12a2 2 0 002-2v-1" /></svg>
                                        </button>
                                      </div>
                                    )}

                                    {/* Guests Section */}
                                    {email.inviteEvent.guests && (
                                      <div className="flex items-start space-x-3">
                                        <Users className="h-5 w-5 mt-1 text-gray-400 shrink-0" />
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <span className="text-xs font-semibold text-gray-300 block">
                                                {email.inviteEvent.guests.length} guests
                                              </span>
                                              <span className="text-[11px] text-gray-500 block mt-0.5">
                                                {email.inviteEvent.guests.filter(g => g.status === 'yes').length} yes,{' '}
                                                {email.inviteEvent.guests.filter(g => g.status === 'awaiting').length} awaiting
                                              </span>
                                            </div>
                                            <button className="text-gray-400 hover:text-white p-1" title="Email guests">
                                              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            </button>
                                          </div>

                                          {/* Guest list mapping */}
                                          <div className="mt-3 space-y-2.5">
                                            {email.inviteEvent.guests.map((guest, i) => {
                                              const init = guest.name[0]?.toUpperCase() || '?';
                                              const isYes = (rsvps[email.id] === 'yes' && guest.email === 'you@flowmail.ai') || (guest.email !== 'you@flowmail.ai' && guest.status === 'yes');
                                              return (
                                                <div key={i} className="flex items-center justify-between">
                                                  <div className="flex items-center space-x-2.5">
                                                    <div className="relative">
                                                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                                        {init}
                                                      </div>
                                                      {isYes && (
                                                        <span className="absolute -bottom-1 -right-1 bg-green-500 border border-[#10111a] rounded-full p-0.5 flex items-center justify-center">
                                                          <Check className="h-2 w-2 text-white" strokeWidth={4} />
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div>
                                                      <span className="text-xs font-semibold text-white block leading-tight">
                                                        {guest.name}
                                                      </span>
                                                      {guest.isOrganizer && (
                                                        <span className="text-[9px] text-gray-500 block">Organiser</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Notifications Section */}
                                    {email.inviteEvent.notifications && (
                                      <div className="flex items-start space-x-3">
                                        <Clock className="h-5 w-5 mt-1 text-gray-400 shrink-0" />
                                        <div className="text-xs text-gray-400 space-y-1">
                                          {email.inviteEvent.notifications.map((n, i) => (
                                            <span key={i} className="block">{n}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Organizer Section */}
                                    <div className="flex items-start space-x-3">
                                      <svg className="h-5 w-5 mt-1 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                      <span className="text-xs text-gray-300">
                                        {email.inviteEvent.organizerName || email.inviteEvent.organizer}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Footer RSVP Action Buttons */}
                                  <div className="border-t border-[#232430] bg-[#0c0d15] px-6 py-4 flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Going?</span>
                                    <div className="flex items-center space-x-2">
                                      {(['yes', 'no', 'maybe'] as const).map((status) => {
                                        const currentRsvp = rsvps[email.id] || email.inviteEvent?.guests?.find(g => g.email === 'you@flowmail.ai')?.status;
                                        const isSelected = currentRsvp === status;
                                        
                                        let btnStyle = 'border border-[#232430] text-gray-400 hover:text-white hover:bg-[#1a1b26]';
                                        if (isSelected) {
                                          btnStyle = 'bg-[#e8f0fe] text-[#1a73e8] border-transparent font-bold';
                                        }
                                        
                                        return (
                                          <button
                                            key={status}
                                            onClick={() => handleRsvp(email, status)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all duration-150 ${btnStyle}`}
                                          >
                                            {status}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <p className="text-[13px] leading-7 text-gray-200 whitespace-pre-line">
                                {email.body}
                              </p>

                              {/* AI Insight */}
                              {email.priority && email.reason && (
                                <div className="mt-4 pt-4 border-t border-[#1f2230]/60">
                                  <div className="flex items-start space-x-2 bg-indigo-500/5 rounded-xl p-3 border border-indigo-500/15">
                                    <Sparkles className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
                                    <div>
                                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">AI Insight</span>
                                      <p className="text-[11px] text-gray-300 mt-1 italic">{email.reason}</p>
                                      {email.actionItems && email.actionItems.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {email.actionItems.map((item, i) => (
                                            <div key={i} className="flex items-center space-x-1.5 text-[11px] text-cyan-300">
                                              <CheckCircle2 className="h-3 w-3 text-cyan-500 shrink-0" />
                                              <span>{item}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply box */}
                    <div className="px-8 py-4 border-t border-[#181921] bg-[#09090e] shrink-0">
                      <div className="border border-[#1f2230] rounded-2xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
                        <div className="px-4 py-2 border-b border-[#181921] bg-[#0f1018]">
                          <span className="text-[11px] text-gray-500">
                            Replying to <span className="text-gray-300 font-medium">{selectedThread.emails[selectedThread.emails.length - 1]?.sender}</span>
                          </span>
                        </div>
                        <textarea
                          placeholder="Write your reply..."
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          rows={4}
                          className="w-full bg-[#0f1018] text-[13px] text-white px-4 py-3 border-0 outline-none ring-0 focus:ring-0 resize-none placeholder-gray-600 leading-relaxed"
                        />
                        <div className="px-4 py-3 bg-[#0f1018] flex items-center justify-between">
                          <span className="text-[10px] text-gray-600">Sends via Corsair SMTP</span>
                          <button
                            onClick={handleSendReply}
                            disabled={!replyBody.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-[12px] rounded-xl px-5 py-2 flex items-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Send Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center flex-col space-y-4">
                    <div className="h-20 w-20 rounded-full bg-[#0f1018] border border-[#1a1c28] flex items-center justify-center">
                      <Inbox className="h-9 w-9 text-gray-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 font-medium">Select a conversation</p>
                      <p className="text-gray-600 text-sm mt-1">Choose a thread from the list to read it</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: CALENDAR */}
          {currentTab === 'calendar' && (
            <div className="h-full flex" style={{background: '#07080b'}}>
              {/* LEFT SIDEBAR: Mini calendar + agenda */}
              <div className="flex flex-col h-full bg-[#0a0b10] border-r border-[#181921] overflow-y-auto" style={{width: '280px', minWidth: '240px'}}>
                {/* Create event button */}
                <div className="p-4 border-b border-[#181921]">
                  <button
                    onClick={() => setIsEventModalOpen(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Event</span>
                  </button>
                </div>

                {/* Mini month calendar */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white">
                      {miniCalDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setMiniCalDate(prev => {
                            const d = new Date(prev);
                            d.setMonth(prev.getMonth() - 1);
                            return d;
                          });
                        }}
                        className="p-1 rounded hover:bg-[#1f2230] text-gray-400 hover:text-white transition-colors text-xs"
                      >‹</button>
                      <button
                        onClick={() => {
                          setMiniCalDate(prev => {
                            const d = new Date(prev);
                            d.setMonth(prev.getMonth() + 1);
                            return d;
                          });
                        }}
                        className="p-1 rounded hover:bg-[#1f2230] text-gray-400 hover:text-white transition-colors text-xs"
                      >›</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-0 text-center">
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                      <div key={i} className="text-[10px] font-bold text-gray-500 py-1">{d}</div>
                    ))}
                    {(() => {
                      const firstDay = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), 1);
                      const daysInMonth = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() + 1, 0).getDate();
                      const startDow = firstDay.getDay();
                      const cells = [];
                      for (let i = 0; i < startDow; i++) cells.push(<div key={`e${i}`} />);
                      
                      // Calculate the start and end of the currently viewed week on the big calendar grid
                      const base = new Date();
                      const weekStart = new Date(base);
                      weekStart.setDate(base.getDate() - base.getDay() + calWeekOffset * 7);
                      weekStart.setHours(0,0,0,0);
                      
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 7);

                      for (let d = 1; d <= daysInMonth; d++) {
                        const cellDate = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), d);
                        const isToday = d === new Date().getDate() && 
                                        miniCalDate.getMonth() === new Date().getMonth() &&
                                        miniCalDate.getFullYear() === new Date().getFullYear();
                        
                        const isSelectedWeek = cellDate.getTime() >= weekStart.getTime() && cellDate.getTime() < weekEnd.getTime();
                        
                        const hasEvent = events.some(ev => {
                          const evDate = new Date(ev.startTime);
                          return (
                            evDate.getDate() === d &&
                            evDate.getMonth() === miniCalDate.getMonth() &&
                            evDate.getFullYear() === miniCalDate.getFullYear()
                          );
                        });

                        const highlightClass = isToday
                          ? 'bg-indigo-600 text-white font-bold'
                          : isSelectedWeek
                          ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                          : 'text-gray-400 hover:bg-[#1f2230] hover:text-white';

                        cells.push(
                          <div
                            key={d}
                            onClick={() => {
                              // Find start of the week for today
                              const today = new Date();
                              const todaySunday = new Date(today);
                              todaySunday.setDate(today.getDate() - today.getDay());
                              todaySunday.setHours(0,0,0,0);
                              
                              // Find start of the week for the clicked date
                              const clickedSunday = new Date(cellDate);
                              clickedSunday.setDate(cellDate.getDate() - cellDate.getDay());
                              clickedSunday.setHours(0,0,0,0);
                              
                              // Calculate week difference
                              const diffMs = clickedSunday.getTime() - todaySunday.getTime();
                              const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
                              
                              setCalWeekOffset(diffWeeks);
                              loadData(diffWeeks);
                            }}
                            className={`relative h-7 w-7 mx-auto flex items-center justify-center text-[12px] rounded-full cursor-pointer transition-all ${highlightClass}`}
                          >
                            {d}
                            {hasEvent && !isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-500" />}
                          </div>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>

                {/* Upcoming events list */}
                <div className="px-4 pb-4">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h3>
                  <div className="space-y-2">
                    {events.slice(0, 8).map((event, idx) => {
                      const eventColors = [
                        'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500',
                        'bg-amber-500', 'bg-cyan-500', 'bg-purple-500'
                      ];
                      const col = eventColors[idx % eventColors.length];
                      return (
                        <div
                          key={event.id}
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsDetailsModalOpen(true);
                          }}
                          className="flex items-start space-x-2.5 py-2 px-3 rounded-xl hover:bg-[#0f1018] transition-colors cursor-pointer group"
                        >
                          <div className={`h-2.5 w-2.5 rounded-full ${col} mt-1.5 shrink-0`} />
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-gray-200 truncate group-hover:text-white transition-colors">{event.title}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {events.length === 0 && (
                      <div className="text-center py-6 text-gray-600">
                        <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No upcoming events</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Week grid view */}
              <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
                {/* Week nav header */}
                <div className="px-6 py-3 border-b border-[#181921] bg-[#09090e] flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => { setCalWeekOffset(0); loadData(0); }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        calWeekOffset === 0 ? 'bg-indigo-600 text-white' : 'bg-[#1f2230] hover:bg-[#2a2d3e] text-gray-300'
                      }`}
                    >Today</button>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => { const n = calWeekOffset - 1; setCalWeekOffset(n); loadData(n); }}
                        className="p-1.5 rounded-lg hover:bg-[#1f2230] text-gray-400 hover:text-white transition-colors"
                      >‹</button>
                      <button
                        onClick={() => { const n = calWeekOffset + 1; setCalWeekOffset(n); loadData(n); }}
                        className="p-1.5 rounded-lg hover:bg-[#1f2230] text-gray-400 hover:text-white transition-colors"
                      >›</button>
                    </div>
                    <h2 className="text-sm font-bold text-white">
                      {(() => {
                        const base = new Date();
                        const startOfWeek = new Date(base);
                        startOfWeek.setDate(base.getDate() - base.getDay() + calWeekOffset * 7);
                        const endOfWeek = new Date(startOfWeek);
                        endOfWeek.setDate(startOfWeek.getDate() + 6);
                        return `${startOfWeek.toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${endOfWeek.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`;
                      })()}
                    </h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => loadData(calWeekOffset)} className="p-1.5 rounded-lg hover:bg-[#1f2230] text-gray-400 hover:text-white transition-colors">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] text-gray-600 bg-[#0f1018] border border-[#181921] px-2 py-1 rounded-lg">
                      {events.length} events total
                    </span>
                  </div>
                </div>

                {/* Day column headers */}
                <div className="grid border-b border-[#181921] shrink-0" style={{gridTemplateColumns: '60px repeat(7, 1fr)'}}>
                  <div className="py-3" />
                  {Array.from({length: 7}).map((_, i) => {
                    const base = new Date();
                    const day = new Date(base);
                    day.setDate(base.getDate() - base.getDay() + calWeekOffset * 7 + i);
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <div key={i} className="py-3 text-center border-l border-[#181921]">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${ isToday ? 'text-indigo-400' : 'text-gray-500' }`}>
                          {day.toLocaleDateString(undefined, { weekday: 'short' })}
                        </p>
                        <div className={`mx-auto mt-1 h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold ${
                          isToday ? 'bg-indigo-600 text-white' : 'text-gray-300'
                        }`}>
                          {day.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time grid + events */}
                <div ref={calendarScrollRef} className="flex-1 overflow-y-auto relative">
                  {/* Empty state when this week has no events */}
                  {events.filter(ev => {
                    const base = new Date();
                    const weekStart = new Date(base);
                    weekStart.setDate(base.getDate() - base.getDay() + calWeekOffset * 7);
                    weekStart.setHours(0,0,0,0);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 7);
                    const t = new Date(ev.startTime).getTime();
                    return t >= weekStart.getTime() && t < weekEnd.getTime();
                  }).length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
                      <div className="bg-[#0c0d14]/90 backdrop-blur-sm border border-[#1f2230] rounded-2xl px-8 py-6 flex flex-col items-center space-y-3 pointer-events-auto">
                        <CalendarIcon className="h-10 w-10 text-gray-600" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-300">No events this week</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {calWeekOffset !== 0 ? 'Use ‹ › to browse other weeks' : 'Create an event or check another week'}
                          </p>
                        </div>
                        <button
                          onClick={() => setIsEventModalOpen(true)}
                          className="mt-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          + Create Event
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid min-h-full" style={{gridTemplateColumns: '60px repeat(7, 1fr)'}}>
                    {/* Time labels column */}
                    <div className="relative">
                      {Array.from({length: 24}).map((_, h) => (
                        <div key={h} className="h-16 flex items-start justify-end pr-2 pt-1">
                          <span className="text-[10px] text-gray-600 font-mono">
                            {h === 0 ? '' : `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 7 day columns */}
                    {Array.from({length: 7}).map((_, dayIdx) => {
                      const base = new Date();
                      const colDay = new Date(base);
                      colDay.setDate(base.getDate() - base.getDay() + calWeekOffset * 7 + dayIdx);
                      const isToday = colDay.toDateString() === new Date().toDateString();

                      // events for this day — compare date robustly using year, month, and day parts in local time
                      const dayEvents = events.filter(ev => {
                        const evDate = new Date(ev.startTime);
                        return (
                          evDate.getFullYear() === colDay.getFullYear() &&
                          evDate.getMonth() === colDay.getMonth() &&
                          evDate.getDate() === colDay.getDate()
                        );
                      });

                      const eventColors = [
                        'bg-indigo-600/80 border-indigo-500 text-indigo-100',
                        'bg-emerald-600/80 border-emerald-500 text-emerald-100',
                        'bg-rose-600/80 border-rose-500 text-rose-100',
                        'bg-amber-600/80 border-amber-500 text-amber-100',
                        'bg-cyan-600/80 border-cyan-500 text-cyan-100',
                        'bg-purple-600/80 border-purple-500 text-purple-100',
                      ];

                      return (
                        <div key={dayIdx} className={`relative border-l border-[#181921] ${ isToday ? 'bg-indigo-600/[0.03]' : '' }`}>
                          {/* Hour grid lines */}
                          {Array.from({length: 24}).map((_, h) => (
                            <div key={h} className="h-16 border-b border-[#181921]/50" />
                          ))}

                          {/* Half-hour lines */}
                          {Array.from({length: 24}).map((_, h) => (
                            <div
                              key={`h${h}`}
                              className="absolute w-full border-b border-dashed border-[#181921]/30"
                              style={{top: `${h * 64 + 32}px`, left: 0}}
                            />
                          ))}

                          {/* Current time indicator */}
                          {isToday && (
                            <div
                              className="absolute left-0 right-0 z-20 flex items-center"
                              style={{top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 60 * 64}px`}}
                            >
                              <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
                              <div className="flex-1 h-px bg-red-500" />
                            </div>
                          )}

                          {/* Event blocks */}
                          {dayEvents.map((event, evIdx) => {
                            const start = new Date(event.startTime);
                            const end = new Date(event.endTime);
                            const startMin = start.getHours() * 60 + start.getMinutes();
                            const durationMin = Math.max(30, (end.getTime() - start.getTime()) / 60000);
                            const top = (startMin / 60) * 64;
                            const height = Math.max(32, (durationMin / 60) * 64 - 2);
                            const colorClass = eventColors[evIdx % eventColors.length];

                            return (
                              <div
                                key={event.id}
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setIsDetailsModalOpen(true);
                                }}
                                className={`absolute left-1 right-1 rounded-lg border-l-[3px] px-2 py-1 overflow-hidden cursor-pointer hover:brightness-110 transition-all z-10 ${colorClass}`}
                                style={{top: `${top}px`, height: `${height}px`}}
                              >
                                <p className="text-[11px] font-bold leading-tight truncate">{event.title}</p>
                                {height > 40 && (
                                  <p className="text-[10px] opacity-80 leading-tight mt-0.5">
                                    {start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                  </p>
                                )}
                                {height > 60 && event.location && (
                                  <p className="text-[10px] opacity-70 mt-0.5 truncate flex items-center">
                                    <MapPin className="h-2.5 w-2.5 mr-1 shrink-0" />{event.location}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: MCP AI CHAT */}
          {currentTab === 'chat' && (
            <div className="h-full flex flex-col bg-[#0c0d12]">
              {/* Chat log */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex space-x-2.5 max-w-2xl ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' 
                          : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                      }`}>
                        {msg.role === 'user' ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
                      </div>
                      
                      <div className={`rounded-xl p-4 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[#12131b] border border-[#1f2230] text-gray-200'
                      }`}>
                        <p className="whitespace-pre-line font-mono">{msg.content}</p>
                        <span className="text-[9px] text-gray-400 block mt-2 text-right">{msg.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {isAgentTyping && (
                  <div className="flex justify-start">
                    <div className="flex space-x-2.5">
                      <div className="h-8 w-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <Bot className="h-4.5 w-4.5" />
                      </div>
                      <div className="bg-[#12131b] border border-[#1f2230] rounded-xl p-4 text-xs text-gray-400 flex items-center space-x-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="ml-1 text-[10px]">Calling Corsair MCP tools...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input panel */}
              <div className="p-4 border-t border-[#191b24] bg-[#090a0f] shrink-0">
                <form onSubmit={handleAgentSend} className="bg-[#12131b] border border-[#1f2230] rounded-xl p-3 flex flex-col space-y-2">
                  <input
                    type="text"
                    placeholder="Ask AI agent to schedule a call, send an email, or search details..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="bg-transparent text-xs text-white border-0 outline-0 ring-0 focus:ring-0 w-full"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-[#1f2230]/40">
                    <span className="text-[9px] text-gray-500">Corsair MCP allows direct workflow executions</span>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg px-3 py-1.5 flex items-center space-x-1.5 shadow"
                    >
                      <span>Send to Agent</span>
                      <Send className="h-3 w-3" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {currentTab === 'settings' && (
            <div className="h-full overflow-y-auto p-6 max-w-3xl space-y-6">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Workspace Settings</h2>
                <p className="text-xs text-gray-400">Configure your Corsair integrations, API keys, and environment configs.</p>
              </div>

              {/* Card 1: Integrations connection */}
              <div className="bg-[#0c0d12] border border-[#191b24] rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Integrations</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-[#12131b] border border-[#1f2230] p-4 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Inbox className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">Corsair Gmail Plugin</span>
                        <span className="text-[10px] text-gray-400">Syncs email database threads and replies in realtime</span>
                      </div>
                    </div>
                    {gmailConnected ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Connected</span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Not Connected</span>
                        <button
                          onClick={() => handleConnect('gmail')}
                          className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded font-semibold transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-[#12131b] border border-[#1f2230] p-4 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <CalendarIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">Corsair Google Calendar Plugin</span>
                        <span className="text-[10px] text-gray-400">Automates scheduling, updates events, and handles invitations</span>
                      </div>
                    </div>
                    {calendarConnected ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Connected</span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Not Connected</span>
                        <button
                          onClick={() => handleConnect('calendar')}
                          className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded font-semibold transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Environment configuration */}
              <div className="bg-[#0c0d12] border border-[#191b24] rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Credentials checklist</h3>
                
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#1f2230]">
                    <span className="text-gray-400 font-medium">Clerk Publishable Key</span>
                    <span className="text-gray-300 font-mono text-[10px]">pk_test_... (Detected)</span>
                  </div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#1f2230]">
                    <span className="text-gray-400 font-medium">Clerk Secret Key</span>
                    <span className="text-gray-300 font-mono text-[10px]">sk_test_... (Detected)</span>
                  </div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#1f2230]">
                    <span className="text-gray-400 font-medium">PostgreSQL Database Connection</span>
                    <span className="text-gray-300 font-mono text-[10px]">neon.tech (Active)</span>
                  </div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#1f2230]">
                    <span className="text-gray-400 font-medium">Corsair Instance ID</span>
                    <span className="text-gray-300 font-mono text-[10px]">corsair-flowmail-prod</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">OpenAI API Key</span>
                    <span className="text-yellow-500/80 font-medium bg-yellow-500/5 px-2 py-0.5 rounded border border-yellow-500/10 text-[10px]">Mock mode active (no sk-... key loaded)</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* 3. CMD+K COMMAND PALETTE OVERLAY */}
      {isPaletteOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-center pt-[15vh] z-50">
          <div className="w-full max-w-xl bg-[#0c0d12] border border-[#1f2230] rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[#1f2230] flex items-center space-x-3 bg-[#090a0f]">
              <CommandIcon className="h-4.5 w-4.5 text-indigo-400" />
              <input
                ref={paletteInputRef}
                type="text"
                placeholder="Type a command or search workspace..."
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                className="bg-transparent text-sm text-white border-0 outline-0 ring-0 focus:ring-0 w-full"
              />
              <button onClick={() => setIsPaletteOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
              <span className="text-[10px] uppercase font-bold text-gray-500 px-3 py-1.5 block">Commands</span>
              
              <button 
                onClick={() => runPaletteAction('inbox')}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-indigo-600/15 flex items-center justify-between text-xs text-gray-300 hover:text-white"
              >
                <div className="flex items-center space-x-2.5">
                  <Inbox className="h-4 w-4 text-indigo-400" />
                  <span>Go to Inbox</span>
                </div>
                <span className="kbd-key">G</span>
              </button>

              <button 
                onClick={() => runPaletteAction('calendar')}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-indigo-600/15 flex items-center justify-between text-xs text-gray-300 hover:text-white"
              >
                <div className="flex items-center space-x-2.5">
                  <CalendarIcon className="h-4 w-4 text-indigo-400" />
                  <span>Go to Calendar</span>
                </div>
              </button>

              <button 
                onClick={() => runPaletteAction('chat')}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-indigo-600/15 flex items-center justify-between text-xs text-gray-300 hover:text-white"
              >
                <div className="flex items-center space-x-2.5">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <span>Open MCP Agent Chat</span>
                </div>
              </button>

              <button 
                onClick={() => runPaletteAction('compose')}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-indigo-600/15 flex items-center justify-between text-xs text-gray-300 hover:text-white"
              >
                <div className="flex items-center space-x-2.5">
                  <Plus className="h-4 w-4 text-indigo-400" />
                  <span>Compose New Email</span>
                </div>
                <span className="kbd-key">C</span>
              </button>

              <button 
                onClick={() => runPaletteAction('meeting')}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-indigo-600/15 flex items-center justify-between text-xs text-gray-300 hover:text-white"
              >
                <div className="flex items-center space-x-2.5">
                  <CalendarIcon className="h-4 w-4 text-indigo-400" />
                  <span>Schedule Meeting Event</span>
                </div>
                <span className="kbd-key">M</span>
              </button>

              <button 
                onClick={() => runPaletteAction('settings')}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-indigo-600/15 flex items-center justify-between text-xs text-gray-300 hover:text-white"
              >
                <div className="flex items-center space-x-2.5">
                  <SettingsIcon className="h-4 w-4 text-indigo-400" />
                  <span>Configure Settings</span>
                </div>
              </button>
            </div>
            
            <div className="p-3 border-t border-[#1f2230] bg-[#090a0f] text-[9px] text-gray-500 flex justify-between">
              <span>Use arrow keys to navigate, enter to select</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. WORKSPACE SEARCH OVERLAY */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-center pt-[15vh] z-50">
          <div className="w-full max-w-xl bg-[#0c0d12] border border-[#1f2230] rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[#1f2230] flex items-center space-x-3 bg-[#090a0f]">
              <Search className="h-4.5 w-4.5 text-indigo-400" />
              <input
                type="text"
                placeholder="Search workspace emails and meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="bg-transparent text-sm text-white border-0 outline-0 ring-0 focus:ring-0 w-full"
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              <span className="text-[10px] uppercase font-bold text-gray-500 px-2 block">Search Results</span>
              {searchResults.length > 0 ? (
                searchResults.map(res => (
                  <div 
                    key={res.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      if (res.type === 'email') {
                        setCurrentTab('inbox');
                        const matchedT = threads.find(t => t.id === res.id);
                        if (matchedT) setSelectedThread(matchedT);
                      } else {
                        setCurrentTab('calendar');
                      }
                    }}
                    className="p-3 rounded-lg bg-[#12131b]/60 border border-[#1f2230] hover:border-indigo-500/30 cursor-pointer flex justify-between items-center transition-all"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{res.title}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5 line-clamp-1">{res.subtitle}</span>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase font-bold">
                        {res.type}
                      </span>
                      <span className="text-[9px] text-gray-500 block mt-1">{res.meta}</span>
                    </div>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="text-xs text-gray-500 text-center py-6">No matching emails or calendar events found</div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-6">Type to search using Corsair indexers</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. COMPOSE NEW EMAIL MODAL */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0c0d12] border border-[#1f2230] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[#1f2230] flex items-center justify-between bg-[#090a0f]">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Compose New Email</span>
              <button onClick={() => setIsComposeOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSendEmail} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">To</label>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  required
                  className="w-full bg-[#12131b] border border-[#1f2230] rounded-lg p-2 text-white outline-0 focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Subject</label>
                <input
                  type="text"
                  placeholder="Subject line"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                  className="w-full bg-[#12131b] border border-[#1f2230] rounded-lg p-2 text-white outline-0 focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Body</label>
                <textarea
                  placeholder="Compose your message here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required
                  rows={6}
                  className="w-full bg-[#12131b] border border-[#1f2230] rounded-lg p-2 text-white outline-0 focus:border-indigo-500/50 transition-colors resize-none font-sans"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#1f2230]/40">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 border border-[#1f2230] hover:bg-[#12131b] rounded-lg text-gray-300 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg flex items-center space-x-1.5 shadow"
                >
                  <span>Send Email</span>
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CREATE CALENDAR EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0c0d12] border border-[#1f2230] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[#1f2230] flex items-center justify-between bg-[#090a0f]">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Schedule Calendar Event</span>
              <button onClick={() => setIsEventModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Design Sync"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                  className="w-full bg-[#12131b] border border-[#1f2230] rounded-lg p-2 text-white outline-0 focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Start Time</label>
                  <input
                    type="datetime-local"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    required
                    className="w-full bg-[#12131b] border border-[#1f2230] rounded-lg p-2 text-white outline-0 focus:border-indigo-500/50 transition-colors font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">End Time</label>
                  <input
                    type="datetime-local"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    required
                    className="w-full bg-[#12131b] border border-[#1f2230] rounded-lg p-2 text-white outline-0 focus:border-indigo-500/50 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Location / Link</label>
                <input
                  type="text"
                  placeholder="e.g. Google Meet link or Room"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full bg-[#12131b] border border-[#1f2230] rounded-lg p-2 text-white outline-0 focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Description</label>
                <textarea
                  placeholder="Event agenda / description..."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#12131b] border border-[#1f2230] rounded-lg p-2 text-white outline-0 focus:border-indigo-500/50 transition-colors resize-none font-sans"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#1f2230]/40">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 border border-[#1f2230] hover:bg-[#12131b] rounded-lg text-gray-300 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CALENDAR EVENT DETAILS MODAL */}
      {isDetailsModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0c0d12] border border-[#1f2230] rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[#1f2230] flex items-center justify-between bg-[#090a0f]">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Event Details</span>
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedEvent(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white leading-tight">{selectedEvent.title}</h3>
                {selectedEvent.status && (
                  <span className="inline-block text-[9px] font-bold bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider mt-1">
                    {selectedEvent.status}
                  </span>
                )}
              </div>

              <div className="space-y-2.5 border-t border-[#1f2230]/40 pt-4 text-gray-300">
                <div className="flex items-start space-x-2.5">
                  <Clock className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-200">Time</p>
                    <p className="text-gray-400 mt-0.5">
                      {new Date(selectedEvent.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-gray-500 text-[10px] mt-0.5">
                      {new Date(selectedEvent.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(selectedEvent.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-start space-x-2.5">
                    <MapPin className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-200">Location</p>
                      {selectedEvent.location.startsWith('http') ? (
                        <a href={selectedEvent.location} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline mt-0.5 block break-all">
                          {selectedEvent.location}
                        </a>
                      ) : (
                        <p className="text-gray-400 mt-0.5">{selectedEvent.location}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="flex items-start space-x-2.5">
                    <AlignLeft className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-200">Description</p>
                      <p className="text-gray-400 mt-0.5 whitespace-pre-line leading-relaxed">{selectedEvent.description}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start space-x-2.5">
                    <Users className="h-4 w-4 text-pink-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-200">Guests ({selectedEvent.attendees.length})</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {selectedEvent.attendees.map(email => (
                          <span key={email} className="bg-[#12131b] border border-[#1f2230] text-gray-400 px-2 py-0.5 rounded-full text-[10px]">
                            {email}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[#1f2230]/40 mt-4">
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  className="bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 border border-[#1f2230] hover:bg-[#12131b] rounded-lg text-gray-300 font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL TOAST */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-[#0f1a0f] border-emerald-500/30 text-emerald-300'
              : 'bg-[#1a0f0f] border-red-500/30 text-red-300'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            : <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          }
          <span>{toast.msg}</span>
        </div>
      )}

    </div>
  );
}
