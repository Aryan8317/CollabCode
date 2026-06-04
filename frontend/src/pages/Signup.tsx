import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InteractiveGrid from '../components/InteractiveGrid';
import EnergyBorder from '../components/EnergyBorder';
import { useAuth } from '../utils/AuthContext';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated, error } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  };

  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signup(name, email, password);
      if (result && result.email) {
        navigate('/verify-email', { state: { email: result.email } });
      }
    } catch (err) {
      // Error is handled by context and displayed below
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full h-screen flex flex-col md:flex-row overflow-hidden bg-background text-on-surface relative">
      <InteractiveGrid />
      
      {/* Branding & High-Tech Visual Side */}
      <section className="hidden md:flex md:w-7/12 relative flex-col items-center justify-center p-gutter z-10">
        <div className="z-10 text-center max-w-lg">
          <div className="mb-8 flex justify-center">
            <span className="font-geist text-[28px] font-bold text-primary tracking-tight">CollabCode</span>
          </div>
          
          <EnergyBorder>
            <div className="relative group">
              <img 
                alt="CollabCode Interface Preview" 
                className="grayscale group-hover:grayscale-0 transition-all duration-700 block w-full h-auto" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuYVzHh1T3dGmxLsEKi6qvsjTrs3q7Y9JPp2cFVMq_QUN4GL8MuTj0GPzn1wn0bzGIDVYyISeQWF67a8Iecb7tFJ6Q7ImobE5YfqpERelIooejqTEKT8hMtNSI7VBvXwK_-WSHMSj8tD6g-bj7xhPi9Gs1PKmC_dqQMHYWNfrQBG7PhpzdqNlIugDKE97NvMQR9sdVR4l_Bkj6CbOaqinahD5Ohp8Zz8gA4CziRtxm-Zf7dlHY8E7z0Z3Yce5uGktQfJjz2PZPXDo"
              />
              <div className="absolute -bottom-6 -right-6 glass-surface p-6 rounded-xl border border-outline-variant/50 presence-glow-blue max-w-[280px] z-20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
                  <span className="font-mono text-[12px] text-secondary uppercase tracking-widest">Global Network</span>
                </div>
                <p className="font-geist text-[13px] text-on-surface-variant leading-relaxed">
                  Connect with developers across the globe in a seamless, low-latency environment.
                </p>
              </div>
            </div>
          </EnergyBorder>

          <div className="mt-20 space-y-4">
            <h2 className="font-geist text-[20px] font-semibold text-on-surface">Build Together</h2>
            <p className="font-geist text-[14px] text-on-surface-variant">Experience the future of collaborative software engineering.</p>
          </div>
        </div>
      </section>

      {/* Form Side */}
      <section className="w-full md:w-5/12 bg-surface-container-low/50 backdrop-blur-md flex flex-col px-8 py-6 md:px-20 md:py-10 border-l border-outline-variant/20 overflow-y-auto z-10">
        <div className="flex-grow flex flex-col justify-start md:pt-8 py-4">
          <div className="md:hidden mb-8 text-center">
            <span className="font-geist text-[20px] font-bold text-primary tracking-tight">CollabCode</span>
          </div>
          <div className="max-w-md w-full mx-auto">
            <header className="mb-6 text-center md:text-left">
              <h1 className="font-geist text-[28px] font-semibold text-on-surface mb-1">Create Account</h1>
              <p className="font-geist text-[14px] text-on-surface-variant">Join the next generation of collaborative development.</p>
            </header>

            {error && (
              <div className="mb-6 p-3 rounded bg-error-container text-on-error-container text-[12px] font-mono border border-error/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error.toUpperCase()}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-all active:scale-[0.98]"
              >
                <img alt="Google Logo" className="w-5 h-5" src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" />
                <span className="font-mono text-[11px] font-bold text-on-surface tracking-wider uppercase">Google</span>
              </button>
              <button 
                type="button"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-all active:scale-[0.98]"
                onClick={handleGitHubLogin}
              >
                <img alt="GitHub Logo" className="w-5 h-5 invert dark:invert-0" src="https://cdn-icons-png.flaticon.com/512/25/25231.png" />
                <span className="font-mono text-[11px] font-bold text-on-surface tracking-wider uppercase">GitHub</span>
              </button>
            </div>

            <div className="relative flex items-center mb-6">
              <div className="flex-grow border-t border-outline-variant/30"></div>
              <span className="flex-shrink mx-4 font-mono text-[12px] text-outline uppercase tracking-widest">or email</span>
              <div className="flex-grow border-t border-outline-variant/30"></div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase" htmlFor="name">FULL_NAME</label>
                <div className="relative group">
                  <input className="w-full bg-transparent border border-outline-variant rounded-lg py-3 px-4 text-on-surface font-geist text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all placeholder:text-outline/50" id="name" placeholder="Aryan Gautam" required type="text" value={name} onChange={(e) => setName(e.target.value)} />
                  <span className="absolute right-4 top-3.5 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">person</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase" htmlFor="email">EMAIL_ADDRESS</label>
                <div className="relative group">
                  <input className="w-full bg-transparent border border-outline-variant rounded-lg py-3 px-4 text-on-surface font-geist text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all placeholder:text-outline/50" id="email" placeholder="dev@collabcode.io" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <span className="absolute right-4 top-3.5 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">alternate_email</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase" htmlFor="password">PASSWORD</label>
                <div className="relative group">
                  <input className="w-full bg-transparent border border-outline-variant rounded-lg py-3 px-4 text-on-surface font-geist text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all placeholder:text-outline/50" id="password" placeholder="••••••••" required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button className="absolute right-4 top-3.5 material-symbols-outlined text-outline hover:text-on-surface transition-colors" type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
              </div>
              <button className={`w-full bg-primary text-on-primary font-mono text-[11px] font-bold py-3.5 rounded-lg shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${isLoading ? 'opacity-80' : ''}`} type="submit" disabled={isLoading}>
                {isLoading ? <><span className="material-symbols-outlined animate-spin">sync</span> REGISTERING...</> : <>CREATE_ACCOUNT <span className="material-symbols-outlined text-[18px]">person_add</span></>}
              </button>
            </form>
            <div className="mt-6 text-center">
              <p className="font-geist text-[13px] text-on-surface-variant">
                Already have an account? <Link className="text-secondary font-bold hover:underline decoration-secondary/30 underline-offset-4" to="/login">AUTHORIZE_SESSION</Link>
              </p>
            </div>
          </div>
        </div>
        
        <div className="py-4 text-center md:text-left border-t border-outline-variant/10">
          <div className="flex flex-col md:flex-row justify-center md:justify-start gap-4 md:gap-8 font-mono text-[12px] text-outline opacity-50">
            <a className="hover:text-on-surface transition-colors" href="#">TERMS_OF_SERVICE</a>
            <a className="hover:text-on-surface transition-colors" href="#">PRIVACY_POLICY</a>
            <span className="hidden md:inline">© 2024 COLLABCODE_SYSTEMS</span>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Signup;
