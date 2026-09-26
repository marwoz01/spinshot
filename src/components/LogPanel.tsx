import { useEffect, useRef, useState } from "react";
import type { LogEntry, PublicPlayer } from "../../shared/types.ts";
import { AvatarSvg } from "./AvatarSvg.tsx";

const KIND_STYLE: Record<LogEntry["kind"], string> = {
  info: "bg-lilac",
  good: "bg-[#d7f8ea]",
  bad: "bg-[#ffe0e5]",
  system: "bg-[#fff4c7]",
  chat: "bg-white",
};

interface LogPanelProps {
  log: LogEntry[];
  players: PublicPlayer[];
  onSend: (text: string) => void;
  title?: string;
  className?: string;
}

export function LogPanel({ log, players, onSend, title = "Czat i wydarzenia", className = "" }: LogPanelProps) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const byId = new Map(players.map((p) => [p.id, p]));
  const lastId = log.at(-1)?.id;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  return (
    <section className={`panel flex min-h-0 flex-col p-3 ${className}`} aria-label={title}>
      <h2 className="panel-title mb-2 !text-base">{title}</h2>
      <div ref={listRef} className="scroll-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1" aria-live="polite">
        {log.map((entry) => {
          const author = entry.playerId ? byId.get(entry.playerId) : undefined;
          if (entry.kind === "chat") {
            return (
              <div key={entry.id} className="flex items-start gap-1.5 text-sm">
                {author && <AvatarSvg avatar={author.avatar} size={26} className="mt-0.5 shrink-0" />}
                <div className="min-w-0 rounded-xl border-2 border-ink bg-white px-2 py-1 leading-snug">
                  <span className="font-black text-grape">{author?.name ?? "?"}: </span>
                  <span className="break-words font-semibold">{entry.text}</span>
                </div>
              </div>
            );
          }
          return (
            <div key={entry.id} className={`rounded-xl border-2 border-ink/15 px-2 py-1 text-[0.82rem] leading-snug ${KIND_STYLE[entry.kind]}`}>
              {entry.text}
            </div>
          );
        })}
      </div>
      <form
        className="mt-2 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSend(text);
          setText("");
        }}
      >
        <input className="field !rounded-full !py-1.5 text-sm" value={text} maxLength={200} placeholder="Napisz coś…" onChange={(e) => setText(e.target.value)} aria-label="Wiadomość" />
        <button type="submit" className="btn btn-sm btn-grape" aria-label="Wyślij">
          ➤
        </button>
      </form>
    </section>
  );
}
