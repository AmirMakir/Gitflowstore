import { useState, useEffect } from 'react';
import { WorktreeList } from './components/WorktreeList';
import { CreateDialog } from './components/CreateDialog';
import { CleanupView } from './components/CleanupView';
import { useVSCodeApi } from './hooks/useVSCodeApi';
import { useWorktrees } from './hooks/useWorktrees';

type View = 'dashboard' | 'create' | 'cleanup';

export default function App() {
  const vscode = useVSCodeApi();
  const { worktrees, loading, error, refresh } = useWorktrees(vscode);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'showView') {
        setCurrentView(message.view);
      }
      if (message.type === 'createResult' && message.success) {
        setCurrentView('dashboard');
        refresh();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [refresh]);

  if (currentView === 'create') {
    return (
      <CreateDialog
        vscode={vscode}
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  if (currentView === 'cleanup') {
    return (
      <CleanupView
        vscode={vscode}
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  return (
    <WorktreeList
      worktrees={worktrees}
      loading={loading}
      error={error}
      vscode={vscode}
      onRefresh={refresh}
      onCreateClick={() => setCurrentView('create')}
      onCleanupClick={() => setCurrentView('cleanup')}
    />
  );
}
