import { useState } from 'react';
import { Page, ParticipantSession, HanoiSessionResult, CorsiSessionResult, StroopSessionResult, TaskSwitchingSessionResult } from './types';

// Participant pages
import LandingPage from './pages/LandingPage';
import ResearchInfoPage from './pages/ResearchInfoPage';
import ConsentPage from './pages/ConsentPage';
import ParticipantDashboard from './pages/ParticipantDashboard';
import TowerOfHanoiRoom from './pages/TowerOfHanoiRoom';
import CorsiRoom from './pages/CorsiRoom';
import StroopRoom from './pages/StroopRoom';
import TaskSwitchingRoom from './pages/TaskSwitchingRoom';
import TaskCompletionPage from './pages/TaskCompletionPage';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ParticipantManagement from './pages/admin/ParticipantManagement';
import ExperimentConfig from './pages/admin/ExperimentConfig';
import HanoiAnalysis from './pages/admin/HanoiAnalysis';
import CorsiAnalysis from './pages/admin/CorsiAnalysis';
import StroopAnalysis from './pages/admin/StroopAnalysis';
import TaskSwitchingAnalysis from './pages/admin/TaskSwitchingAnalysis';
import GraphsInsights from './pages/admin/GraphsInsights';
import DataExport from './pages/admin/DataExport';
import Settings from './pages/admin/Settings';

