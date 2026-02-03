import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import {
    LayoutDashboard, ShoppingCart, FileText, Package, Truck,
    Calendar, Users, Cat, Settings as SettingsIcon,
    LogOut, ChevronDown, ChevronRight, Activity, BarChart3
} from 'lucide-react';
import { useState } from 'react';
import BranchSelector from '../components/BranchSelector';

const MainLayout = () => {
    const { user, logout, hasPermission } = useAuth();
    const location = useLocation();
    const [expandedSections, setExpandedSections] = useState<string[]>(['ventas', 'material', 'personas', 'veterinaria', 'administracion']);

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
                { to: '/ventas/mis-ventas', label: 'Mis Ventas', icon: FileText, visible: hasPermission('ventas') }
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
            visible: hasPermission('employees') || hasPermission('reports') || hasPermission('activity'),
            items: [
                { to: '/empleados', label: 'Empleados', icon: Users, visible: hasPermission('employees') },
                { to: '/reportes', label: 'Reportes', icon: BarChart3, visible: hasPermission('reports') },
                { to: '/historial-actividades', label: 'Historial Actividades', icon: Activity, visible: hasPermission('activity') }
            ]
        }
    ];

    return (
        <div className="flex h-screen bg-brand-bg">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
                {/* Logo */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-center">
                    <img src="/img/logo.png" alt="CalFer" className="h-16 w-auto object-contain" />
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
                            <div className="text-xs text-gray-500 capitalize">
                                {user?.role === 'seller' ? 'Vendedor' :
                                    user?.role === 'admin' ? 'Administrador' :
                                        user?.role === 'superadmin' ? 'Super Administrador' :
                                            user?.role === 'veterinarian' ? 'Veterinario' :
                                                user?.role}
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
            <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
