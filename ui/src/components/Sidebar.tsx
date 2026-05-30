import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  LogOut,
  MessageSquare,
  Mic,
  Plus,
  Settings,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import type { SessionMeta } from "@/hooks/useSessions";
import type { Patient } from "@/types";
import { ToolExplorer } from "./ToolExplorer";

interface Props {
  sessions: SessionMeta[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  patient: Patient;
  onLogout: () => void;
  onOpenProfile: () => void;
  activeSessionId: string;
}

const isVoiceSession = (s: SessionMeta) => s.session_id.startsWith("voice-");

export function Sidebar({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  patient,
  onLogout,
  onOpenProfile,
  activeSessionId,
}: Props) {
  const [tab, setTab] = useState<"sessions" | "tools">("sessions");

  // Split into voice + chat. Both lists share the backend's newest-first
  // ordering — we just partition by the `voice-` prefix on session_id.
  const { voiceSessions, chatSessions } = useMemo(() => {
    const v: SessionMeta[] = [];
    const c: SessionMeta[] = [];
    for (const s of sessions) (isVoiceSession(s) ? v : c).push(s);
    return { voiceSessions: v, chatSessions: c };
  }, [sessions]);

  return (
    <aside className="w-72 shrink-0 border-r border-border bg-bg-soft flex flex-col">
      {/* ── Patient identity card ──────────────────────────────────── */}
      <div className="p-3 border-b border-border">
        <div className="card p-2.5 flex items-center gap-2.5">
          <div className="size-9 rounded-full bg-brand-500/15 border border-brand-500/40 flex items-center justify-center text-brand-400">
            <User size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-100 truncate font-medium">{patient.full_name}</div>
            <div className="text-[11px] text-slate-500 truncate">{patient.phone}</div>
          </div>
          <button
            type="button"
            onClick={onOpenProfile}
            className="text-slate-500 hover:text-slate-200 p-1.5 rounded-md hover:bg-bg-soft"
            title="Profile"
          >
            <Settings size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Switch user? Your session memory stays in the database.")) onLogout();
            }}
            className="text-slate-500 hover:text-danger p-1.5 rounded-md hover:bg-bg-soft"
            title="Switch patient"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* ── Tab switcher ───────────────────────────────────────────── */}
      <div className="flex text-xs border-b border-border">
        <TabButton
          active={tab === "sessions"}
          icon={<MessageSquare size={12} />}
          onClick={() => setTab("sessions")}
        >
          Sessions
        </TabButton>
        <TabButton
          active={tab === "tools"}
          icon={<Wrench size={12} />}
          onClick={() => setTab("tools")}
        >
          Tools
        </TabButton>
      </div>

      {/* ── Tab body ───────────────────────────────────────────────── */}
      {tab === "sessions" ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Voice half (top) */}
          <SessionList
            title="Voice"
            headerIcon={<Mic size={11} className="text-emerald-400" />}
            sessions={voiceSessions}
            activeId={activeId}
            onSelect={onSelect}
            onDelete={onDelete}
            emptyHint="Calls you make from the Voice button appear here."
            rowIcon={(s) => (
              <Mic
                size={13}
                className={clsx(
                  "shrink-0",
                  s.session_id === activeId ? "text-emerald-400" : "text-slate-500",
                )}
              />
            )}
          />

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Chat half (bottom) */}
          <SessionList
            title="Chat"
            headerIcon={<MessageSquare size={11} className="text-brand-400" />}
            sessions={chatSessions}
            activeId={activeId}
            onSelect={onSelect}
            onDelete={onDelete}
            emptyHint="No chat sessions yet."
            rowIcon={() => <MessageSquare size={13} className="shrink-0 text-slate-500" />}
            headerAction={
              <button
                type="button"
                onClick={onCreate}
                className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                title="New chat conversation"
              >
                <Plus size={12} /> New
              </button>
            }
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <ToolExplorer userId={patient.patient_id} sessionId={activeSessionId} />
        </div>
      )}
    </aside>
  );
}

// ── Per-half list ────────────────────────────────────────────────────

interface ListProps {
  title: string;
  headerIcon: React.ReactNode;
  sessions: SessionMeta[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  emptyHint: string;
  rowIcon: (s: SessionMeta) => React.ReactNode;
  headerAction?: React.ReactNode;
}

function SessionList({
  title,
  headerIcon,
  sessions,
  activeId,
  onSelect,
  onDelete,
  emptyHint,
  rowIcon,
  headerAction,
}: ListProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 pt-2 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
          {headerIcon}
          <span>{title}</span>
          <span className="text-slate-600 normal-case tracking-normal">({sessions.length})</span>
        </div>
        {headerAction}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1">
        {sessions.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic px-1 py-1">{emptyHint}</div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.session_id}
              className={clsx(
                "group flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer",
                s.session_id === activeId
                  ? "bg-bg-card border-brand-500/40"
                  : "border-transparent hover:bg-bg-card/60",
              )}
              onClick={() => onSelect(s.session_id)}
            >
              {rowIcon(s)}
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate text-slate-200">{s.title}</div>
                <div className="text-[10px] text-slate-500 truncate">{s.session_id}</div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${s.title}"?`)) onDelete(s.session_id);
                }}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-danger p-1"
                aria-label="Delete session"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex-1 flex items-center justify-center gap-1.5 py-2 border-b-2 transition-colors",
        active
          ? "border-brand-500 text-slate-100"
          : "border-transparent text-slate-400 hover:text-slate-200",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
