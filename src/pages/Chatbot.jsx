import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, MessageSquare, User, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { chatbotService } from "@/services/chatbotService";

export default function Chatbot() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await chatbotService.sendMessage(userMessage, messages);

      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.content,
        data: response.data
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I encountered an error processing your question. Please try rephrasing it.",
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-black mb-2">
            Legislative Chatbot
          </h1>
          <p className="text-gray-600">
            Ask questions about MPs, their voting records, and Canadian legislation
          </p>
        </div>

        <Card className="border-2 border-black mb-6 p-6">
          <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-4">Ask me anything about Canadian MPs and legislation</p>
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-gray-700">Example questions:</p>
                  <p>"Which MPs in Toronto voted for gun control bills?"</p>
                  <p>"Show me Liberal MPs who opposed healthcare reforms"</p>
                  <p>"I'm worried about guns being banned. Which MPs in Brampton South voted against gun restrictions?"</p>
                </div>
              </div>
            ) : (
              messages.map((message, idx) => (
                <div key={idx} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div className={`rounded-lg p-4 ${message.role === 'user'
                        ? 'bg-black text-white'
                        : message.error
                          ? 'bg-red-50 border border-red-200 text-red-800'
                          : 'bg-gray-50 border border-gray-200'
                      }`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>

                      {message.data && (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                          {message.data.interpretation && (
                            <p className="text-xs text-gray-600 mb-3 italic">
                              {message.data.interpretation}
                            </p>
                          )}

                          {message.data.mps && message.data.mps.length > 0 && (
                            <div>
                              <p className="font-semibold text-sm mb-3">
                                Found {message.data.totalFound} MPs (showing top {message.data.mps.length}):
                              </p>
                              <div className="space-y-3">
                                {message.data.mps.map((item, i) => (
                                  <Card key={i} className="p-3 border border-gray-300">
                                    <button
                                      onClick={() => {
                                        const searchParams = new URLSearchParams();
                                        const mpsPage = createPageUrl("MPs");
                                        navigate(mpsPage);
                                        setTimeout(() => {
                                          // Navigation logic would go here
                                        }, 500);
                                      }}
                                      className="w-full text-left hover:bg-gray-50 rounded p-2 transition-colors"
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                          <div className="font-bold text-black hover:underline">
                                            {item.mp.name}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {item.mp.riding} • {item.mp.province}
                                          </div>
                                        </div>
                                        <Badge variant="outline" className="border-black text-black text-xs">
                                          {item.mp.party}
                                        </Badge>
                                      </div>

                                      {item.votes && item.votes.length > 0 && (
                                        <div className="text-xs space-y-1">
                                          <p className="font-semibold text-gray-700">Recent Votes:</p>
                                          {item.votes.slice(0, 3).map((vote, vi) => (
                                            <div key={vi} className="flex items-center gap-2">
                                              <Badge
                                                variant="outline"
                                                className={vote.vote === 'Yea' ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}
                                              >
                                                {vote.vote}
                                              </Badge>
                                              <span className="text-gray-600 truncate">
                                                {vote.bill_number}: {vote.bill_title}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </button>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about MPs, bills, or voting records..."
              disabled={isLoading}
              className="border-black"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-black hover:bg-gray-800"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}