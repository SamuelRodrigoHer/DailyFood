'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Dumbbell,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import type { GymExercise, GymLibraryExercise, GymRoutine, GymSession, GymSet } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type GymTab = 'history' | 'routines' | 'exercises';
type DialogMode = 'session' | 'routine' | 'exercise' | null;

type GymStore = {
  routines: GymRoutine[];
  sessions: GymSession[];
  libraryExercises: GymLibraryExercise[];
  activeWorkout?: ActiveWorkoutDraft | null;
};

type LibraryExerciseDraft = {
  name: string;
  muscle_group: string;
  equipment: string;
  default_sets: string;
  default_reps: string;
  default_weight_kg: string;
  notes: string;
};

const emptyLibraryExerciseDraft = (): LibraryExerciseDraft => ({
  name: '',
  muscle_group: '',
  equipment: '',
  default_sets: '3',
  default_reps: '10',
  default_weight_kg: '',
  notes: '',
});

type SessionDraft = {
  name: string;
  performed_on: string;
  duration_minutes: string;
  notes: string;
  routine_id?: string;
  exercises: GymExercise[];
};

type ActiveWorkoutDraft = {
  id: string;
  owner_key: string;
  routine_id?: string;
  name: string;
  started_at: string;
  notes: string;
  exercises: GymExercise[];
};

const today = () => {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const newSet = (reps = 10, weight_kg?: number): GymSet => ({
  id: crypto.randomUUID(),
  reps,
  weight_kg,
});

const newExercise = (): GymExercise => ({
  id: crypto.randomUUID(),
  name: '',
  sets: 3,
  reps: 10,
  set_details: [newSet(), newSet(), newSet()],
});

function getSetDetails(exercise: GymExercise): GymSet[] {
  if (exercise.set_details?.length) return exercise.set_details;
  return Array.from({ length: Math.max(1, exercise.sets || 1) }, (_, index) => ({
    id: `${exercise.id}-serie-${index + 1}`,
    reps: exercise.reps || 10,
    weight_kg: exercise.weight_kg,
  }));
}

const newSessionDraft = (): SessionDraft => ({
  name: '',
  performed_on: today(),
  duration_minutes: '',
  notes: '',
  exercises: [newExercise()],
});

function readStore(key: string): GymStore {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { routines: [], sessions: [], libraryExercises: [], activeWorkout: null };
    const value = JSON.parse(raw) as Partial<GymStore>;
    return {
      routines: Array.isArray(value.routines) ? value.routines : [],
      sessions: Array.isArray(value.sessions) ? value.sessions : [],
      libraryExercises: Array.isArray(value.libraryExercises) ? value.libraryExercises : [],
      activeWorkout: value.activeWorkout && typeof value.activeWorkout === 'object'
        ? value.activeWorkout as ActiveWorkoutDraft
        : null,
    };
  } catch {
    return { routines: [], sessions: [], libraryExercises: [], activeWorkout: null };
  }
}

function sortSessions(sessions: GymSession[]) {
  return [...sessions].sort((a, b) =>
    b.performed_on.localeCompare(a.performed_on) || b.created_at.localeCompare(a.created_at)
  );
}

function sortRoutines(routines: GymRoutine[]) {
  return [...routines].sort((a, b) =>
    (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at)
  );
}

