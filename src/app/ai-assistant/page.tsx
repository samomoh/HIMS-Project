'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Stethoscope, FileSearch, Pill } from 'lucide-react';
import { cn } from '@/components/layout/AppLayout';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'This is a product preview. The assistant is not connected to a clinical AI model, approved medical references, or patient records.',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'This preview is not connected to clinical AI or verified medical references. No clinical response was generated. Do not enter identifiable patient information here.',
    }]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold leading-6 text-gray-900">AI assistant preview</h1>
          <p className="mt-1 text-sm text-gray-500">Clinical decision support is not connected in this prototype.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-4 max-w-3xl", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  msg.role === 'assistant' ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-600"
                )}>
                  {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className={cn(
                  "px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm shadow-sm",
                  msg.role === 'user' 
                    ? "bg-blue-600 text-white rounded-tr-sm" 
                    : "bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 max-w-3xl">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-gray-50 text-gray-500 border border-gray-100 rounded-tl-sm flex items-center gap-2">
                  <span className="animate-pulse">Analyzing</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-white">
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about symptoms, lab results, or treatments..."
                className="block w-full rounded-full border-0 py-3 pl-4 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Suggestion Sidebar */}
        <div className="hidden lg:flex w-80 flex-col gap-4">
          <div className="bg-white p-4 shadow-sm ring-1 ring-gray-200 rounded-xl">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Stethoscope size={18} className="text-blue-500" /> Suggested Prompts
            </h3>
            <div className="space-y-2">
              <button 
                onClick={() => setInput("What are the differential diagnoses for a 35yo male with severe sudden headache?")}
                className="w-full text-left text-sm p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-700"
              >
                Differential diagnoses for sudden severe headache
              </button>
              <button 
                onClick={() => setInput("Patient has WBC of 16.5 and fever. What should I check next?")}
                className="w-full text-left text-sm p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-700"
              >
                High WBC count and fever analysis
              </button>
              <button 
                onClick={() => setInput("Latest guidelines for managing primary hypertension in adults?")}
                className="w-full text-left text-sm p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-700"
              >
                Primary hypertension treatment guidelines
              </button>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-sm ring-1 ring-gray-200 rounded-xl flex-1 flex flex-col justify-center items-center text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-indigo-600">
              <FileSearch size={24} />
            </div>
            <h3 className="font-semibold text-indigo-900 mb-2">Automated Chart Review</h3>
            <p className="text-xs text-indigo-700 mb-4">
              This demonstration does not read patient charts or check drug interactions. Chart analysis is not available.
            </p>
            <button disabled aria-disabled="true" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg opacity-60 cursor-not-allowed shadow-sm">
              Preview only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
