import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavView } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { VoiceModal } from './components/views/VoiceModal';
import { ChatView } from './components/views/ChatView';
import { AssistantDashboardView } from './components/views/AssistantDashboardView';
import { MemoryView } from './components/views/MemoryView';
import { RAGView } from './components/views/RAGView';
import { VisionView } from './components/views/VisionView';
import { ForecastingView } from './components/views/ForecastingView';
import { ToolsView } from './components/views/ToolsView';
import { ResearchView } from './components/views/ResearchView';
import { ArtifactsView } from './components/views/ArtifactsView';
import { AdminView } from './components/views/AdminView';
import { OmniBrainView } from './components/views/OmniBrainView';
import { TourModal } from './components/TourModal';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<NavView>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState('gemini');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(() => !localStorage.getItem('prachi_auth_token'));
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      setIsAuthOpen(false);
    }
  }, [user]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatView currentModel={currentModel} onNavigateToView={setCurrentView} />;
      case 'omnibrain':
        return <OmniBrainView />;
      case 'dashboard':
        return <AssistantDashboardView onNavigate={setCurrentView} />;
      case 'memory':
        return <MemoryView />;
      case 'rag':
        return <RAGView />;
      case 'vision':
        return <VisionView />;
      case 'forecasting':
        return <ForecastingView />;
      case 'tools':
        return <ToolsView />;
      case 'research':
        return <ResearchView />;
      case 'artifacts':
        return <ArtifactsView />;
      case 'admin':
        return <AdminView />;
      default:
        return <ChatView currentModel={currentModel} onNavigateToView={setCurrentView} />;
    }
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Workspace Column */}
      <div className="main-content">
        <Navbar
          currentModel={currentModel}
          onModelChange={setCurrentModel}
          onOpenVoice={() => setIsVoiceOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenTour={() => setIsTourOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)}
        />

        <main className="view-scroll-area">
          {renderActiveView()}
        </main>
      </div>

      {/* Voice Assistant Overlay */}
      {isVoiceOpen && (
        <VoiceModal
          isOpen={isVoiceOpen}
          onClose={() => setIsVoiceOpen(false)}
          currentModel={currentModel}
        />
      )}

      {/* Sign In / Sign Up Modal */}
      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />
      )}

      {/* Feature Guide Tour Modal */}
      {isTourOpen && (
        <TourModal
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          onNavigateToView={setCurrentView}
        />
      )}

      {/* Floating Voice Assistant Trigger Orb */}
      <button
        onClick={() => setIsVoiceOpen(true)}
        className="floating-voice-orb"
        title="Activate Prachi Voice Assistant"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.45), 0 0 15px rgba(236, 72, 153, 0.35)',
          border: '2px solid rgba(255, 255, 255, 0.25)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 99,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          animation: 'floatSoft 3s ease-in-out infinite'
        }}
      >
        <Mic size={24} />
      </button>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
