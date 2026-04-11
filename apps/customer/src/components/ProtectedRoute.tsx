import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { getMe } from '../lib/queries';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { me, setMe } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('customerAccessToken') : null;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (token && !me) {
      getMe()
        .then((m) => {
          setMe(m);
          setReady(true);
        })
        .catch(() => {
          localStorage.removeItem('customerAccessToken');
          setReady(true);
        });
    } else {
      setReady(true);
    }
  }, [token, me, setMe]);

  if (!ready) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
