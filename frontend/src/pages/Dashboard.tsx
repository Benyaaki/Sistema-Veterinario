import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    ShoppingCart, Package, Calendar, TrendingUp,
    DollarSign, Clock, CheckCircle, ArrowRight
} from 'lucide-react';

const Dashboard = () => {
    const { user, hasPermission, hasAnyRole } = useAuth();
    const { currentBranch } = useBranch();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>({ global: {}, branches: [] });
    const [loading, setLoading] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState<{ title: string, key: string } | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            // Calculate Start/End of TODAY in LOCAL time, sent as ISO
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

            const res = await api.get(`/reports/dashboard?start_date=${startOfDay}&end_date=${endOfDay}`);
            setStats(res.data);
        } catch (error) {
            console.error(error);
            // setStats(null); // Keep default or show error state 
        } finally {
            setLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    };

    const openModal = (title: string, key: string) => {
        // Only open if there are branches to show
        if (stats?.branches?.length > 0) {
            setSelectedMetric({ title, key });
        }
    };

    const quickActions = [
        {
            title: 'Nueva Venta',
            description: 'Registrar una venta',
            icon: ShoppingCart,
            to: '/ventas/nueva',
            color: 'bg-emerald-400',
            visible: hasPermission('ventas')
        },
        {
            title: 'Ver Agenda',
            description: 'Consultar citas programadas',
            icon: Calendar,
            to: '/agenda',
            color: 'bg-secondary',
            visible: hasPermission('agenda')
        },
        {
            title: 'Inventario',
            description: 'Gestionar productos y stock',
            icon: Package,
            to: '/inventario',
            color: 'bg-sky-400',
            visible: hasPermission('inventory')
        },
        {
            title: 'Reportes',
            description: 'Ver estadísticas y reportes',
            icon: TrendingUp,
            to: '/reportes',
            color: 'bg-orange-400',
            visible: hasPermission('reports')
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                    {getGreeting()}, {user?.name}!
                </h1>
                <p className="text-gray-600">
                    {currentBranch ? `Sucursal: ${currentBranch.name}` : 'Bienvenido al sistema de gestión'}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Ventas Hoy"
                    value={`$${stats?.global?.sales?.toLocaleString() || 0}`}
                    icon={<DollarSign size={24} />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                    loading={loading}
                    onClick={hasAnyRole(['admin', 'superadmin']) ? () => openModal('Ventas por Sucursal', 'sales') : undefined}
                />
                <StatCard
                    title="Transacciones"
                    value={stats?.global?.transactions || 0}
                    icon={<ShoppingCart size={24} />}
                    color="bg-gradient-to-br from-sky-400 to-blue-500"
                    loading={loading}
                    onClick={hasAnyRole(['admin', 'superadmin']) ? () => openModal('Transacciones por Sucursal', 'transactions') : undefined}
                />
                <StatCard
                    title="Citas Pendientes"
                    value={stats?.global?.appointments || 0}
                    icon={<Calendar size={24} />}
                    color="bg-gradient-to-br from-violet-400 to-purple-500"
                    loading={loading}
                    onClick={() => openModal('Citas Pendientes', 'appointments')}
                />
                <StatCard
                    title="Hora Actual"
                    value={new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    icon={<Clock size={24} />}
                    color="bg-gradient-to-br from-orange-400 to-rose-500"
                    loading={false}
                />
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map(action => {
                        if (!action.visible) return null;
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.to}
                                to={action.to}
                                className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <Icon size={24} className="text-white" />
                                </div>
                                <h3 className="font-semibold text-gray-800 mb-1">{action.title}</h3>
                                <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                                <div className="flex items-center text-purple-600 text-sm font-medium group-hover:gap-2 transition-all">
                                    <span>Ir ahora</span>
                                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Recent Activity / Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tips Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CheckCircle size={20} className="text-emerald-400" />
                        Consejos del Día
                    </h3>
                    <div className="space-y-3">
                        <TipItem text="Revisa el inventario regularmente para evitar quiebres de inventario" />
                        <TipItem text="Confirma las citas del día para reducir ausencias" />
                        <TipItem text="Mantén actualizada la información de tus clientes" />
                    </div>
                </div>

                {/* System Info */}
                <div className="bg-gradient-to-br from-purple-400 to-indigo-400 rounded-xl shadow-lg p-6 text-white">
                    <h3 className="text-lg font-bold mb-4">Sistema CalFer</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="opacity-90">Versión:</span>
                            <span className="font-semibold">2.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="opacity-90">Usuario:</span>
                            <span className="font-semibold capitalize">
                                {{
                                    'admin': 'Administrador/a',
                                    'superadmin': 'Super Administrador/a',
                                    'vet': 'Veterinario/a',
                                    'veterinarian': 'Veterinario/a',
                                    'sales': 'Vendedor/a',
                                    'seller': 'Vendedor/a',
                                    'vendedor': 'Vendedor/a',
                                    'grooming': 'Peluquero/a',
                                    'groomer': 'Peluquero/a'
                                }[user?.role?.toLowerCase() as string] || user?.role}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="opacity-90">Última actualización:</span>
                            <span className="font-semibold">Febrero 2026</span>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/20">
                        <p className="text-xs opacity-75">
                            Sistema integral de gestión veterinaria y punto de venta
                        </p>
                    </div>
                </div>
            </div>

            {/* Breakdown Modal */}
            {selectedMetric && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
                    onClick={() => setSelectedMetric(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">{selectedMetric.title}</h3>
                            <button
                                onClick={() => setSelectedMetric(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            {stats.branches.filter((b: any) => b.name !== 'Desconocido').map((b: any) => {
                                const value = b[selectedMetric.key];
                                return (
                                    <div
                                        key={b.branch_id}
                                        onClick={() => {
                                            if (selectedMetric.key === 'appointments') {
                                                navigate(`/agenda?branchId=${b.branch_id}`);
                                            }
                                        }}
                                        className={`flex justify-between items-center p-4 bg-gray-50 rounded-lg transition-all
                                            ${selectedMetric.key === 'appointments' ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-200 border border-transparent' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                {b.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-700">{b.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-gray-900">
                                                {selectedMetric.key === 'sales' ? `$${value.toLocaleString()}` : value}
                                            </span>
                                            {selectedMetric.key === 'appointments' && (
                                                <ArrowRight size={16} className="text-blue-400" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, icon, color, loading, onClick }: any) => (
    <div
        onClick={onClick}
        className={`${color} rounded-xl shadow-lg p-6 text-white transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-xl active:scale-95' : 'cursor-default'}`}
    >
        <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                {icon}
            </div>
            {onClick && <span className="text-xs bg-white/20 px-2 py-1 rounded backdrop-blur-sm">Ver detalle</span>}
        </div>
        <div>
            <p className="text-sm opacity-90 mb-1">{title}</p>
            {loading ? (
                <div className="h-8 bg-white/20 rounded animate-pulse" />
            ) : (
                <p className="text-3xl font-bold">{value}</p>
            )}
        </div>
    </div>
);

const TipItem = ({ text }: { text: string }) => (
    <div className="flex items-start gap-2">
        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
        <p className="text-sm text-gray-600">{text}</p>
    </div>
);

export default Dashboard;
