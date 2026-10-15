"use client";

import { AutoHideHeader } from "@/components/layout/auto-hide-header";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, X } from "lucide-react";
import { useMemo, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
};

const BOT_REPLIES = [
  "Thanks. Team can help with apartments, listings, consultations, and site visits.",
  "For now this is dummy chat. Reply still simulates quick support flow.",
  "Share area, budget, and purpose. That usually speeds shortlist quality.",
];

export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hi. Need help with property search, apartment info, or consultation booking?",
    },
  ]);

  const lastBotReply = useMemo(
    () => BOT_REPLIES[(messages.length - 1) % BOT_REPLIES.length],
    [messages.length],
  );

  function sendMessage() {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: input.trim(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          role: "bot",
          text: lastBotReply,
        },
      ]);
    }, 500);
  }

  return (
    <AutoHideHeader
      as="div"
      edge="bottom"
      disabled={open}
      className={cn(
        "vt-chat-launcher fixed z-50",
        // Lifts above the mobile action bar (--bottom-bar-h is 0 when none is mounted).
        open
          ? "inset-x-4 bottom-[calc(1.25rem+var(--bottom-bar-h))] sm:inset-x-auto sm:right-5"
          : "bottom-[calc(1.25rem+var(--bottom-bar-h))] right-5",
      )}
    >
      {open ? (
        <div className="surface-panel w-full overflow-hidden p-0 shadow-pop sm:w-88">
          <div className="flex items-center justify-between border-b border-border/70 bg-ink-900 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Alivia Live Chat</p>
              <p className="text-xs text-white/70">
                Dummy auto-reply assistant
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 transition-colors hover:bg-white/10"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 p-4">
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-[1rem] px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "ml-auto bg-brand-700 text-white"
                      : "bg-ink-50 text-ink-700"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
                placeholder="Ask about listings…"
                autoComplete="off"
                className="w-full rounded-full border border-border bg-white px-4 py-2 text-sm outline-none"
                aria-label="Chat message"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 text-white transition-colors hover:bg-ink-800"
                aria-label="Send chat message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open live chat"
          className="pressable flex size-12 items-center justify-center gap-2 rounded-full bg-ink-900 text-sm font-semibold text-white shadow-pop transition-colors hover:bg-ink-800 sm:size-auto sm:px-5 sm:py-3"
        >
          <MessageSquare className="size-5 sm:size-4" />
          <span className="hidden sm:inline">Live Chat</span>
        </button>
      )}
    </AutoHideHeader>
  );
}
