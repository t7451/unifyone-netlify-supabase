import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Source {
  docId: string;
  docTitle: string;
  chunk: string;
  similarity: number;
}

export default function DocsChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const askMutation = trpc.documentChat.ask.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await askMutation.mutateAsync({
        question: userMessage,
        conversationHistory: messages,
      });

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: String(result.answer) },
      ]);
      setSources(result.sources);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <Helmet>
        <title>Documentation Chat | UnifyOne</title>
        <meta
          name="description"
          content="Ask questions about UnifyOne documentation powered by Claude AI"
        />
        <meta name="og:title" content="Documentation Chat | UnifyOne" />
        <meta
          name="og:description"
          content="Ask questions about UnifyOne documentation powered by Claude AI"
        />
        <meta name="twitter:title" content="Documentation Chat | UnifyOne" />
        <meta
          name="twitter:description"
          content="Ask questions about UnifyOne documentation powered by Claude AI"
        />
      </Helmet>

      <div className="min-h-screen bg-cathedral-bg flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-b from-black/80 to-black/40 border-b border-gold/20 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-8 h-8 text-gold" />
              <h1 className="text-4xl font-cinzel text-gold">
                Documentation Assistant
              </h1>
            </div>
            <p className="text-gray-300 max-w-2xl">
              Ask questions about UnifyOne, the Cathedral Framework, Kai
              integration, and more. Powered by Claude AI with access to our
              complete documentation.
            </p>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-6">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 min-h-[400px]">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <FileText className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                  <h2 className="text-2xl font-cinzel text-gold mb-2">
                    Start a Conversation
                  </h2>
                  <p className="text-gray-400 max-w-md">
                    Ask me anything about UnifyOne's architecture, features,
                    integrations, or how to get started.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-gold text-black font-medium"
                        : "bg-black/50 border border-gold/20 text-gray-100"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="bg-black/50 border border-gold/20 text-gray-100 px-4 py-3 rounded-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gold" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div className="bg-black/50 border border-gold/20 rounded-lg p-4">
              <h3 className="text-sm font-cinzel text-gold mb-3">Sources</h3>
              <div className="space-y-2">
                {sources.map((source, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-gray-400 border-l border-gold/30 pl-3"
                  >
                    <div className="font-medium text-gold">
                      {source.docTitle}
                    </div>
                    <div className="text-gray-500">{source.chunk}</div>
                    <div className="text-gold/50 mt-1">
                      Relevance: {(source.similarity * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question about UnifyOne..."
              disabled={isLoading}
              className="bg-black/50 border-gold/20 text-white placeholder-gray-500 focus:border-gold"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gold text-black hover:bg-gold/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
