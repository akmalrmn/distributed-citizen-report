import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { SubmitReport } from './pages/SubmitReport';
import { ReportList } from './pages/ReportList';
import { ReportDetail } from './pages/ReportDetail';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Notifications } from './pages/Notifications';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { useEffect, useState } from 'react';
import { getme, logout, User } from './api/account';
import { UserContext } from './context/UserContext';
import { getNotifications } from './api/notifications';

function AppContent({ user, handleClick, notificationCount }: { user: User | null, handleClick: () => void, notificationCount: number }) {
  const location = useLocation();

  // useEffect(() => {
  //   console.log("Current path is:", location.pathname);
  // }, [location]);

  return (
    <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-blue-600 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center py-4">
              <Link to="/" className="text-xl font-bold">
                Citizen Report
              </Link>
              <div className="flex gap-4 items-center">
                {(location.pathname !== '/login' && location.pathname !== '/register')  && <Link to="/" className="hover:text-blue-200">
                  Reports
                </Link>}
                {(location.pathname !== '/login' && location.pathname !== '/register') && <Link to="/submit" className="hover:text-blue-200">
                  Submit Report
                </Link>}
                {user?.role?.startsWith('Department') && (
                  <Link to="/dashboard" className="hover:text-blue-200">
                    Dashboard
                  </Link>
                )}
                {user?.role === 'Admin' && (
                  <Link to="/admin" className="hover:text-blue-200">
                    Admin
                  </Link>
                )}
                {user && (
                  <Link to="/notifications" className="hover:text-blue-200">
                    Notifications
                    {notificationCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {notificationCount}
                      </span>
                    )}
                  </Link>
                )}
                {(location.pathname === '/login') && <Link to="/register" className="hover:text-blue-200">
                  Register
                </Link>}
                {(location.pathname === '/register') && <Link to="/login" className="hover:text-blue-200">
                  Login
                </Link>}
                {user && <button onClick={handleClick} className="hover:text-blue-200">Logout</button>}
                {user && <b className='ml-6'>Welcome, {user.username}</b>}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto py-8 px-4">
          <Routes>
            <Route path="/" element={user ? <ReportList /> : <Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/submit" element={user ? <SubmitReport /> : <Navigate to="/login" />} />
            <Route path="/report/:id" element={user ? <ReportDetail /> : <Navigate to="/login" />} />
            <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/login" />} />
            <Route
              path="/dashboard"
              element={
                user?.role?.startsWith('Department') ? <AuthorityDashboard /> : <Navigate to="/" />
              }
            />
            <Route
              path="/admin"
              element={user?.role === 'Admin' ? <AdminDashboard /> : <Navigate to="/" />}
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-gray-300 py-4 mt-8">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p>IF4031 - Distributed Application Architecture</p>
            <p className="text-sm">Citizen Reporting System PoC</p>
          </div>
        </footer>
      </div>
  );
}


function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  const handleClick = async () => {
    try {
      const res = await logout();

      if (res.ok) {
        setUser(null);
        window.location.href = '/login';
      }
    } catch (error) {
        console.error("Failed to log out:", error);
        setUser(null);
    }
  }

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await getme();

        if (res.ok) {
          const data = await res.json();
          setUser({ userId: data.userId, role: data.role, username: data.username });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch session info:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe()
  }, []);

  useEffect(() => {
    if (!user) {
      setNotificationCount(0);
      return;
    }

    let isMounted = true;

    const fetchCount = async () => {
      try {
        const result = await getNotifications({ status: 'unread', limit: 5 });
        if (isMounted) {
          setNotificationCount(result.unreadCount);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <UserContext.Provider value={{user, setUser}}>
      <BrowserRouter>
        <AppContent user={user} handleClick={handleClick} notificationCount={notificationCount} />
      </BrowserRouter>
    </UserContext.Provider>
  );
}

export default App;
