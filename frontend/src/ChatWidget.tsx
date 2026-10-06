import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import LeadQualification, { type ServiceInterest } from "./LeadQualification";

type Fact = { label: string; text: string; source: string };
type Reply = {
  answer: string;
  facts: Fact[];
  handoff: { label: string; url: string };
  mode: string;
  qualification?: { offered: boolean; service: ServiceInterest };
};
type Turn = { question: string; reply: Reply };
const fallback: Reply = {
  answer:
    "The assistant is unavailable right now. Please use the enquiry form or contact Global Link.",
  facts: [],
  handoff: { label: "Send an enquiry", url: "/#enquiry" },
  mode: "unavailable",
};
function safeLink(value: string) {
  return /^\/services\/[a-z0-9-]+(?:#enquiry)?$/.test(value) ||
    ["/#contact", "/#faq", "/#enquiry"].includes(value)
    ? value
    : "/#contact";
}
export default function ChatWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qualification, setQualification] = useState<
    ServiceInterest | undefined
  >();
  const [qualificationBusy, setQualificationBusy] = useState(false);
  function closeAssistant() {
    if (qualificationBusy) return;
    setQualification(undefined);
    setOpen(false);
  }
  const input = useRef<HTMLTextAreaElement>(null);
  const lastReply = useRef<HTMLDivElement>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    if (open) input.current?.focus();
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && !qualificationBusy) {
        setQualification(undefined);
        setOpen(false);
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, qualificationBusy]);
  useEffect(() => {
    lastReply.current?.scrollIntoView?.({ block: "nearest" });
  }, [turns, busy]);
  useEffect(() => () => pending.current?.abort(), []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || question.trim().length < 3) return;
    const asked = question.trim();
    const serviceSlug = location.pathname.match(
      /^\/services\/([a-z0-9-]+)$/,
    )?.[1];
    const unavailable = {
      ...fallback,
      handoff: {
        label: "Send an enquiry",
        url: serviceSlug
          ? "/services/" + serviceSlug + "#enquiry"
          : "/#enquiry",
      },
    };
    setBusy(true);
    setError("");
    const abort = new AbortController();
    pending.current = abort;
    const timer = setTimeout(() => abort.abort(), 25000);
    try {
      const bootstrap = await fetch("/api/chat/session", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: abort.signal,
      });
      const session = await bootstrap.json();
      if (!bootstrap.ok || !session.data?.csrf_token)
        throw new Error("bootstrap");
      const history = turns
        .slice(-3)
        .map((t) => ({ role: "user", content: t.question.slice(0, 500) }));
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        signal: abort.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": session.data.csrf_token,
        },
        body: JSON.stringify({
          question: asked,
          history,
          ...(serviceSlug ? { service_slug: serviceSlug } : {}),
        }),
      });
      if (response.status === 429) {
        setError(
          "Too many questions. Please wait before trying again, or use the enquiry form.",
        );
        return;
      }
      if (response.status === 422) {
        setError(
          "Please ask a question of 3–500 characters. Keep it to public service information.",
        );
        return;
      }
      let reply = unavailable;
      if (response.ok) {
        const data = (await response.json()).data;
        if (
          typeof data?.answer === "string" &&
          Array.isArray(data.facts) &&
          data.facts.every(
            (fact: Fact) =>
              typeof fact?.label === "string" &&
              typeof fact.text === "string" &&
              typeof fact.source === "string",
          ) &&
          typeof data.handoff?.url === "string"
        )
          reply = data;
      }
      setTurns((old) => [...old.slice(-4), { question: asked, reply }]);
      setQuestion("");
    } catch {
      if (!abort.signal.aborted || pending.current === abort) {
        setTurns((old) => [
          ...old.slice(-4),
          { question: asked, reply: unavailable },
        ]);
        setQuestion("");
      }
    } finally {
      clearTimeout(timer);
      setBusy(false);
      pending.current = null;
    }
  }
  return (
    <div className="chat-widget">
      {open && (
        <section
          className="chat-panel"
          aria-label="Global Link customer assistant"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeAssistant();
          }}
        >
          <header className="chat-header">
            <div>
              <strong>Global Link assistant</strong>
              <small>Published service information</small>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              disabled={qualificationBusy}
              onClick={closeAssistant}
            >
              ×
            </button>
          </header>
          {qualification !== undefined ? (
            <LeadQualification
              interest={qualification}
              onCancel={() => setQualification(undefined)}
              onBusyChange={setQualificationBusy}
            />
          ) : (
            <>
              <div
                className="chat-transcript"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
              >
                {!turns.length && (
                  <p>
                    Ask about a service, documents, eligibility, fees or
                    providers. When details are unavailable, we’ll help you
                    contact the team.
                  </p>
                )}
                {turns.map((turn, i) => (
                  <div
                    className="chat-turn"
                    key={i}
                    ref={i === turns.length - 1 ? lastReply : undefined}
                  >
                    <p className="chat-question">
                      <strong>You</strong>
                      {turn.question}
                    </p>
                    <div className="chat-reply">
                      <strong>Global Link assistant</strong>
                      <p>{turn.reply.answer}</p>
                      {turn.reply.qualification?.offered && (
                        <div className="chat-contact-offer">
                          <p>
                            Would you like our team to contact you
                            {turn.reply.qualification.service
                              ? " about " +
                                turn.reply.qualification.service.title
                              : " about a service"}
                            ?
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setQualification(
                                turn.reply.qualification?.service ?? null,
                              )
                            }
                          >
                            Yes, request team contact
                          </button>
                        </div>
                      )}
                      {turn.reply.facts.map((fact, j) => (
                        <article key={j}>
                          <h4>{fact.label}</h4>
                          <p>{fact.text}</p>
                          <Link
                            to={safeLink(fact.source)}
                            onClick={() => setOpen(false)}
                          >
                            View source
                          </Link>
                        </article>
                      ))}
                      <Link
                        className="chat-handoff"
                        to={safeLink(turn.reply.handoff.url)}
                        onClick={() => setOpen(false)}
                      >
                        Send an enquiry
                      </Link>
                    </div>
                  </div>
                ))}
                {busy && <p role="status">Checking published information…</p>}
              </div>
              <form onSubmit={submit} className="chat-form">
                <p className="chat-privacy">
                  AI may select published records using Google Gemini. Don’t
                  share identity documents, bank details, passwords or personal
                  contact details. Chat isn’t saved by this website.
                </p>
                {error && (
                  <p role="alert">
                    {error}{" "}
                    <Link to="/#contact" onClick={() => setOpen(false)}>
                      Contact the team
                    </Link>
                  </p>
                )}
                <label htmlFor="chat-question">Your question</label>
                <textarea
                  ref={input}
                  id="chat-question"
                  required
                  minLength={3}
                  maxLength={500}
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={busy}
                />
                <div className="chat-controls">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setTurns([]);
                      setError("");
                      setQuestion("");
                      input.current?.focus();
                    }}
                  >
                    Clear chat
                  </button>
                  <button
                    type="submit"
                    disabled={busy || question.trim().length < 3}
                  >
                    {busy ? "Please wait…" : "Ask assistant"}
                  </button>
                </div>
              </form>
              <button
                type="button"
                className="chat-start-qualification"
                onClick={() => {
                  const known = turns.at(-1)?.reply.qualification?.service;
                  const slug = location.pathname.match(
                    /^\/services\/([a-z0-9-]+)$/,
                  )?.[1];
                  setQualification(
                    known ?? (slug ? { slug, title: "this service" } : null),
                  );
                }}
              >
                Request team contact
              </button>
            </>
          )}
        </section>
      )}
      <button
        className="chat-launcher"
        type="button"
        aria-expanded={open}
        aria-label={
          open ? "Hide customer assistant" : "Open customer assistant"
        }
        disabled={qualificationBusy}
        onClick={() => (open ? closeAssistant() : setOpen(true))}
      >
        {" "}
        <span aria-hidden="true">✦</span>{" "}
        {open ? "Close assistant" : "Ask Global Link"}
      </button>
    </div>
  );
}
