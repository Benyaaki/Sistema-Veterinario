import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Calendar, LogOut, Settings as SettingsIcon, Cat, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';

const MainLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/agenda', label: 'Agenda', icon: Calendar },
        { to: '/tutores', label: 'Tutores', icon: Users },
        { to: '/pacientes', label: 'Pacientes', icon: Cat },
        { to: '/ajustes', label: 'Ajustes', icon: SettingsIcon },
    ];

    return (
        <div className="flex h-screen bg-brand-bg font-sans overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-brand-surface z-20 shadow-sm border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <img src="/img/logo.png" alt="PattyVet" className="h-8 w-auto object-contain" />
                    <span className="font-bold text-gray-800">PattyVet</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-brand-surface shadow-md flex flex-col border-r border-brand-accent/20
                transform transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0
            `}>
                <div className="p-6 border-b border-brand-accent/20 flex items-center justify-center md:flex hidden">
                    <img src="/img/logo.png" alt="PattyVet" className="h-32 w-auto object-contain" />
                </div>

                {/* Mobile specific logo area in sidebar if needed, or just spacers */}
                <div className="md:hidden p-4 flex justify-end">
                    {/* Close button inside sidebar specifically for mobile if header isn't enough, but header button handles toggle. 
                         Let's keep it clean. */}
                </div>

                <nav className="flex-1 p-4 space-y-1 mt-12 md:mt-0">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                                    isActive
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                                )
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-brand-accent/20">
                    <div className="px-4 py-2 mb-2">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-secondary hover:bg-secondary/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 w-full">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
