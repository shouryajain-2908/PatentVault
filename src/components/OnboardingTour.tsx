import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Brain, LayoutDashboard, Network, MessageSquare, ArrowRight, ArrowLeft, Check } from 'lucide-react';

type TourStep = {
  title: string;
  description: string;
  icon: typeof Brain;
  highlightId?: string;
  action?: { label: string; path: string };
};

const steps: TourStep[] = [
  {
    title: 'Welcome to PatentScope AI',
    description: 'Your intelligent patent analytics platform. Let me show you around — this takes about 30 seconds.',
    icon: Brain,
  },
  {
    title: 'Patent Dashboard',
    description: 'View your full patent portfolio with stats, search, filtering, and sortable columns. Click any row to expand details.',
    icon: LayoutDashboard,
    highlightId: 'nav-dashboard',
    action: { label: 'Go to Dashboard', path: '/dashboard' },
  },
  {
    title: '3D Visualization',
    description: 'Explore patent relationships in an interactive 3D graph. Switch between Force, Timeline, and Radial layouts. Click any node for full details.',
    icon: Network,
    highlightId: 'nav-visualization',
    action: { label: 'Go to Visualization', path: '/visualization' },
  },
  {
    title: 'AI Assistant',
    description: 'Ask questions about your patents in natural language. The chatbot understands your portfolio context and can analyze trends, citations, and relationships.',
    icon: MessageSquare,
    highlightId: 'nav-chatbot',
    action: { label: 'Go to AI Assistant', path: '/chatbot' },
  },
  {
    title: "You're all set!",
    description: 'You can replay this tour anytime by clicking the help icon. Start exploring your patent portfolio now!',
    icon: Check,
  },
];

export default function OnboardingTour({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const step = steps[current];

  useEffect(() => {
    if (step.highlightId) {
      const el = document.getElementById(step.highlightId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('tour-highlight');
        return () => el.classList.remove('tour-highlight');
      }
    }
  }, [current, step.highlightId]);

  function next() {
    if (step.action) {
      navigate(step.action.path);
    }
    if (current < steps.length - 1) {
      setCurrent(current + 1);
    } else {
      onClose();
    }
  }

  function prev() {
    if (current > 0) setCurrent(current - 1);
  }

  function skip() {
    onClose();
  }

  const Icon = step.icon;
  const isLast = current === steps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={skip} />

      {/* Tour card */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[101] w-[90%] max-w-md">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${((current + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 flex items-center justify-center">
                <Icon className="w-6 h-6 text-sky-400" />
              </div>
              <button onClick={skip} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-white text-lg font-bold mb-2">{step.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">{step.description}</p>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current ? 'w-6 bg-sky-500' : i < current ? 'w-1.5 bg-sky-700' : 'w-1.5 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={prev}
                disabled={current === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <span className="text-xs text-slate-500">{current + 1} / {steps.length}</span>
              <button
                onClick={next}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-sky-500/30 transition-all"
              >
                {isLast ? 'Get Started' : step.action ? step.action.label : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