// Service layers
import {
  registerParticipantSession,
  getStoredSessionContext,
  persistHanoiResults,
  persistCorsiResults,
  persistStroopResults,
  persistTaskSwitchingResults,
  finalizeStudySession,
  flushUnsavedTelemetryQueue,
  initializeParticipantConfigs,
} from './services/participantService';
import { signOutAdmin, checkAdminSession } from './services/adminService';
import { useEffect, useRef } from 'react';

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [participant, setParticipant] = useState<ParticipantSession | null>(null);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const activeSessionIdRef = useRef<string | null>(null);

  // Attempt session restoration and configuration sync on page load
  useEffect(() => {
    initializeParticipantConfigs();
    const stored = getStoredSessionContext();
    if (stored) {
      setParticipant(stored.participantData);
      activeSessionIdRef.current = stored.sessionId;
    }
    checkAdminSession().then(isAuth => {
      if (isAuth) setIsAdminAuth(true);
    });
    flushUnsavedTelemetryQueue();
  }, []);

  const navigate = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegister = (p: ParticipantSession) => {
    setParticipant(p);
    registerParticipantSession(p).then(res => {
      if (res?.sessionId) {
        activeSessionIdRef.current = res.sessionId;
        setParticipant(prev => (prev ? { ...prev, sessionId: res.sessionId, dbId: res.participantId } : prev));
      }
    });
  };

  const handleResume = (p: ParticipantSession, sid: string) => {
    setParticipant(p);
    activeSessionIdRef.current = sid;
    navigate('participant-dashboard');
  };

  const handleHanoiComplete = (result: HanoiSessionResult) => {
    setParticipant(prev => {
      const updated = prev ? { ...prev, hanoiCompleted: true, hanoiResult: result } : prev;
      checkCompletionAndPersist(updated);
      return updated;
    });
    const sid = activeSessionIdRef.current || getStoredSessionContext()?.sessionId;
    if (sid) {
      persistHanoiResults(sid, result);
    } else {
      console.error('[App] Failed to persist Hanoi results: No active session ID found.');
    }
  };

  const handleCorsiComplete = (result: CorsiSessionResult) => {
    setParticipant(prev => {
      const updated = prev ? { ...prev, corsiCompleted: true, corsiResult: result } : prev;
      checkCompletionAndPersist(updated);
      return updated;
    });
    const sid = activeSessionIdRef.current || getStoredSessionContext()?.sessionId;
    if (sid) {
      persistCorsiResults(sid, result);
    } else {
      console.error('[App] Failed to persist Corsi results: No active session ID found.');
    }
  };

  const handleStroopComplete = (result: StroopSessionResult) => {
    setParticipant(prev => {
      const updated = prev ? { ...prev, stroopCompleted: true, stroopResult: result } : prev;
      checkCompletionAndPersist(updated);
      return updated;
    });
    const sid = activeSessionIdRef.current || getStoredSessionContext()?.sessionId;
    if (sid) {
      persistStroopResults(sid, result);
    } else {
      console.error('[App] Failed to persist Stroop results: No active session ID found.');
    }
  };

  const handleTaskSwitchingComplete = (result: TaskSwitchingSessionResult) => {
    setParticipant(prev => {
      const updated = prev ? { ...prev, taskSwitchingCompleted: true, taskSwitchingResult: result } : prev;
      checkCompletionAndPersist(updated);
      return updated;
    });
    const sid = activeSessionIdRef.current || getStoredSessionContext()?.sessionId;
    if (sid) {
      persistTaskSwitchingResults(sid, result);
    } else {
      console.error('[App] Failed to persist Task Switching results: No active session ID found.');
    }
  };

  const checkCompletionAndPersist = (p: ParticipantSession | null) => {
    if (!p) return;
    const isAllDone = p.hanoiCompleted && p.corsiCompleted && p.stroopCompleted && p.taskSwitchingCompleted;
    const sid = activeSessionIdRef.current || getStoredSessionContext()?.sessionId;
    if (isAllDone && sid) {
      finalizeStudySession(sid);
    }
  };

  const handleLogout = () => {
    signOutAdmin();
    setIsAdminAuth(false);
    navigate('landing');
  };

  // Guard: participant pages need a registered participant
  const requireParticipant = (el: React.ReactNode) => {
    if (!participant) { navigate('consent'); return null; }
    return el;
  };

  // Guard: admin pages need auth
  const requireAdmin = (el: React.ReactNode) => {
    if (!isAdminAuth) { navigate('admin-login'); return null; }
    return el;
  };

  const adminProps = { navigate, onLogout: handleLogout, currentPage: page };

  switch (page) {
    // ─── Public / Participant ────────────────────────────────────────────────
    case 'landing':
      return <LandingPage navigate={navigate} onResume={handleResume} />;

    case 'research-info':
      return <ResearchInfoPage navigate={navigate} />;

    case 'consent':
      return <ConsentPage navigate={navigate} onRegister={handleRegister} />;

    case 'participant-dashboard':
      return requireParticipant(
        <ParticipantDashboard navigate={navigate} participant={participant!} />
      ) as React.ReactElement;

    case 'hanoi-room':
      return requireParticipant(
        <TowerOfHanoiRoom
          navigate={navigate}
          participant={participant!}
          sessionId={activeSessionIdRef.current || getStoredSessionContext()?.sessionId}
          onComplete={handleHanoiComplete}
        />
      ) as React.ReactElement;

    case 'corsi-room':
      return requireParticipant(
        <CorsiRoom
          navigate={navigate}
          participant={participant!}
          sessionId={activeSessionIdRef.current || getStoredSessionContext()?.sessionId}
          onComplete={handleCorsiComplete}
        />
      ) as React.ReactElement;

    case 'stroop-room':
      return requireParticipant(
        <StroopRoom
          navigate={navigate}
          participant={participant!}
          sessionId={activeSessionIdRef.current || getStoredSessionContext()?.sessionId}
          onComplete={handleStroopComplete}
        />
      ) as React.ReactElement;

    case 'task-switching-room':
      return requireParticipant(
        <TaskSwitchingRoom
          navigate={navigate}
          participant={participant!}
          sessionId={activeSessionIdRef.current || getStoredSessionContext()?.sessionId}
          onComplete={handleTaskSwitchingComplete}
        />
      ) as React.ReactElement;

    case 'task-completion':
      return requireParticipant(
        <TaskCompletionPage navigate={navigate} participant={participant!} />
      ) as React.ReactElement;

    // ─── Admin ──────────────────────────────────────────────────────────────
    case 'admin-login':
      return (
        <AdminLogin
          navigate={navigate}
          onLogin={() => setIsAdminAuth(true)}
        />
      );

    case 'admin-dashboard':
      return requireAdmin(
        <AdminDashboard {...adminProps} />
      ) as React.ReactElement;

    case 'admin-participants':
      return requireAdmin(
        <ParticipantManagement {...adminProps} />
      ) as React.ReactElement;

    case 'admin-experiments':
      return requireAdmin(
        <ExperimentConfig {...adminProps} />
      ) as React.ReactElement;

    case 'admin-hanoi-analysis':
      return requireAdmin(
        <HanoiAnalysis {...adminProps} />
      ) as React.ReactElement;

    case 'admin-corsi-analysis':
      return requireAdmin(
        <CorsiAnalysis {...adminProps} />
      ) as React.ReactElement;

    case 'admin-stroop-analysis':
      return requireAdmin(
        <StroopAnalysis {...adminProps} />
      ) as React.ReactElement;

    case 'admin-task-switching-analysis':
      return requireAdmin(
        <TaskSwitchingAnalysis {...adminProps} />
      ) as React.ReactElement;

    case 'admin-graphs':
      return requireAdmin(
        <GraphsInsights {...adminProps} />
      ) as React.ReactElement;

    case 'admin-exports':
      return requireAdmin(
        <DataExport {...adminProps} />
      ) as React.ReactElement;

    case 'admin-settings':
      return requireAdmin(
        <Settings {...adminProps} />
      ) as React.ReactElement;

    default:
      return <LandingPage navigate={navigate} />;
  }
}
