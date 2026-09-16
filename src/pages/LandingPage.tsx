// Landing page — public, with sign-in CTA
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { IconGoogle, IconFilm, IconFileText, IconSparkles, IconCamera } from '@/components/common/Icons';
import { useEffect } from 'react';
import './LandingPage.css';

export function LandingPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="landing">
      {/* Hero Section */}
      <div className="landing-hero">
        {/* Ambient background elements */}
        <div className="landing-glow landing-glow-1" />
        <div className="landing-glow landing-glow-2" />
        <div className="landing-grid" />

        <div className="landing-hero-content">
          <div className="landing-badge">
            <IconFilm size={14} />
            <span>Professional Screenwriting Tool</span>
          </div>

          <h1 className="landing-title">
            Write Your Next
            <br />
            <span className="landing-title-accent">Masterpiece</span>
          </h1>

          <p className="landing-subtitle">
            A professional screenwriting and production planning tool built for filmmakers.
            Industry-standard formatting, AI-powered writing assistance, and production breakdowns — all in one place.
          </p>

          <div className="landing-cta">
            <Button
              variant="primary"
              size="lg"
              icon={<IconGoogle size={20} />}
              onClick={signInWithGoogle}
              loading={loading}
            >
              Sign in with Google
            </Button>
            <p className="landing-cta-note">Free to use · No credit card required</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="landing-features">
        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <IconFileText size={24} />
            </div>
            <h3 className="landing-feature-title">Industry-Standard Editor</h3>
            <p className="landing-feature-desc">
              Courier 12pt formatting with automatic element transitions.
              Scene headings, action, dialogue — all properly indented and styled.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <IconSparkles size={24} />
            </div>
            <h3 className="landing-feature-title">AI Writing Assistant</h3>
            <p className="landing-feature-desc">
              Use your own API keys for Gemini, OpenAI, or Claude.
              Generate scenes, rewrite dialogue, and get creative suggestions.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <IconCamera size={24} />
            </div>
            <h3 className="landing-feature-title">Production Planning</h3>
            <p className="landing-feature-desc">
              Scene breakdowns, shot lists, storyboards, and revision tracking.
              Everything a production team needs in pre-production.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Screenplay Studio. Built for filmmakers.</p>
      </footer>
    </div>
  );
}
