import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const GitHubCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { githubLogin } = useAuth();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      githubLogin(code)
        .then(() => {
          navigate('/dashboard');
        })
        .catch(() => {
          navigate('/login');
        });
    } else {
      navigate('/login');
    }
  }, [searchParams, githubLogin, navigate]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-on-surface">
      <div className="mb-8">
        <span className="font-geist text-[28px] font-bold text-primary tracking-tight">CollabCode</span>
      </div>
      <div className="flex flex-col items-center gap-4">
        <span className="material-symbols-outlined animate-spin text-[48px] text-primary">sync</span>
        <p className="font-mono text-[14px] uppercase tracking-widest">Authorizing with GitHub...</p>
      </div>
    </div>
  );
};

export default GitHubCallback;
