import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@adobe/react-spectrum';
import { selectLeads, selectSessionUser, selectToken, store } from '../store/Store';
import { showLeadLayer } from '../actions/Actions';
import { getRequestClient } from '../helpers/RequestHelper';

const TELE_SETTINGS_KEY = 'telemarketer_settings';

const parseBool = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return value.toString() === 'true';
};

const parseCsv = (value: unknown, fallback: string[]) => {
  if (!value) return fallback;
  if (Array.isArray(value)) {
    const normalized = value.map((item) => item?.toString().trim()).filter((item) => item);
    return normalized.length ? normalized : fallback;
  }
  const normalized = value
    .toString()
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return normalized.length ? normalized : fallback;
};

const defaultScripts = [
  {
    title: 'Opening Pitch',
    body: 'Hi {{name}}, this is {{agent}} from {{company}}. We help {{industry}} teams {{value}}. Do you have 30 seconds for a quick overview?',
  },
  {
    title: 'Call Back Ask',
    body: 'Would it be helpful if I sent a summary and booked a 15‑minute call this week?',
  },
];

type StoredState = {
  x: number;
  y: number;
  minimized: boolean;
  notes: string[];
};

type CallbackLead = {
  id: string;
  name: string;
  contact: string;
  callbackAt: Date;
  fieldKey: string;
};

type UnscheduledCallbackLead = {
  id: string;
  name: string;
  contact: string;
};

