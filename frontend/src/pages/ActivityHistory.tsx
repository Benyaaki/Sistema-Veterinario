import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Calendar, Filter, RefreshCw, User, Building2, Activity, ChevronDown } from 'lucide-react';

interface ActivityLog {
    _id: string;
    user_name: string;
    action_type: string;
    description: string;
    branch_name?: string;
    created_at: string;
    metadata?: any;
}

const ActivityHistory = () => {
    const { hasAnyRole } = useAuth();
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        action_type: '',
        branch_id: '',
        user_name: '', // We filter by name in backend or ID? Backend supports ID. Let's use ID if possible, or name loosely.
        // Looking at backend `activity_logs.py`: it supports `user_id` (OId) and `action_type`. 
        // Frontend `ActivityHistory` originally had basic filters.
        // Let's rely on `user_id` for precise filtering if we have the list, or name if backend supports search.
        // Backend `activity_logs.py` has `user_id`.
        user_id: '',
        start_date: '',
        end_date: ''
    });
    const [branches, setBranches] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    // Pagination
    const LIMIT = 20;
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Check if user is admin
    if (!hasAnyRole(['admin', 'superadmin'])) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600">Solo los administradores pueden ver el historial de actividades.</p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        loadInitialData();
        loadBranches();
        loadUsers();
    }, []);

    const loadBranches = async () => {
        try {
            const res = await api.get('/branches');
            setBranches(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error(error);
        }
    }

    const loadInitialData = () => {
        setSkip(0);
        setActivities([]);
        setHasMore(true);
        loadActivities(0, true);
    };

    const loadActivities = async (offset: number, reset: boolean = false) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.action_type) params.append('action_type', filters.action_type);
            if (filters.branch_id) params.append('branch_id', filters.branch_id);
            if (filters.user_id) params.append('user_id', filters.user_id);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);

            params.append('limit', LIMIT.toString());
            params.append('skip', offset.toString());

            const res = await api.get(`/activity-logs?${params.toString()}`);
            const newActivities = res.data;

            if (newActivities.length < LIMIT) {
                setHasMore(false);
            }

            if (reset) {
                setActivities(newActivities);
            } else {
                setActivities(prev => [...prev, ...newActivities]);
            }
        } catch (error) {
            console.error(error);
            // alert('Error al cargar el historial de actividades');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const newSkip = skip + LIMIT;
        setSkip(newSkip);
        loadActivities(newSkip, false);
    };

    const handleFilterChange = (field: string, value: string) => {
        setFilters({ ...filters, [field]: value });
    };

    const applyFilters = () => {
        loadInitialData();
    };

    const clearFilters = () => {
        setFilters({
            action_type: '',
            branch_id: '',
            user_id: '',
            start_date: '',
            end_date: ''
        });
        setTimeout(() => {
            setSkip(0); // Reset pagination manually for the effect closure
            loadActivities(0, true); // Force load with 0 
        }, 100);
    };

    const getActionColor = (actionType: string) => {
        switch (actionType) {
            case 'SALE': return 'bg-green-100 text-green-700';
            case 'INVENTORY_MOVE': return 'bg-blue-100 text-blue-700';
            case 'APPOINTMENT': return 'bg-purple-100 text-purple-700';
            case 'PATIENT_ADD': return 'bg-pink-100 text-pink-700';
            case 'CLIENT_ADD': return 'bg-indigo-100 text-indigo-700';
            case 'PRODUCT_ADD': return 'bg-orange-100 text-orange-700';
            case 'SUPPLIER_ADD': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getActionLabel = (actionType: string) => {
        const labels: Record<string, string> = {
            'SALE': 'Venta',
            'INVENTORY_MOVE': 'Inventario',
            'APPOINTMENT': 'Cita',
            'PATIENT_ADD': 'Paciente Nuevo',
            'CLIENT_ADD': 'Cliente Nuevo',
            'PRODUCT_ADD': 'Producto Nuevo',
            'SUPPLIER_ADD': 'Proveedor Nuevo',
        };
        return labels[actionType] || actionType;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Activity size={28} className="text-blue-400" />
                Historial de Actividades
            </h1>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={20} className="text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Acción</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={filters.action_type}
                            onChange={e => handleFilterChange('action_type', e.target.value)}
                        >
                            <option value="">Todas</option>
                            <option value="SALE">Ventas</option>
                            <option value="INVENTORY_MOVE">Movimientos Inventario</option>
                            <option value="APPOINTMENT">Citas</option>
                            <option value="PATIENT_ADD">Pacientes</option>
                            <option value="CLIENT_ADD">Clientes</option>
                            <option value="PRODUCT_ADD">Productos</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={filters.branch_id}
                            onChange={e => handleFilterChange('branch_id', e.target.value)}
                        >
                            <option value="">Todas</option>
                            {branches.map(b => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={filters.user_id}
                            onChange={e => handleFilterChange('user_id', e.target.value)}
                        >
                            <option value="">Todos</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} {u.last_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={filters.start_date}
                            onChange={e => handleFilterChange('start_date', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={filters.end_date}
                            onChange={e => handleFilterChange('end_date', e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-2 mt-4 mt-r-auto">
                    <button
                        onClick={applyFilters}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Filter size={16} />
                        Aplicar
                    </button>
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Limpiar
                    </button>
                    <button
                        onClick={loadInitialData}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 ml-auto"
                    >
                        <RefreshCw size={16} className={loading && activities.length === 0 ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Activity Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} />
                                        Fecha/Hora
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <User size={16} />
                                        Usuario
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Acción</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Descripción</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={16} />
                                        Sucursal
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {activities.map(activity => (
                                <tr key={activity._id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-600">
                                        {new Date(activity.created_at).toLocaleString('es-CL', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {activity.user_name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action_type)}`}>
                                            {getActionLabel(activity.action_type)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {activity.description}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {activity.branch_name || '-'}
                                    </td>
                                </tr>
                            ))}

                            {activities.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">
                                        No se encontraron actividades
                                    </td>
                                </tr>
                            )}

                        </tbody>
                    </table>
                </div>

                {/* Load More Button */}
                {hasMore && (
                    <div className="p-4 flex justify-center border-t border-gray-200">
                        <button
                            onClick={handleLoadMore}
                            disabled={loading}
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                        >
                            {loading ? (
                                <RefreshCw size={16} className="animate-spin" />
                            ) : (
                                <ChevronDown size={16} />
                            )}
                            {loading ? 'Cargando...' : 'Ver más actividades'}
                        </button>
                    </div>
                )}

                {/* Pagination Info */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 text-center">
                    Mostrando {activities.length} registro(s)
                </div>
            </div>
        </div>
    );
};

export default ActivityHistory;
