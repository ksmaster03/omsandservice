import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../store/auth';
import api from '../lib/api';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (token && !user) {
      api
        .get('/auth/me')
        .then((res) => setUser(res.data.data.user))
        .catch(() => {
          localStorage.removeItem('accessToken');
        });
    }
  }, [token, user, setUser]);

  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