export const UtilityWindow = () => {
  const token = useSelector(selectToken);
  const sessionUser = useSelector(selectSessionUser);
  const leads = useSelector(selectLeads);
  const client = getRequestClient(token);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 120 });
  const [minimized, setMinimized] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [scripts, setScripts] = useState(defaultScripts);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [showPitch, setShowPitch] = useState(true);
  const [showCallbacks, setShowCallbacks] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [callbackFields, setCallbackFields] = useState<string[]>([
    'lead-callback-at',
    'callbackAt',
    'nextCallbackAt',
    'callbackDateTime',
  ]);

  const storageKey = useMemo(() => {
    if (!sessionUser?._id) return 'utility-window:anonymous';
    return `utility-window:${sessionUser._id}`;
  }, [sessionUser?._id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredState;
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        setPosition({ x: parsed.x, y: parsed.y });
      }
      if (typeof parsed.minimized === 'boolean') {
        setMinimized(parsed.minimized);
      }
      if (Array.isArray(parsed.notes)) {
        setNotes(parsed.notes.slice(0, 50));
      }
    } catch (error) {
      console.warn('utility window state parse failed', error);
    }
  }, [storageKey]);

  useEffect(() => {
    const payload: StoredState = {
      x: position.x,
      y: position.y,
      minimized,
      notes,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [storageKey, position, minimized, notes]);

  useEffect(() => {
    if (!token) return;
    client
      .getIntegration(TELE_SETTINGS_KEY)
      .then((payload) => {
        const attrs = payload?.attributes || {};
        const scriptJson = attrs.scriptsJson;
        if (scriptJson) {
          try {
            const parsed = JSON.parse(scriptJson);
            if (Array.isArray(parsed)) {
              setScripts(parsed);
            }
          } catch (error) {
            console.warn('telemarketer scripts parse failed', error);
          }
        }
        setShowPitch(parseBool(attrs.enableScripts, true));
        setShowCallbacks(parseBool(attrs.enableCallbacksWidget, true));
        setCallbackFields(
          parseCsv(attrs.callbackDateFields, [
            'lead-callback-at',
            'callbackAt',
            'nextCallbackAt',
            'callbackDateTime',
          ])
        );
      })
      .catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setTimerElapsed((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (event: MouseEvent) => {
      const x = event.clientX - dragOffset.current.x;
      const y = event.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - 260;
      const maxY = window.innerHeight - 80;
      setPosition({
        x: Math.min(Math.max(0, x), Math.max(0, maxX)),
        y: Math.min(Math.max(0, y), Math.max(0, maxY)),
      });
    };

    const handleUp = () => setDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging]);

  const parseCallbackDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'number') {
      const fromEpoch = new Date(value);
      return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch;
    }
    const fromIso = new Date(value.toString());
    return Number.isNaN(fromIso.getTime()) ? null : fromIso;
  };

  const callbackLeads = useMemo<CallbackLead[]>(() => {
    const list: CallbackLead[] = [];

    leads.forEach((lead) => {
      const attributes = lead.attributes || {};
      const key = callbackFields.find((field) => attributes[field]);
      if (!key) return;
      const callbackAt = parseCallbackDate(attributes[key]);
      if (!callbackAt) return;

      list.push({
        id: lead._id!,
        name: lead.name,
        contact: lead.contact?.phone || lead.contact?.email || 'No contact info',
        callbackAt,
        fieldKey: key,
      });
    });

    list.sort((a, b) => a.callbackAt.getTime() - b.callbackAt.getTime());
    return list;
  }, [leads, callbackFields]);

  const callbacksByState = useMemo(() => {
    const now = Date.now();
    const overdue = callbackLeads.filter((item) => item.callbackAt.getTime() < now);
    const upcoming = callbackLeads.filter((item) => item.callbackAt.getTime() >= now);
    return { overdue, upcoming };
  }, [callbackLeads]);

  const unscheduledCallbacks = useMemo<UnscheduledCallbackLead[]>(() => {
    return leads
      .filter((lead) => {
        const outcome = lead.attributes?.['lead-call-outcome']?.toString();
        if (outcome !== 'Call back') return false;
        const hasCallbackDate = callbackFields.some((field) => Boolean(lead.attributes?.[field]));
        return !hasCallbackDate;
      })
      .map((lead) => ({
        id: lead._id!,
        name: lead.name,
        contact: lead.contact?.phone || lead.contact?.email || 'No contact info',
      }));
  }, [leads, callbackFields]);

  const startDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setDragging(true);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const formatDateTime = (value: Date) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(value);
    } catch (error) {
      return value.toISOString();
    }
  };

  const addNote = () => {
    if (!noteInput.trim()) return;
    setNotes((prev) => [noteInput.trim(), ...prev].slice(0, 20));
    setNoteInput('');
  };

  const openLead = (id?: string) => {
    store.dispatch(showLeadLayer(id));
  };

  return (
    <div
      ref={containerRef}
      className={`utility-window ${minimized ? 'minimized' : ''}`}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div className="utility-header" onMouseDown={startDrag}>
        <div className="utility-title">
          <span className="utility-dot" />
          Utility Window
        </div>
        <div className="utility-actions">
          <button
            className="utility-toggle"
            onClick={() => setMinimized((prev) => !prev)}
            aria-label="Minimize utility window"
          >
            {minimized ? 'Restore' : 'Minimize'}
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="utility-body">
          <div className="utility-section">
            <div className="utility-section-head">
              <span>Call Timer</span>
              <div className="utility-inline-actions">
                <Button
                  variant="secondary"
                  onPress={() => setTimerRunning((prev) => !prev)}
                >
                  {timerRunning ? 'Pause' : 'Start'}
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setTimerElapsed(0);
                    setTimerRunning(false);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
            <div className="utility-timer">{formatTimer(timerElapsed)}</div>
          </div>

          {showPitch && (
            <div className="utility-section">
              <div className="utility-section-head">
                <span>Pitches</span>
              </div>
              <div className="utility-list">
                {scripts.map((script, index) => (
                  <div key={`${script.title}-${index}`} className="utility-card">
                    <div className="utility-card-title">{script.title || 'Script'}</div>
                    <div className="utility-card-body">{script.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showCallbacks && (
            <div className="utility-section">
              <div className="utility-section-head">
                <span>Upcoming Callbacks</span>
                <div className="utility-count">{callbackLeads.length}</div>
              </div>
              <div className="utility-list">
                {callbackLeads.length === 0 && (
                  <div className="utility-empty">No callbacks queued yet.</div>
                )}
                {callbacksByState.overdue.slice(0, 3).map((lead) => (
                  <button
                    key={`overdue-${lead.id}`}
                    className="utility-card utility-link utility-card-overdue"
                    onClick={() => openLead(lead.id)}
                  >
                    <div className="utility-card-title">{lead.name}</div>
                    <div className="utility-card-body">{lead.contact}</div>
                    <div className="utility-card-meta">
                      Overdue: {formatDateTime(lead.callbackAt)}
                    </div>
                  </button>
                ))}
                {callbacksByState.upcoming.slice(0, 6).map((lead) => (
                  <button
                    key={`upcoming-${lead.id}`}
                    className="utility-card utility-link"
                    onClick={() => openLead(lead.id)}
                  >
                    <div className="utility-card-title">{lead.name}</div>
                    <div className="utility-card-body">{lead.contact}</div>
                    <div className="utility-card-meta">
                      {formatDateTime(lead.callbackAt)}
                    </div>
                  </button>
                ))}
                {unscheduledCallbacks.slice(0, 4).map((lead) => (
                  <button
                    key={`unscheduled-${lead.id}`}
                    className="utility-card utility-link"
                    onClick={() => openLead(lead.id)}
                  >
                    <div className="utility-card-title">{lead.name}</div>
                    <div className="utility-card-body">{lead.contact}</div>
                    <div className="utility-card-meta">Call back requested - no callback time set</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showNotes && (
            <div className="utility-section">
              <div className="utility-section-head">
                <span>Quick Notes</span>
              </div>
              <div className="utility-notes">
                <div className="utility-note-input">
                  <input
                    value={noteInput}
                    onChange={(event) => setNoteInput(event.target.value)}
                    placeholder="Add a quick note..."
                  />
                  <Button variant="secondary" onPress={addNote}>
                    Add
                  </Button>
                </div>
                <div className="utility-list">
                  {notes.length === 0 && (
                    <div className="utility-empty">No notes yet.</div>
                  )}
                  {notes.map((note, index) => (
                    <div key={`${note}-${index}`} className="utility-card">
                      <div className="utility-card-body">{note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