function sortLibraryExercises(exercises: GymLibraryExercise[]) {
  return [...exercises].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`));
}

function dateFromTimestamp(value: string) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function getCloudErrorMessage(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() || '';
  if (error?.code === 'PGRST205' || error?.code === '42P01' || message.includes('gym_routines') || message.includes('gym_sessions') || message.includes('gym_exercise_library')) {
    return 'Falta configurar las tablas de Gimnasio en Supabase. Ejecuta supabase/gym_schema.sql desde el SQL Editor.';
  }
  return 'No se pudo sincronizar con Supabase. Tus cambios se conservan localmente en este dispositivo.';
}

function ExerciseEditor({
  exercises,
  onChange,
  libraryExercises,
  trackCompletion = false,
}: {
  exercises: GymExercise[];
  onChange: (exercises: GymExercise[]) => void;
  libraryExercises: GymLibraryExercise[];
  trackCompletion?: boolean;
}) {
  const gridColumns = trackCompletion
    ? 'grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem_2rem]'
    : 'grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem]';
  const update = (id: string, values: Partial<GymExercise>) => {
    onChange(exercises.map((exercise) => exercise.id === id ? { ...exercise, ...values } : exercise));
  };

  const updateSet = (exerciseId: string, setId: string, values: Partial<GymSet>) => {
    onChange(exercises.map((exercise) => {
      if (exercise.id !== exerciseId) return exercise;
      const setDetails = getSetDetails(exercise).map((set) => set.id === setId ? { ...set, ...values } : set);
      return {
        ...exercise,
        set_details: setDetails,
        sets: setDetails.length,
        reps: setDetails[0]?.reps || exercise.reps,
        weight_kg: setDetails[0]?.weight_kg,
      };
    }));
  };

  const addLibraryExercise = (item: GymLibraryExercise) => {
    const setDetails = Array.from({ length: item.default_sets }, () =>
      newSet(item.default_reps, item.default_weight_kg)
    );
    onChange([...exercises, {
      id: crypto.randomUUID(),
      name: item.name,
      sets: setDetails.length,
      reps: item.default_reps,
      weight_kg: item.default_weight_kg,
      set_details: setDetails,
    }]);
  };

  const addSet = (exercise: GymExercise) => {
    const setDetails = getSetDetails(exercise);
    const lastSet = setDetails[setDetails.length - 1];
    const nextSets = [...setDetails, newSet(lastSet?.reps || 10, lastSet?.weight_kg)];
    update(exercise.id, {
      set_details: nextSets,
      sets: nextSets.length,
      reps: nextSets[0].reps,
      weight_kg: nextSets[0].weight_kg,
    });
  };

  const removeSet = (exercise: GymExercise, setId: string) => {
    const setDetails = getSetDetails(exercise).filter((set) => set.id !== setId);
    if (!setDetails.length) return;
    update(exercise.id, {
      set_details: setDetails,
      sets: setDetails.length,
      reps: setDetails[0].reps,
      weight_kg: setDetails[0].weight_kg,
    });
  };

  return (
    <div className="space-y-3">
      {libraryExercises.length > 0 && (
        <div className="rounded-2xl border border-[#344951] bg-[#192226]/60 p-3">
          <p className="mb-2 text-xs font-bold text-[#a8c7d4]">Añadir desde mi biblioteca</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {libraryExercises.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addLibraryExercise(item)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#344951] bg-[#141a18] px-3 py-2 text-xs font-bold text-[#a8c7d4] transition hover:border-[#344951] hover:bg-[#192226]"
              >
                <Plus className="h-3.5 w-3.5" /> {item.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {exercises.map((exercise, index) => (
        <div key={exercise.id} className="rounded-2xl border border-[#2b3430] bg-[#1a211e]/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-[#929d97]">Ejercicio {index + 1}</span>
            <button
              type="button"
              onClick={() => onChange(exercises.filter((item) => item.id !== exercise.id))}
              aria-label={`Quitar ejercicio ${index + 1}`}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#7d8983] transition hover:bg-[#291e1d] hover:text-[#e0aaa3]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            value={exercise.name}
            onChange={(event) => update(exercise.id, { name: event.target.value })}
            placeholder="Ej. Sentadilla"
            className="w-full rounded-xl border border-[#2b3430] bg-[#141a18] px-3 py-2.5 text-sm outline-none transition placeholder:text-[#7d8983] focus:border-[#344951] focus:ring-4 focus:ring-[#4c6c75]"
          />
          <div className="mt-3">
            <div className={cn('mb-1.5 grid items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wide text-[#7d8983]', gridColumns)}>
              <span>Serie</span><span>Repeticiones</span><span>Peso (kg)</span>{trackCompletion && <span>Hecha</span>}<span />
            </div>
            <div className="space-y-2">
              {getSetDetails(exercise).map((set, setIndex) => (
                <div key={set.id} className={cn('grid items-center gap-2', gridColumns)}>
                  <span className="text-center text-xs font-bold text-[#929d97]">{setIndex + 1}</span>
                  <label>
                    <span className="sr-only">Repeticiones de la serie {setIndex + 1} de {exercise.name || `ejercicio ${index + 1}`}</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={set.reps}
                      onChange={(event) => updateSet(exercise.id, set.id, { reps: Number(event.target.value) || 1 })}
                      className="w-full rounded-xl border border-[#2b3430] bg-[#141a18] px-2.5 py-2 text-sm font-medium text-[#d7ded9] outline-none focus:border-[#344951] focus:ring-4 focus:ring-[#4c6c75]"
                    />
                  </label>
                  <label>
                    <span className="sr-only">Peso en kilogramos de la serie {setIndex + 1} de {exercise.name || `ejercicio ${index + 1}`}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={set.weight_kg ?? ''}
                      onChange={(event) => updateSet(exercise.id, set.id, {
                        weight_kg: event.target.value === '' ? undefined : Number(event.target.value),
                      })}
                      placeholder="—"
                      className="w-full rounded-xl border border-[#2b3430] bg-[#141a18] px-2.5 py-2 text-sm font-medium text-[#d7ded9] outline-none placeholder:text-[#68746e] focus:border-[#344951] focus:ring-4 focus:ring-[#4c6c75]"
                    />
                  </label>
                  {trackCompletion && (
                    <button
                      type="button"
                      onClick={() => updateSet(exercise.id, set.id, { completed: !set.completed })}
                      aria-label={`${set.completed ? 'Desmarcar' : 'Marcar como hecha'} la serie ${setIndex + 1} de ${exercise.name || `ejercicio ${index + 1}`}`}
                      aria-pressed={Boolean(set.completed)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg transition',
                        set.completed ? 'bg-[#19231d] text-[#a8c5ae]' : 'text-[#68746e] hover:bg-[#1a211e] hover:text-[#929d97]'
                      )}
                    >
                      {set.completed ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-current" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSet(exercise, set.id)}
                    disabled={getSetDetails(exercise).length === 1}
                    aria-label={`Quitar serie ${setIndex + 1} de ${exercise.name || `ejercicio ${index + 1}`}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7d8983] transition hover:bg-[#291e1d] hover:text-[#e0aaa3] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addSet(exercise)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-[#a8c7d4] transition hover:bg-[#192226]"
            >
              <Plus className="h-3.5 w-3.5" /> Añadir serie
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...exercises, newExercise()])}
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#a8c7d4] transition hover:bg-[#192226]"
      >
        <Plus className="h-4 w-4" /> Añadir manualmente
      </button>
    </div>
  );
}

