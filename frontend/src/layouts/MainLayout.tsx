import { Outlet, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, ShoppingCart, FileText, Package, Truck,
    Calendar, Users, Cat, Settings as SettingsIcon,
    LogOut, ChevronDown, ChevronRight, Activity, BarChart3, Building2, Shield, DollarSign
} from 'lucide-react';
import { useState, useEffect } from 'react';
import BranchSelector from '../components/BranchSelector';

const MainLayout = () => {
    const { user, logout, hasPermission, hasAnyRole } = useAuth();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [expandedSections, setExpandedSections] = useState<string[]>(['ventas', 'material', 'personas', 'veterinaria', 'administracion']);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (user) {
                // Standard way to trigger "Are you sure you want to leave?"
                e.preventDefault();
                e.returnValue = 'Recuerda cerrar tu sesión antes de salir para mantener la seguridad del sistema.';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user]);
    const [showUnlockNoticeModal, setShowUnlockNoticeModal] = useState(false);

    useEffect(() => {
        if (searchParams.get('unlockNotice') === 'true') {
            setShowUnlockNoticeModal(true);
            // Remove the param from URL without refreshing
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('unlockNotice');
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    // Navigation structure with sections
    const navSections = [
        {
            id: 'ventas',
            title: 'Ventas',
            icon: ShoppingCart,
            visible: hasPermission('ventas'), // General Sales Access
            items: [
                { to: '/ventas/nueva', label: 'Nueva Venta', icon: ShoppingCart, visible: hasPermission('ventas') },
                { to: '/ventas/mis-ventas', label: 'Mis Ventas', icon: FileText, visible: hasPermission('ventas') },
                { to: '/ventas/caja', label: 'Caja', icon: Building2, visible: hasPermission('ventas') }
            ]
        },
        {
            id: 'material',
            title: 'Material',
            icon: Package,
            visible: hasPermission('inventory') || hasPermission('stock') || hasPermission('reception') || hasPermission('dispatch'),
            items: [
                { to: '/inventario', label: 'Inventario', icon: Package, visible: hasPermission('inventory') },
                { to: '/stock', label: 'Stock Sucursales', icon: Package, visible: hasPermission('stock') },
                { to: '/recepcion', label: 'Recepción', icon: Truck, visible: hasPermission('reception') },
                { to: '/despachos', label: 'Despachos', icon: Truck, visible: hasPermission('dispatch') }
            ]
        },
        {
            id: 'personas',
            title: 'Personas',
            icon: Users,
            visible: hasPermission('clients') || hasPermission('suppliers'),
            items: [
                { to: '/clientes', label: 'Clientes', icon: Users, visible: hasPermission('clients') },
                { to: '/proveedores', label: 'Proveedores', icon: Users, visible: hasPermission('suppliers') }
            ]
        },
        {
            id: 'veterinaria',
            title: 'Veterinaria',
            icon: Cat,
            visible: hasPermission('agenda') || hasPermission('tutors') || hasPermission('patients'),
            items: [
                { to: '/agenda', label: 'Agenda', icon: Calendar, visible: hasPermission('agenda') },
                { to: '/tutores', label: 'Tutores', icon: Users, visible: hasPermission('tutors') },
                { to: '/pacientes', label: 'Pacientes', icon: Cat, visible: hasPermission('patients') }
            ]
        },
        {
            id: 'administracion',
            title: 'Administración',
            icon: SettingsIcon,
            visible: hasAnyRole(['admin', 'superadmin']),
            items: [
                { to: '/empleados', label: 'Empleados', icon: Users, visible: hasPermission('employees') },
                { to: '/comisiones', label: 'Comisiones', icon: DollarSign, visible: hasPermission('employees') },
                { to: '/sucursales', label: 'Sucursales', icon: Building2, visible: hasPermission('employees') },
                { to: '/reportes', label: 'Reportes', icon: BarChart3, visible: hasPermission('reports') },
                { to: '/historial-actividades', label: 'Historial Actividades', icon: Activity, visible: hasPermission('activity') },
                { to: '/seguridad', label: 'Seguridad', icon: Shield, visible: hasAnyRole(['admin', 'superadmin']) }
            ]
        }
    ];

    return (
        <div className="flex h-screen bg-brand-bg">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
                {/* Logo */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-center">
                    <img
                        src="/img/logo.png"
                        alt="CalFer"
                        className="h-20 w-auto object-contain"
                    />
                </div>

                {/* Branch Selector */}
                <div className="py-4 border-b border-gray-200">
                    <BranchSelector />
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4">
                    {/* Dashboard */}
                    <Link
                        to="/dashboard"
                        className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${location.pathname === '/dashboard'
                            ? 'bg-brand-surface text-primary font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </Link>

                    <div className="h-px bg-gray-200 my-3 mx-4" />

                    {/* Sections */}
                    {navSections.map(section => {
                        if (!section.visible) return null;
                        const isExpanded = expandedSections.includes(section.id);
                        const SectionIcon = section.icon;

                        return (
                            <div key={section.id} className="mb-2">
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full flex items-center justify-between px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <SectionIcon size={18} />
                                        <span className="font-semibold text-sm">{section.title}</span>
                                    </div>
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>

                                {isExpanded && (
                                    <div className="ml-4 mt-1 space-y-1">
                                        {section.items.map(item => {
                                            if ((item as any).visible === false) return null;
                                            const ItemIcon = item.icon;
                                            const isActive = location.pathname === item.to;

                                            return (
                                                <Link
                                                    key={item.to}
                                                    to={item.to}
                                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${isActive
                                                        ? 'bg-brand-surface text-primary font-medium'
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <ItemIcon size={18} />
                                                    <span className="text-sm">{item.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-brand-surface rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold">
                                {user?.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
                            <div className="text-xs text-gray-500">
                                {{
                                    'admin': 'Administrador/a',
                                    'superadmin': 'Super Administrador/a',
                                    'veterinarian': 'Veterinario/a',
                                    'vet': 'Veterinario/a',
                                    'seller': 'Vendedor/a',
                                    'sales': 'Vendedor/a',
                                    'vendedor': 'Vendedor/a',
                                    'groomer': 'Peluquero/a',
                                    'grooming': 'Peluquero/a'
                                }[user?.role?.toLowerCase() as string] || user?.role}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                        <LogOut size={16} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto flex flex-col bg-gray-50/50">
                <div className="flex-1 p-6">
                    <Outlet />
                </div>

                {/* Footer */}
                <footer className="p-6 pt-0 text-center text-xs text-gray-400">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-4 border-t border-gray-200/50 pt-4">
                        <span>© {new Date().getFullYear()} CalFer. Todos los derechos reservados.</span>
                        <span className="hidden md:inline text-gray-200">|</span>
                        <span>
                            Plataforma creada por{' '}
                            <a
                                href="#"
                                onClick={(e) => e.preventDefault()}
                                className="font-medium text-primary hover:underline transition-all"
                            >
                                B.O
                            </a>
                        </span>
                    </div>
                </footer>
            </main>

            {/* Unlock Notice Modal */}
            {showUnlockNoticeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-amber-50">
                            <Shield className="w-10 h-10" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-gray-900">Aviso de Seguridad</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Tu cuenta ha sido desbloqueada. Por favor, cuide sus métodos de seguridad y procure utilizar una contraseña que no sea difícil de recordar para evitar futuros bloqueos.
                            </p>
                        </div>

                        <button
                            onClick={() => setShowUnlockNoticeModal(false)}
                            className="w-full py-3.5 bg-primary hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                        >
                            Entendido, gracias
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainLayout;
