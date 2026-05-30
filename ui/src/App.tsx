import { useEffect, useState } from "react";
import { HeartPulse, Phone, X } from "lucide-react";
import { sessionApi } from "@/api/client";
import { ChatWindow } from "@/components/ChatWindow";
import { InputBox } from "@/components/InputBox";
import { PatientGate } from "@/components/PatientGate";
import { ProfileSheet } from "@/components/ProfileSheet";
import { Sidebar } from "@/components/Sidebar";
import { StatusBar } from "@/components/StatusBar";
import { VoiceRoom } from "@/components/VoiceRoom";
import { useChatStream } from "@/hooks/useChatStream";
import { useHealth } from "@/hooks/useHealth";
import { usePatient } from "@/hooks/usePatient";
import { useSessions } from "@/hooks/useSessions";

export default function App() {
  const health = useHealth();
  const patient = usePatient();
  const sessions = useSessions(patient.patient?.patient_id);
  const [profileOpen, setProfileOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  // ── Session warmup ──────────────────────────────────────────────
  // The moment we know who the user is and which conversation they're
  // on, ask the backend to preload their patient profile + ST turns
  // into its in-memory cache. The first chat request then skips two
  // Supabase round-trips (~600-1000 ms each from Sri Lanka).
  useEffect(() => {
    if (!patient.patient || !sessions.activeId) return;
    void sessionApi
      .warmup(patient.patient.patient_id, sessions.activeId)
      .catch(() => { /* non-fatal — chat falls back to live fetch */ });
  }, [patient.patient?.patient_id, sessions.activeId]);

  // Chat hook is keyed to (patient, session) — its useEffect now
  // clears + reloads ST history whenever either changes.
  const userId = patient.patient ? patient.patient.patient_id : "";
  const chat = useChatStream({ userId, sessionId: sessions.activeId });
  const activeSession = sessions.sessions.find((s) => s.session_id === sessions.activeId);

  // ── Voice ↔ Sidebar sync ─────────────────────────────────────────
  // A voice call writes a new `voice-<room>` row to chat_sessions
  // (and may LLM-rename it after a couple of turns). Poll the
  // sessions list while the voice modal is open so the new row + the
  // updated title appear in the sidebar without a manual refresh.
  useEffect(() => {
    if (!voiceOpen) return;
    const id = window.setInterval(() => {
      void sessions.refresh();
    }, 4000);
    return () => window.clearInterval(id);
  }, [voiceOpen, sessions.refresh]);

  // After the chat path posts a turn, the backend schedules the
  // auto-title in the background. Refresh once a few seconds after
  // each completed message so the new title shows up.
  useEffect(() => {
    if (chat.loading) return;
    if (chat.messages.length < 2) return;
    const id = window.setTimeout(() => {
      void sessions.refresh();
    }, 3500);
    return () => window.clearTimeout(id);
  }, [chat.loading, chat.messages.length, sessions.refresh]);

  // ── Loading splash while we hydrate localStorage on first paint ──
  if (!patient.loaded) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  }

  // ── Identity gate — phone lookup or registration ────────────────
  if (!patient.patient) {
    return <PatientGate onLogin={patient.login} onRegister={patient.register} />;
  }

  // ── Authenticated app ──────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="shrink-0 h-14 border-b border-border flex items-center gap-3 px-4 bg-bg-soft">
        <div className="size-8 rounded-lg bg-brand-500/15 border border-brand-500/40 flex items-center justify-center">
          <HeartPulse size={16} className="text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-slate-100 truncate">
            Nawaloka Health Assistant
          </h1>
          <div className="text-[11px] text-slate-500 truncate">
            {activeSession?.title ?? sessions.activeId}
          </div>
        </div>
        <button
          onClick={() => setVoiceOpen(true)}
          className="flex items-center gap-2 px-3 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition text-xs font-medium"
          title="Talk to the assistant"
        >
          <Phone size={14} />
          Voice
        </button>
        <StatusBar status={health.status} readiness={health.readiness} config={health.config} />
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        <Sidebar
          sessions={sessions.sessions}
          activeId={sessions.activeId}
          onSelect={sessions.setActiveId}
          onCreate={() => sessions.create()}
          onDelete={sessions.remove}
          patient={patient.patient}
          onLogout={patient.logout}
          onOpenProfile={() => setProfileOpen(true)}
          activeSessionId={sessions.activeId}
        />

        <main className="flex-1 flex flex-col min-w-0">
          {/* ChatWindow is re-keyed on patient/session change so messages clear */}
          <ChatWindow
            key={`${userId}::${sessions.activeId}`}
            messages={chat.messages}
            loading={chat.loading}
            thoughts={chat.thoughts}
            error={chat.error}
          />
          <div className="shrink-0 border-t border-border p-3 bg-bg-soft">
            <div className="max-w-3xl mx-auto">
              <InputBox
                disabled={chat.loading || health.status === "offline"}
                onSend={chat.send}
                onReset={chat.reset}
                placeholder={
                  health.status === "offline"
                    ? "API offline — start the backend with `uvicorn api.main:app`"
                    : `Ask the assistant, ${patient.patient.full_name.split(" ")[0]}…`
                }
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
                <span>
                  patient_id=<code className="text-slate-300">{userId}</code> ·
                  session=<code className="text-slate-300">{sessions.activeId}</code>
                </span>
                <span>
                  <kbd className="kbd">Enter</kbd> send · <kbd className="kbd">Shift+Enter</kbd> newline
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Voice modal ─────────────────────────────────────────── */}
      {voiceOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center">
          <button
            onClick={() => setVoiceOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Close"
          >
            <X size={18} />
          </button>
          <VoiceRoom
            userId={userId}
            onClose={() => {
              setVoiceOpen(false);
              // Immediate refresh — picks up the new voice-<room> row
              // in the sidebar without waiting for the next poll tick.
              void sessions.refresh();
            }}
          />
        </div>
      )}

      {/* ── Profile slide-over ──────────────────────────────────── */}
      <ProfileSheet
        open={profileOpen}
        patient={patient.patient}
        onClose={() => setProfileOpen(false)}
        onSave={patient.update}
      />
    </div>
  );
}