export default function GymPage() {
  const { user, isLoading: isAppLoading, isSupabaseConnected } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const storageKey = `mimodo_gym_${user?.id || 'demo'}`;
  const [routines, setRoutines] = useState<GymRoutine[]>([]);
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [libraryExercises, setLibraryExercises] = useState<GymLibraryExercise[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutDraft | null>(null);
  const [activeWorkoutOwnerKey, setActiveWorkoutOwnerKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<GymTab>('history');
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [startWorkoutName, setStartWorkoutName] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeWorkoutError, setActiveWorkoutError] = useState('');
  const [editingRoutine, setEditingRoutine] = useState<GymRoutine | null>(null);
  const [editingSession, setEditingSession] = useState<GymSession | null>(null);
  const [editingLibraryExercise, setEditingLibraryExercise] = useState<GymLibraryExercise | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [routineNotes, setRoutineNotes] = useState('');
  const [routineExercises, setRoutineExercises] = useState<GymExercise[]>(() => [newExercise()]);
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>(() => newSessionDraft());
  const [libraryDraft, setLibraryDraft] = useState<LibraryExerciseDraft>(() => emptyLibraryExerciseDraft());
  const [formError, setFormError] = useState('');
  const [storageIssue, setStorageIssue] = useState('');
  const [saving, setSaving] = useState(false);

  const saveLocal = (
    nextRoutines: GymRoutine[],
    nextSessions: GymSession[],
    nextLibraryExercises: GymLibraryExercise[] = libraryExercises,
    nextActiveWorkout: ActiveWorkoutDraft | null = activeWorkoutOwnerKey === storageKey ? activeWorkout : null,
  ) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        routines: nextRoutines,
        sessions: nextSessions,
        libraryExercises: nextLibraryExercises,
        activeWorkout: nextActiveWorkout,
      }));
    } catch {
      setStorageIssue('El navegador no ha podido guardar los datos en este dispositivo.');
    }
  };

  const saveActiveWorkoutLocally = (workout: ActiveWorkoutDraft | null) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...readStore(storageKey), activeWorkout: workout }));
    } catch {
      setStorageIssue('El navegador no ha podido guardar el entrenamiento en curso.');
    }
  };

  useEffect(() => {
    if (isAppLoading) return;
    let active = true;
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

    const loadLocal = () => {
      const local = readStore(storageKey);
      setRoutines(sortRoutines(local.routines));
      setSessions(sortSessions(local.sessions));
      setLibraryExercises(sortLibraryExercises(local.libraryExercises));
    };

    const initialize = async () => {
      setLoading(true);
      setStorageIssue('');
      const cachedAtStart = readStore(storageKey);
      setActiveWorkout(cachedAtStart.activeWorkout || null);
      setActiveWorkoutOwnerKey(storageKey);
      setElapsedSeconds(cachedAtStart.activeWorkout
        ? Math.max(0, Math.floor((Date.now() - new Date(cachedAtStart.activeWorkout.started_at).getTime()) / 1000))
        : 0);
      if (supabase && user?.id) {
        const [routinesResult, sessionsResult, libraryResult] = await Promise.all([
          supabase.from('gym_routines').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
          supabase.from('gym_sessions').select('*').eq('user_id', user.id).order('performed_on', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('gym_exercise_library').select('*').eq('user_id', user.id).order('name', { ascending: true }),
        ]);
        if (!active) return;
        if (routinesResult.error || sessionsResult.error || libraryResult.error) {
          loadLocal();
          const error = routinesResult.error || sessionsResult.error || libraryResult.error;
          setStorageIssue(getCloudErrorMessage(error));
        } else {
          let cloudRoutines = (routinesResult.data || []) as GymRoutine[];
          let cloudSessions = (sessionsResult.data || []) as GymSession[];
          let cloudLibraryExercises = (libraryResult.data || []) as GymLibraryExercise[];

          // If local sessions were created before the gym tables existed, import
          // them once when the new, empty cloud tables become available.
          const cached = readStore(storageKey);
          if (!cloudRoutines.length && !cloudSessions.length && (cached.routines.length || cached.sessions.length)) {
            const localRoutines = cached.routines.map((routine) => ({
              ...routine,
              user_id: user.id,
              updated_at: routine.updated_at || routine.created_at,
            }));
            const localSessions = cached.sessions.map((session) => ({ ...session, user_id: user.id }));
            const routineImport = localRoutines.length
              ? await supabase.from('gym_routines').upsert(localRoutines)
              : { error: null };
            const sessionImport = !routineImport.error && localSessions.length
              ? await supabase.from('gym_sessions').upsert(localSessions)
              : { error: routineImport.error };
            if (routineImport.error || sessionImport.error) {
              setStorageIssue(getCloudErrorMessage(routineImport.error || sessionImport.error));
              cloudRoutines = cached.routines;
              cloudSessions = cached.sessions;
            } else {
              cloudRoutines = localRoutines;
              cloudSessions = localSessions;
            }
          }
          if (!cloudLibraryExercises.length && cached.libraryExercises.length) {
            const localLibraryExercises = cached.libraryExercises.map((exercise) => ({
              ...exercise,
              user_id: user.id,
              updated_at: exercise.updated_at || exercise.created_at,
            }));
            const libraryImport = await supabase.from('gym_exercise_library').upsert(localLibraryExercises);
            if (libraryImport.error) {
              setStorageIssue(getCloudErrorMessage(libraryImport.error));
              cloudLibraryExercises = cached.libraryExercises;
            } else {
              cloudLibraryExercises = localLibraryExercises;
            }
          }
          setRoutines(cloudRoutines);
          setSessions(cloudSessions);
          setLibraryExercises(sortLibraryExercises(cloudLibraryExercises));
          try {
            localStorage.setItem(storageKey, JSON.stringify({
              routines: cloudRoutines,
              sessions: cloudSessions,
              libraryExercises: cloudLibraryExercises,
              activeWorkout: cached.activeWorkout,
            }));
          } catch {
            // La nube sigue funcionando aunque el navegador no permita usar localStorage.
          }
          channel = supabase
            .channel(`gym-${user.id}-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gym_routines', filter: `user_id=eq.${user.id}` }, (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new as GymRoutine;
                setRoutines((current) => sortRoutines([row, ...current.filter((item) => item.id !== row.id)]));
              } else {
                const id = String((payload.old as { id?: string }).id || '');
                setRoutines((current) => current.filter((item) => item.id !== id));
              }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gym_sessions', filter: `user_id=eq.${user.id}` }, (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new as GymSession;
                setSessions((current) => sortSessions([row, ...current.filter((item) => item.id !== row.id)]));
              } else {
                const id = String((payload.old as { id?: string }).id || '');
                setSessions((current) => current.filter((item) => item.id !== id));
              }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gym_exercise_library', filter: `user_id=eq.${user.id}` }, (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new as GymLibraryExercise;
                setLibraryExercises((current) => sortLibraryExercises([row, ...current.filter((item) => item.id !== row.id)]));
              } else {
                const id = String((payload.old as { id?: string }).id || '');
                setLibraryExercises((current) => current.filter((item) => item.id !== id));
              }
            })
            .subscribe();
        }
      } else {
        loadLocal();
      }
      if (active) setLoading(false);
    };

    void initialize();
    return () => {
      active = false;
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [isAppLoading, storageKey, supabase, user?.id]);

  const currentActiveWorkout = activeWorkoutOwnerKey === storageKey ? activeWorkout : null;

  const activeWorkoutStartedAt = currentActiveWorkout?.started_at;
  useEffect(() => {
    if (!activeWorkoutStartedAt) return;
    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(activeWorkoutStartedAt).getTime()) / 1000)));
    };
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [activeWorkoutStartedAt]);

  const thisWeekCount = sessions.filter((session) => {
    const date = new Date(`${session.performed_on}T12:00:00`);
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    return date >= monday && date < nextMonday;
  }).length;

  const openSession = (routine?: GymRoutine, existing?: GymSession) => {
    setFormError('');
    setEditingSession(existing || null);
    setEditingRoutine(null);
    setEditingLibraryExercise(null);
    setSessionDraft(existing ? {
      name: existing.name,
      performed_on: existing.performed_on,
      duration_minutes: existing.duration_minutes ? String(existing.duration_minutes) : '',
      notes: existing.notes || '',
      routine_id: existing.routine_id,
      exercises: existing.exercises.map((exercise) => ({ ...exercise })),
    } : routine ? {
      name: routine.name,
      performed_on: today(),
      duration_minutes: '',
      notes: '',
      routine_id: routine.id,
      exercises: routine.exercises.map((exercise) => ({ ...exercise, id: crypto.randomUUID() })),
    } : newSessionDraft());
    setDialog('session');
  };

  const beginWorkout = (routine?: GymRoutine) => {
    const startedAt = new Date().toISOString();
    const exercises = routine?.exercises.map((exercise) => {
      const setDetails = getSetDetails(exercise).map((set) => ({
        ...set,
        id: crypto.randomUUID(),
        completed: false,
      }));
      return {
        ...exercise,
        id: crypto.randomUUID(),
        set_details: setDetails,
        sets: setDetails.length,
      };
    }) || [];

    setActiveWorkoutOwnerKey(storageKey);
    const workout: ActiveWorkoutDraft = {
      id: crypto.randomUUID(),
      owner_key: storageKey,
      routine_id: routine?.id,
      name: routine?.name || startWorkoutName.trim() || 'Entrenamiento libre',
      started_at: startedAt,
      notes: '',
      exercises,
    };
    setActiveWorkout(workout);
    saveActiveWorkoutLocally(workout);
    setActiveWorkoutError('');
    setShowStartDialog(false);
    setElapsedSeconds(0);
  };

  const updateActiveWorkout = (values: Partial<ActiveWorkoutDraft>) => {
    if (!currentActiveWorkout) return;
    const updated = { ...currentActiveWorkout, ...values };
    setActiveWorkout(updated);
    saveActiveWorkoutLocally(updated);
    setActiveWorkoutError('');
  };

  const discardWorkout = () => {
    if (!currentActiveWorkout || !window.confirm('¿Descartar el entrenamiento en curso? Se perderán las series apuntadas.')) return;
    setActiveWorkout(null);
    saveActiveWorkoutLocally(null);
    setActiveWorkoutError('');
  };

  const finishWorkout = async () => {
    if (!currentActiveWorkout) return;
    const exercises = currentActiveWorkout.exercises.map((exercise) => {
      const completedSets = getSetDetails(exercise).filter((set) => set.completed);
      return {
        ...exercise,
        set_details: completedSets,
        sets: completedSets.length,
        reps: completedSets[0]?.reps || exercise.reps,
        weight_kg: completedSets[0]?.weight_kg,
      };
    }).filter((exercise) => exercise.name.trim() && exercise.set_details?.length);
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    await persistSession({
      id: currentActiveWorkout.id,
      user_id: user?.id,
      routine_id: currentActiveWorkout.routine_id,
      name: currentActiveWorkout.name.trim() || 'Entrenamiento',
      performed_on: dateFromTimestamp(currentActiveWorkout.started_at),
      duration_minutes: durationMinutes,
      notes: currentActiveWorkout.notes.trim() || undefined,
      exercises,
      created_at: currentActiveWorkout.started_at,
    }, null);
    setActiveWorkout(null);
    setActiveWorkoutError('');
  };

  const openRoutine = (routine?: GymRoutine) => {
    setFormError('');
    setEditingRoutine(routine || null);
    setEditingSession(null);
    setEditingLibraryExercise(null);
    setRoutineName(routine?.name || '');
    setRoutineNotes(routine?.notes || '');
    setRoutineExercises(routine?.exercises.map((exercise) => ({ ...exercise })) || [newExercise()]);
    setDialog('routine');
  };

  const openLibraryExercise = (exercise?: GymLibraryExercise) => {
    setFormError('');
    setEditingRoutine(null);
    setEditingSession(null);
    setEditingLibraryExercise(exercise || null);
    setLibraryDraft(exercise ? {
      name: exercise.name,
      muscle_group: exercise.muscle_group || '',
      equipment: exercise.equipment || '',
      default_sets: String(exercise.default_sets),
      default_reps: String(exercise.default_reps),
      default_weight_kg: exercise.default_weight_kg == null ? '' : String(exercise.default_weight_kg),
      notes: exercise.notes || '',
    } : emptyLibraryExerciseDraft());
    setDialog('exercise');
  };

  const persistRoutine = async (routine: GymRoutine) => {
    const nextRoutines = sortRoutines([routine, ...routines.filter((item) => item.id !== routine.id)]);
    setRoutines(nextRoutines);
    saveLocal(nextRoutines, sessions);
    if (!supabase || !user?.id) return;
    const { error } = await supabase.from('gym_routines').upsert({ ...routine, user_id: user.id });
    if (error) setStorageIssue(getCloudErrorMessage(error));
  };

  const persistSession = async (session: GymSession, activeDraft?: ActiveWorkoutDraft | null) => {
    const nextSessions = sortSessions([session, ...sessions.filter((item) => item.id !== session.id)]);
    setSessions(nextSessions);
    saveLocal(routines, nextSessions, libraryExercises, activeDraft);
    if (!supabase || !user?.id) return;
    const { error } = await supabase.from('gym_sessions').upsert({ ...session, user_id: user.id });
    if (error) setStorageIssue(getCloudErrorMessage(error));
  };

  const persistLibraryExercise = async (exercise: GymLibraryExercise) => {
    const nextExercises = sortLibraryExercises([
      exercise,
      ...libraryExercises.filter((item) => item.id !== exercise.id),
    ]);
    setLibraryExercises(nextExercises);
    saveLocal(routines, sessions, nextExercises);
    if (!supabase || !user?.id) return;
    const { error } = await supabase.from('gym_exercise_library').upsert({ ...exercise, user_id: user.id });
    if (error) setStorageIssue(getCloudErrorMessage(error));
  };

  const submitRoutine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!routineName.trim()) return setFormError('Escribe un nombre para la rutina.');
    const exercises = routineExercises.filter((exercise) => exercise.name.trim()).map((exercise) => ({
      ...exercise,
      name: exercise.name.trim(),
    }));
    if (!exercises.length) return setFormError('Añade al menos un ejercicio a la rutina.');
    setSaving(true);
    const now = new Date().toISOString();
    await persistRoutine({
      id: editingRoutine?.id || crypto.randomUUID(),
      user_id: user?.id,
      name: routineName.trim(),
      notes: routineNotes.trim() || undefined,
      exercises,
      created_at: editingRoutine?.created_at || now,
      updated_at: now,
    });
    setSaving(false);
    setDialog(null);
  };

  const submitSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionDraft.name.trim()) return setFormError('Escribe un nombre para el entrenamiento.');
    setSaving(true);
    const now = new Date().toISOString();
    const session: GymSession = {
      id: editingSession?.id || crypto.randomUUID(),
      user_id: user?.id,
      routine_id: sessionDraft.routine_id,
      name: sessionDraft.name.trim(),
      performed_on: sessionDraft.performed_on,
      duration_minutes: Number(sessionDraft.duration_minutes) || undefined,
      notes: sessionDraft.notes.trim() || undefined,
      exercises: sessionDraft.exercises.filter((exercise) => exercise.name.trim()).map((exercise) => ({
        ...exercise,
        name: exercise.name.trim(),
      })),
      created_at: editingSession?.created_at || now,
    };
    await persistSession(session);
    setSaving(false);
    setDialog(null);
  };

  const submitLibraryExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!libraryDraft.name.trim()) return setFormError('Escribe un nombre para el ejercicio.');
    setSaving(true);
    const now = new Date().toISOString();
    await persistLibraryExercise({
      id: editingLibraryExercise?.id || crypto.randomUUID(),
      user_id: user?.id,
      name: libraryDraft.name.trim(),
      muscle_group: libraryDraft.muscle_group || undefined,
      equipment: libraryDraft.equipment.trim() || undefined,
      default_sets: Math.max(1, Number(libraryDraft.default_sets) || 1),
      default_reps: Math.max(1, Number(libraryDraft.default_reps) || 1),
      default_weight_kg: libraryDraft.default_weight_kg === '' ? undefined : Math.max(0, Number(libraryDraft.default_weight_kg) || 0),
      notes: libraryDraft.notes.trim() || undefined,
      created_at: editingLibraryExercise?.created_at || now,
      updated_at: now,
    });
    setSaving(false);
    setDialog(null);
  };

  const removeRoutine = async (routine: GymRoutine) => {
    if (!window.confirm(`¿Eliminar la rutina «${routine.name}»?`)) return;
    const nextRoutines = routines.filter((item) => item.id !== routine.id);
    const nextSessions = sessions.map((item) => item.routine_id === routine.id ? { ...item, routine_id: undefined } : item);
    setRoutines(nextRoutines);
    setSessions(nextSessions);
    saveLocal(nextRoutines, nextSessions);
    if (supabase && user?.id) {
      const { error } = await supabase.from('gym_routines').delete().eq('id', routine.id).eq('user_id', user.id);
      if (error) setStorageIssue(getCloudErrorMessage(error));
    }
  };

  const removeSession = async (session: GymSession) => {
    if (!window.confirm(`¿Eliminar el entrenamiento «${session.name}»?`)) return;
    const nextSessions = sessions.filter((item) => item.id !== session.id);
    setSessions(nextSessions);
    saveLocal(routines, nextSessions);
    if (supabase && user?.id) {
      const { error } = await supabase.from('gym_sessions').delete().eq('id', session.id).eq('user_id', user.id);
      if (error) setStorageIssue(getCloudErrorMessage(error));
    }
  };

  const removeLibraryExercise = async (exercise: GymLibraryExercise) => {
    if (!window.confirm(`¿Eliminar «${exercise.name}» de tu biblioteca?`)) return;
    const nextExercises = libraryExercises.filter((item) => item.id !== exercise.id);
    setLibraryExercises(nextExercises);
    saveLocal(routines, sessions, nextExercises);
    if (supabase && user?.id) {
      const { error } = await supabase.from('gym_exercise_library').delete().eq('id', exercise.id).eq('user_id', user.id);
      if (error) setStorageIssue(getCloudErrorMessage(error));
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-7 sm:px-6 sm:pt-10">
      <Link href="/" className="inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-[#929d97] transition hover:text-[#edf0ed]">
        <ArrowLeft className="h-4 w-4" /> Todos los canales
      </Link>

      <section className="relative mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#251c1b] via-[#251c1b] to-[#171e1c] p-6 text-white shadow-lg shadow-rose-900/10 sm:p-9">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-[#141a18]/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#141a18]/15 px-3 py-1.5 text-xs font-bold tracking-wide text-white/90">
              <Activity className="h-3.5 w-3.5" /> MIMODO · GIMNASIO
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Entrena a tu ritmo.</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/80 sm:text-base">
              Empieza una sesión y registra repeticiones y peso serie a serie mientras entrenas.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => {
                setStartWorkoutName('Entrenamiento libre');
                setActiveWorkoutError('');
                setShowStartDialog(true);
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#141a18] px-5 py-3 text-sm font-bold text-[#e0aaa3] shadow-sm transition hover:bg-[#291e1d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3c4641]/40"
            >
              <Play className="h-4 w-4 fill-current" /> Empezar entrenamiento
            </button>
            <button type="button" onClick={() => openSession()} className="rounded-xl px-3 py-2 text-xs font-bold text-white/85 transition hover:bg-[#141a18]/10 hover:text-white">
              Registrar una sesión pasada
            </button>
          </div>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-3">
          <div className="rounded-2xl border border-[#303936]/15 bg-[#141a18]/10 p-4 backdrop-blur-sm">
            <p className="text-2xl font-extrabold">{thisWeekCount}</p>
            <p className="mt-1 text-xs font-medium text-white/75">sesiones esta semana</p>
          </div>
          <div className="rounded-2xl border border-[#303936]/15 bg-[#141a18]/10 p-4 backdrop-blur-sm">
            <p className="text-2xl font-extrabold">{routines.length}</p>
            <p className="mt-1 text-xs font-medium text-white/75">rutinas guardadas</p>
          </div>
          <div className="rounded-2xl border border-[#303936]/15 bg-[#141a18]/10 p-4 backdrop-blur-sm">
            <p className="text-2xl font-extrabold">{libraryExercises.length}</p>
            <p className="mt-1 text-xs font-medium text-white/75">ejercicios guardados</p>
          </div>
        </div>
      </section>

      {storageIssue ? (
        <div role="status" className="mt-5 rounded-2xl border border-[#51452f] bg-[#282319] px-4 py-3 text-sm leading-6 text-[#d5bc8c]">
          {storageIssue}
        </div>
      ) : !supabase || !user ? (
        <div className="mt-5 rounded-2xl border border-[#344951] bg-[#192226]/70 px-4 py-3 text-sm leading-6 text-[#a8c7d4]">
          {isSupabaseConnected
            ? 'Tus entrenamientos se guardan en este navegador. Inicia sesión para sincronizarlos con tu cuenta.'
            : 'Modo local: tus entrenamientos se guardan en este navegador.'}
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="inline-flex rounded-2xl border border-[#2b3430] bg-[#141a18] p-1 shadow-sm" role="tablist" aria-label="Secciones de gimnasio">
          {([
            ['history', 'Historial'],
            ['routines', 'Mis rutinas'],
            ['exercises', 'Ejercicios'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                'rounded-xl px-4 py-2.5 text-sm font-bold transition',
                tab === value ? 'bg-[#222b28] text-white shadow-sm' : 'text-[#929d97] hover:bg-[#1a211e] hover:text-[#d7ded9]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {(tab === 'routines' || tab === 'exercises') && (
          <button
            type="button"
            onClick={() => tab === 'routines' ? openRoutine() : openLibraryExercise()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#222b28] px-4 text-sm font-bold text-white transition hover:bg-[#303a36]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{tab === 'routines' ? 'Nueva rutina' : 'Nuevo ejercicio'}</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        )}
      </div>

      {loading || isAppLoading ? (
        <div className="flex min-h-64 items-center justify-center text-sm font-medium text-[#929d97]">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Cargando tus entrenamientos…
        </div>
      ) : tab === 'history' ? (
        <section className="mt-5 space-y-3" aria-label="Historial de entrenamientos">
          {sessions.length ? sessions.map((session) => (
            <article key={session.id} className="rounded-3xl border border-[#2b3430]/80 bg-[#141a18] p-5 shadow-sm transition hover:border-[#503638] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#291e1d] text-[#e0aaa3]">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-extrabold text-[#edf0ed] sm:text-lg">{session.name}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#929d97]">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(session.performed_on)}</span>
                      {session.duration_minutes && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{session.duration_minutes} min</span>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => openSession(undefined, session)} aria-label="Editar entrenamiento" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7d8983] transition hover:bg-[#1a211e] hover:text-[#d7ded9]"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => removeSession(session)} aria-label="Eliminar entrenamiento" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7d8983] transition hover:bg-[#291e1d] hover:text-[#e0aaa3]"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {session.exercises.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {session.exercises.map((exercise) => (
                    <span key={exercise.id} className="rounded-full bg-[#1a211e] px-3 py-1.5 text-xs font-semibold text-[#aab4ae]">
                      {exercise.name} · {getSetDetails(exercise).map((set) => `${set.reps} rep · ${set.weight_kg != null ? `${set.weight_kg} kg` : 'sin peso'}`).join(' / ')}
                    </span>
                  ))}
                </div>
              )}
              {session.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#929d97]">{session.notes}</p>}
            </article>
          )) : (
            <div className="rounded-3xl border border-dashed border-[#2b3430] bg-[#141a18] px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#291e1d] text-[#e0aaa3]"><Dumbbell className="h-6 w-6" /></div>
              <h2 className="mt-4 text-lg font-extrabold text-[#edf0ed]">Aquí aparecerán tus entrenamientos</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#929d97]">Registra tu primera sesión o crea una rutina para empezar.</p>
              <button type="button" onClick={() => openSession()} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#623d3e] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#623d3e]"><Plus className="h-4 w-4" /> Registrar sesión</button>
            </div>
          )}
        </section>
      ) : tab === 'routines' ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Rutinas guardadas">
          {routines.length ? routines.map((routine) => (
            <article key={routine.id} className="flex flex-col rounded-3xl border border-[#2b3430]/80 bg-[#141a18] p-5 shadow-sm transition hover:border-[#51452f]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold text-[#edf0ed]">{routine.name}</h2>
                  <p className="mt-1 text-xs font-semibold text-[#7d8983]">{routine.exercises.length} ejercicios</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => openRoutine(routine)} aria-label={`Editar ${routine.name}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7d8983] transition hover:bg-[#1a211e] hover:text-[#d7ded9]"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => removeRoutine(routine)} aria-label={`Eliminar ${routine.name}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7d8983] transition hover:bg-[#291e1d] hover:text-[#e0aaa3]"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {routine.exercises.slice(0, 5).map((exercise) => <span key={exercise.id} className="rounded-full bg-[#282319] px-3 py-1.5 text-xs font-semibold text-[#d5bc8c]">{exercise.name}</span>)}
                {routine.exercises.length > 5 && <span className="px-2 py-1.5 text-xs font-semibold text-[#7d8983]">+{routine.exercises.length - 5}</span>}
              </div>
              {routine.notes && <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#929d97]">{routine.notes}</p>}
              <button type="button" onClick={() => beginWorkout(routine)} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#291e1d] px-4 text-sm font-bold text-[#e0aaa3] transition hover:bg-[#291e1d]"><Activity className="h-4 w-4" /> Empezar esta rutina</button>
            </article>
          )) : (
            <div className="rounded-3xl border border-dashed border-[#2b3430] bg-[#141a18] px-5 py-12 text-center sm:col-span-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#282319] text-[#d5bc8c]"><Sparkles className="h-6 w-6" /></div>
              <h2 className="mt-4 text-lg font-extrabold text-[#edf0ed]">Crea tu primera rutina</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#929d97]">Guarda tus ejercicios habituales para volver a usarlos en cada entrenamiento.</p>
              <button type="button" onClick={() => openRoutine()} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#222b28] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Nueva rutina</button>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Biblioteca de ejercicios">
          {libraryExercises.length ? libraryExercises.map((exercise) => (
            <article key={exercise.id} className="rounded-3xl border border-[#2b3430]/80 bg-[#141a18] p-5 shadow-sm transition hover:border-[#344951]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold text-[#edf0ed]">{exercise.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {exercise.muscle_group && <span className="rounded-full bg-[#192226] px-3 py-1 text-xs font-semibold text-[#a8c7d4]">{exercise.muscle_group}</span>}
                    {exercise.equipment && <span className="rounded-full bg-[#1a211e] px-3 py-1 text-xs font-semibold text-[#aab4ae]">{exercise.equipment}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => openLibraryExercise(exercise)} aria-label={`Editar ${exercise.name}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7d8983] transition hover:bg-[#1a211e] hover:text-[#d7ded9]"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => removeLibraryExercise(exercise)} aria-label={`Eliminar ${exercise.name}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7d8983] transition hover:bg-[#291e1d] hover:text-[#e0aaa3]"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-4 text-sm font-bold text-[#c2cbc5]">
                {exercise.default_sets} series × {exercise.default_reps} repeticiones
                {exercise.default_weight_kg != null ? ` · ${exercise.default_weight_kg} kg` : ''}
              </p>
              {exercise.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#929d97]">{exercise.notes}</p>}
            </article>
          )) : (
            <div className="rounded-3xl border border-dashed border-[#2b3430] bg-[#141a18] px-5 py-12 text-center sm:col-span-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#192226] text-[#a8c7d4]"><Dumbbell className="h-6 w-6" /></div>
              <h2 className="mt-4 text-lg font-extrabold text-[#edf0ed]">Crea tu biblioteca de ejercicios</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#929d97]">Guarda tus ejercicios con sus series y repeticiones habituales, y añádelos a las rutinas con un toque.</p>
              <button type="button" onClick={() => openLibraryExercise()} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#222b28] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Nuevo ejercicio</button>
            </div>
          )}
        </section>
      )}

      {showStartDialog && !currentActiveWorkout && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#222b28]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowStartDialog(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="start-workout-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[#141a18] p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#e0aaa3]">MiModo · Gimnasio</p>
                <h2 id="start-workout-title" className="mt-1 text-xl font-extrabold text-[#edf0ed]">Empezar entrenamiento</h2>
                <p className="mt-1 text-sm text-[#929d97]">El cronómetro empieza al elegir una opción.</p>
              </div>
              <button type="button" onClick={() => setShowStartDialog(false)} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1a211e] text-[#929d97] transition hover:bg-[#1a211e]"><X className="h-5 w-5" /></button>
            </div>

            <label className="block text-sm font-bold text-[#c2cbc5]">Nombre del entrenamiento
              <input value={startWorkoutName} onChange={(event) => setStartWorkoutName(event.target.value)} placeholder="Ej. Tren superior" autoFocus className="mt-1.5 w-full rounded-2xl border border-[#2b3430] px-4 py-3 text-sm font-medium outline-none placeholder:text-[#7d8983] focus:border-[#503638] focus:ring-4 focus:ring-[#805153]" />
            </label>
            <button type="button" onClick={() => beginWorkout()} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#623d3e] px-4 text-sm font-bold text-white transition hover:bg-[#623d3e]">
              <Play className="h-4 w-4 fill-current" /> Empezar en blanco
            </button>

            {routines.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7d8983]">O empezar con una rutina</p>
                <div className="space-y-2">
                  {routines.map((routine) => (
                    <button key={routine.id} type="button" onClick={() => beginWorkout(routine)} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-[#2b3430] px-4 py-3 text-left transition hover:border-[#503638] hover:bg-[#291e1d]/50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-[#d7ded9]">{routine.name}</span>
                        <span className="mt-0.5 block text-xs text-[#7d8983]">{routine.exercises.length} ejercicios</span>
                      </span>
                      <Play className="h-4 w-4 shrink-0 text-[#e0aaa3]" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {currentActiveWorkout && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#0b0e0f] text-[#edf0ed]">
          <main className="mx-auto max-w-3xl px-4 pb-8 pt-4 sm:px-6 sm:pt-7">
            <header className="sticky top-0 z-10 -mx-4 mb-5 flex items-center justify-between border-b border-[#2b3430]/80 bg-[#111615]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#e0aaa3]">Entrenamiento en curso</p>
                <p className="mt-0.5 font-mono text-xl font-extrabold tabular-nums text-[#edf0ed]" aria-live="off">{formatElapsed(elapsedSeconds)}</p>
              </div>
              <button type="button" onClick={discardWorkout} className="rounded-xl px-3 py-2 text-sm font-bold text-[#929d97] transition hover:bg-[#291e1d] hover:text-[#e0aaa3]">Descartar</button>
            </header>

            <section className="rounded-3xl border border-[#2b3430]/80 bg-[#141a18] p-5 shadow-sm sm:p-6">
              <label className="block text-sm font-bold text-[#c2cbc5]">Nombre del entrenamiento
                <input value={currentActiveWorkout.name} onChange={(event) => updateActiveWorkout({ name: event.target.value })} className="mt-1.5 w-full rounded-2xl border border-[#2b3430] px-4 py-3 text-lg font-extrabold outline-none focus:border-[#503638] focus:ring-4 focus:ring-[#805153]" />
              </label>
              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#edf0ed]">Ejercicios y series</h2>
                  <p className="mt-1 text-xs text-[#929d97]">Apunta cada serie y márcala al terminarla.</p>
                </div>
                <span className="rounded-full bg-[#291e1d] px-3 py-1.5 text-xs font-bold text-[#e0aaa3]">{currentActiveWorkout.exercises.length} ejercicios</span>
              </div>
              <div className="mt-4">
                <ExerciseEditor
                  exercises={currentActiveWorkout.exercises}
                  onChange={(exercises) => updateActiveWorkout({ exercises })}
                  libraryExercises={libraryExercises}
                  trackCompletion
                />
              </div>
              <label className="mt-5 block text-sm font-bold text-[#c2cbc5]">Notas <span className="font-normal text-[#7d8983]">(opcional)</span>
                <textarea value={currentActiveWorkout.notes} onChange={(event) => updateActiveWorkout({ notes: event.target.value })} rows={2} placeholder="Sensaciones, pausas o recordatorios" className="mt-1.5 w-full resize-y rounded-2xl border border-[#2b3430] px-4 py-3 text-sm font-medium outline-none placeholder:text-[#7d8983] focus:border-[#503638] focus:ring-4 focus:ring-[#805153]" />
              </label>
            </section>

            {activeWorkoutError && <p role="alert" className="mt-4 rounded-2xl border border-[#503638] bg-[#291e1d] px-4 py-3 text-sm font-semibold text-[#e0aaa3]">{activeWorkoutError}</p>}
            <div className="sticky bottom-2 mt-4 rounded-2xl border border-[#2b3430]/80 bg-[#141a18]/95 p-2 shadow-lg backdrop-blur">
              <button type="button" onClick={() => void finishWorkout()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#385440] px-4 text-sm font-extrabold text-white transition hover:bg-[#385440]">
                <Check className="h-4 w-4" /> Terminar y guardar entrenamiento
              </button>
            </div>
          </main>
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#222b28]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="gym-dialog-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-[#141a18] p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#e0aaa3]">MiModo · Gimnasio</p>
                <h2 id="gym-dialog-title" className="mt-1 text-xl font-extrabold text-[#edf0ed]">
                  {dialog === 'routine'
                    ? (editingRoutine ? 'Editar rutina' : 'Nueva rutina')
                    : dialog === 'exercise'
                      ? (editingLibraryExercise ? 'Editar ejercicio' : 'Nuevo ejercicio')
                      : (editingSession ? 'Editar entrenamiento' : 'Registrar entrenamiento')}
                </h2>
              </div>
              <button type="button" onClick={() => setDialog(null)} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1a211e] text-[#929d97] transition hover:bg-[#1a211e]"><X className="h-5 w-5" /></button>
            </div>

            {dialog === 'routine' ? (
              <form onSubmit={submitRoutine} className="space-y-4">
                <label className="block text-sm font-bold text-[#c2cbc5]">Nombre de la rutina
                  <input value={routineName} onChange={(event) => setRoutineName(event.target.value)} placeholder="Ej. Tren superior" autoFocus className="mt-1.5 w-full rounded-2xl border border-[#2b3430] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-[#7d8983] focus:border-[#503638] focus:ring-4 focus:ring-[#805153]" />
                </label>
                <label className="block text-sm font-bold text-[#c2cbc5]">Notas <span className="font-normal text-[#7d8983]">(opcional)</span>
                  <textarea value={routineNotes} onChange={(event) => setRoutineNotes(event.target.value)} rows={2} placeholder="Días, objetivos o recordatorios" className="mt-1.5 w-full resize-y rounded-2xl border border-[#2b3430] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-[#7d8983] focus:border-[#503638] focus:ring-4 focus:ring-[#805153]" />
                </label>
                <div>
                  <p className="mb-2 text-sm font-bold text-[#c2cbc5]">Ejercicios</p>
                  <ExerciseEditor exercises={routineExercises} onChange={setRoutineExercises} libraryExercises={libraryExercises} />
                </div>
                {formError && <p role="alert" className="rounded-xl bg-[#291e1d] px-3 py-2 text-sm font-medium text-[#e0aaa3]">{formError}</p>}
                <button type="submit" disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#623d3e] px-4 text-sm font-bold text-white transition hover:bg-[#623d3e] disabled:opacity-60">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{editingRoutine ? 'Guardar cambios' : 'Guardar rutina'}
                </button>
              </form>
            ) : dialog === 'exercise' ? (
              <form onSubmit={submitLibraryExercise} className="space-y-4">
                <label className="block text-sm font-bold text-[#c2cbc5]">Nombre del ejercicio
                  <input value={libraryDraft.name} onChange={(event) => setLibraryDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Press de banca" autoFocus className="mt-1.5 w-full rounded-2xl border border-[#2b3430] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-[#7d8983] focus:border-[#344951] focus:ring-4 focus:ring-[#4c6c75]" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-bold text-[#c2cbc5]">Grupo muscular
                    <select value={libraryDraft.muscle_group} onChange={(event) => setLibraryDraft((current) => ({ ...current, muscle_group: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-[#2b3430] bg-[#141a18] px-3 py-3 text-sm font-medium outline-none focus:border-[#344951] focus:ring-4 focus:ring-[#4c6c75]">
                      <option value="">Sin especificar</option>
                      {['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Piernas', 'Glúteos', 'Core', 'Cardio', 'Cuerpo completo', 'Otro'].map((group) => <option key={group} value={group}>{group}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-[#c2cbc5]">Material <span className="font-normal text-[#7d8983]">(opcional)</span>
                    <input value={libraryDraft.equipment} onChange={(event) => setLibraryDraft((current) => ({ ...current, equipment: event.target.value }))} placeholder="Ej. Mancuernas" className="mt-1.5 w-full rounded-2xl border border-[#2b3430] px-3 py-3 text-sm font-medium outline-none placeholder:text-[#7d8983] focus:border-[#344951] focus:ring-4 focus:ring-[#4c6c75]" />
                  </label>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold text-[#c2cbc5]">Valores iniciales <span className="font-normal text-[#7d8983]">(puedes cambiarlos al entrenar)</span></p>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="text-[11px] font-semibold text-[#929d97]">Series
                      <input type="number" min="1" max="30" value={libraryDraft.default_sets} onChange={(event) => setLibraryDraft((current) => ({ ...current, default_sets: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#2b3430] px-3 py-2.5 text-sm font-medium text-[#d7ded9] outline-none focus:border-[#344951] focus:ring-4 focus:ring-[#4c6c75]" />
                    </label>
                    <label className="text-[11px] font-semibold text-[#929d97]">Repeticiones
                      <input type="number" min="1" max="1000" value={libraryDraft.default_reps} onChange={(event) => setLibraryDraft((current) => ({ ...current, default_reps: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#2b3430] px-3 py-2.5 text-sm font-medium text-[#d7ded9] outline-none focus:border-[#344951] focus:ring-4 focus:ring-[#4c6c75]" />
                    </label>
                    <label className="text-[11px] font-semibold text-[#929d97]">Peso (kg)
                      <input type="number" min="0" step="0.5" value={libraryDraft.default_weight_kg} onChange={(event) => setLibraryDraft((current) => ({ ...current, default_weight_kg: event.target.value }))} placeholder="—" className="mt-1 w-full rounded-xl border border-[#2b3430] px-3 py-2.5 text-sm font-medium text-[#d7ded9] outline-none placeholder:text-[#68746e] focus:border-[#344951] focus:ring-4 focus:ring-[#4c6c75]" />
                    </label>
                  </div>
                </div>
                <label className="block text-sm font-bold text-[#c2cbc5]">Notas <span className="font-normal text-[#7d8983]">(opcional)</span>
                  <textarea value={libraryDraft.notes} onChange={(event) => setLibraryDraft((current) => ({ ...current, notes: event.target.value }))} rows={2} placeholder="Técnica o recordatorios" className="mt-1.5 w-full resize-y rounded-2xl border border-[#2b3430] px-4 py-3 text-sm font-medium outline-none placeholder:text-[#7d8983] focus:border-[#344951] focus:ring-4 focus:ring-[#4c6c75]" />
                </label>
                {formError && <p role="alert" className="rounded-xl bg-[#291e1d] px-3 py-2 text-sm font-medium text-[#e0aaa3]">{formError}</p>}
                <button type="submit" disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#3a5963] px-4 text-sm font-bold text-white transition hover:bg-[#3a5963] disabled:opacity-60">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{editingLibraryExercise ? 'Guardar cambios' : 'Guardar ejercicio'}
                </button>
              </form>
            ) : (
              <form onSubmit={submitSession} className="space-y-4">
                {routines.length > 0 && (
                  <label className="block text-sm font-bold text-[#c2cbc5]">Partir de una rutina <span className="font-normal text-[#7d8983]">(opcional)</span>
                    <select value={sessionDraft.routine_id || ''} onChange={(event) => {
                      const routine = routines.find((item) => item.id === event.target.value);
                      setSessionDraft((current) => routine ? {
                        ...current,
                        name: routine.name,
                        routine_id: routine.id,
                        exercises: routine.exercises.map((exercise) => ({ ...exercise, id: crypto.randomUUID() })),
                      } : { ...current, routine_id: undefined });
                    }} className="mt-1.5 w-full rounded-2xl border border-[#2b3430] bg-[#141a18] px-4 py-3 text-sm font-medium outline-none focus:border-[#503638] focus:ring-4 focus:ring-[#805153]">
                      <option value="">Entrenamiento libre</option>
                      {routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}
                    </select>
                  </label>
                )}
                <label className="block text-sm font-bold text-[#c2cbc5]">Nombre
                  <input value={sessionDraft.name} onChange={(event) => setSessionDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Pierna y core" autoFocus className="mt-1.5 w-full rounded-2xl border border-[#2b3430] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-[#7d8983] focus:border-[#503638] focus:ring-4 focus:ring-[#805153]" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-bold text-[#c2cbc5]">Fecha
                    <input type="date" value={sessionDraft.performed_on} onChange={(event) => setSessionDraft((current) => ({ ...current, performed_on: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-[#2b3430] bg-[#141a18] px-3 py-3 text-sm font-medium outline-none focus:border-[#503638] focus:ring-4 focus:ring-[#805153]" />
                  </label>
                  <label className="block text-sm font-bold text-[#c2cbc5]">Duración (min)
                    <input type="number" min="1" max="1440" value={sessionDraft.duration_minutes} onChange={(event) => setSessionDraft((current) => ({ ...current, duration_minutes: event.target.value }))} placeholder="Ej. 50" className="mt-1.5 w-full rounded-2xl border border-[#2b3430] px-3 py-3 text-sm font-medium outline-none placeholder:text-[#7d8983] focus:border-[#503638] focus:ring-4 focus:ring-[#805153]" />
                  </label>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold text-[#c2cbc5]">Ejercicios <span className="font-normal text-[#7d8983]">(opcional)</span></p>
                  <ExerciseEditor exercises={sessionDraft.exercises} onChange={(exercises) => setSessionDraft((current) => ({ ...current, exercises }))} libraryExercises={libraryExercises} />
                </div>
                <label className="block text-sm font-bold text-[#c2cbc5]">Notas <span className="font-normal text-[#7d8983]">(opcional)</span>
                  <textarea value={sessionDraft.notes} onChange={(event) => setSessionDraft((current) => ({ ...current, notes: event.target.value }))} rows={2} placeholder="¿Cómo fue el entrenamiento?" className="mt-1.5 w-full resize-y rounded-2xl border border-[#2b3430] px-4 py-3 text-sm font-medium outline-none placeholder:text-[#7d8983] focus:border-[#503638] focus:ring-4 focus:ring-[#805153]" />
                </label>
                {formError && <p role="alert" className="rounded-xl bg-[#291e1d] px-3 py-2 text-sm font-medium text-[#e0aaa3]">{formError}</p>}
                <button type="submit" disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#623d3e] px-4 text-sm font-bold text-white transition hover:bg-[#623d3e] disabled:opacity-60">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{editingSession ? 'Guardar cambios' : 'Guardar entrenamiento'}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
