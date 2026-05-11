import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { getAIResponse } from '../services/ai';
import { Button, Card } from '../components/common/UI';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const SupportChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'হ্যালো! আমি বাসএক্স কুরিয়ার সাপোর্ট রোবট। আপনাকে কীভাবে সাহায্য করতে পারি?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await getAIResponse(userMessage, history);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Card className="flex flex-col h-[650px] bg-white/5 border-white/10 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white leading-tight tracking-tight">BusX AI Support</h3>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest leading-none mt-1">Status: Online</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 bg-transparent scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                'flex gap-4 max-w-[85%]',
                m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-[1rem] flex items-center justify-center shrink-0 shadow-xl border',
                m.role === 'user' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-white/10 text-slate-400'
              )}>
                {m.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={cn(
                'px-5 py-4 rounded-[1.5rem] text-sm leading-relaxed shadow-xl backdrop-blur-md transition-all',
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none border border-blue-500' 
                  : 'bg-white/10 border border-white/10 text-slate-100 rounded-tl-none'
              )}>
                {m.content}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }}
               className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-[1rem] bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400">
                <Bot size={18} />
              </div>
              <div className="bg-white/5 border border-white/10 px-5 py-4 rounded-[1.5rem] rounded-tl-none flex items-center gap-1.5 backdrop-blur-md">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSend} className="p-6 bg-white/5 border-t border-white/5 flex gap-3 backdrop-blur-xl">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask us anything..."
          className="flex-1 rounded-2xl border border-white/10 bg-slate-900/50 px-5 py-4 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
        />
        <Button disabled={isTyping} type="submit" className="p-4 rounded-2xl shrink-0">
          <Send size={20} />
        </Button>
      </form>
    </Card>
  );
};
