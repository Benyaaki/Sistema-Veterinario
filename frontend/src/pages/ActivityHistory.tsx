import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Calendar, Filter, RefreshCw, User, Building2, Activity, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface ActivityLog {
    _id: string;
    user_name: string;
    action_type: string;
    description: string;
    branch_name?: string;
    branch_id?: string;
    created_at: string;
    metadata?: any;
    reference_id?: string;
}

const ActivityHistory = () => {
    const { hasAnyRole } = useAuth();
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        action_type: '',
        branch_id: '',
        user_id: '',
    });
    const [currentDate, setCurrentDate] = useState(new Date());
    const [branches, setBranches] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    // Pagination
    const LIMIT = 20;
    const [selectedSale, setSelectedSale] = useState<any | null>(null);

    // ... existing pagination state ...

    // Helper to resolve branch name (fixes historical 'Sucursal' logs)
    const getBranchName = (activity: ActivityLog) => {
        if (activity.branch_name && activity.branch_name !== 'Sucursal') {
            return activity.branch_name;
        }
        // Fallback to lookup
        if (activity.branch_id) {
            const branch = branches.find(b => b._id === activity.branch_id);
            if (branch) return branch.name;
        }
        // Last resort
        return activity.branch_name || '-';
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        const hasTimezone = dateString.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(dateString);
        const isoString = hasTimezone ? dateString : `${dateString}Z`;
        return new Date(isoString).toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleActionClick = async (activity: ActivityLog) => {
        if (activity.action_type !== 'SALE' || !activity.reference_id) return;

        try {
            // First try metadata if complete (legacy optimization)
            if (activity.metadata?.items && activity.metadata?.payment_method) {
                // If metadata is rich (future proof), use it. 
                // Currently only minimal metadata is saved.
            }

            // Fetch full sale details
            const res = await api.get(`/sales/${activity.reference_id}`);
            setSelectedSale(res.data);
        } catch (error) {
            console.error("Error fetching sale details:", error);
            alert("No se pudo cargar el detalle de la venta.");
        }
    };
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
        loadBranches();
        loadUsers();
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [currentDate]);

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

            // Date logic
            const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0).toISOString();
            const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59).toISOString();

            params.append('start_date', startOfDay);
            params.append('end_date', endOfDay);

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
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const newSkip = skip + LIMIT;
        setSkip(newSkip);
        loadActivities(newSkip, false);
    };

    const handleShowLess = () => {
        setSkip(0);
        setActivities(prev => prev.slice(0, LIMIT));
        setHasMore(true);
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
        });
        setCurrentDate(new Date());
        setTimeout(() => loadInitialData(), 0);
    };

    const handlePrevDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    const getActionColor = (actionType: string) => {
        const type = actionType.replace(/ /g, '_');
        // High priority colors
        if (type.includes('DELETE') || type.includes('VOID') || type.includes('FAILED') || type.includes('FAIL') || type.includes('LOCKOUT') || type.includes('BLOCK')) {
            return 'bg-red-100 text-red-700';
        }

        switch (type) {
            case 'SALE': return 'bg-green-100 text-green-700';
            case 'INVENTORY_MOVE':
            case 'INVENTORY_ADJUST':
            case 'INVENTORY_INIT':
                return 'bg-blue-100 text-blue-700';
            case 'APPOINTMENT':
            case 'CONSULTATION_ADD':
            case 'CONSULTATION_EDIT':
                return 'bg-purple-100 text-purple-700';
            case 'PATIENT_ADD':
            case 'PATIENT_EDIT':
                return 'bg-pink-100 text-pink-700';
            case 'CLIENT_ADD':
            case 'CLIENT_EDIT':
            case 'TUTOR_ADD':
                return 'bg-indigo-100 text-indigo-700';
            case 'PRODUCT_ADD':
            case 'PRODUCT_CREATE':
            case 'PRODUCT_ADD_BULK':
            case 'PRODUCT_UPDATE':
                return 'bg-orange-100 text-orange-700';
            case 'EMAIL_SENT': return 'bg-blue-100 text-blue-700 font-bold';
            case 'SUPPLIER_ADD':
            case 'SUPPLIER_EDIT':
                return 'bg-yellow-100 text-yellow-700';
            case 'USER_ADD':
            case 'USER_EDIT':
            case 'USER_ACTIVATE':
            case 'USER_UNLOCK':
                return 'bg-teal-100 text-teal-700';
            case 'BRANCH_ADD':
            case 'BRANCH_UPDATE':
                return 'bg-sky-100 text-sky-700';
            case 'LOGIN':
            case 'SECURITY_LOGIN_SUCCESS':
                return 'bg-green-50 text-green-600';
            case 'LOGOUT': return 'bg-gray-100 text-gray-600';
            case 'SECURITY_SETTING_CHANGE':
            case 'ROLE_UPDATE':
            case 'PERMISSION_UPDATE':
            case 'PASSWORD_RESET':
            case 'USER_PASSWORD_CHANGE':
                return 'bg-amber-100 text-amber-700 font-bold';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getActionLabel = (actionType: string) => {
        const type = actionType.replace(/ /g, '_');
        const labels: Record<string, string> = {
            'SALE': 'Venta',
            'SALE_VOID': 'Venta Anulada',
            'INVENTORY_MOVE': 'Movimiento Inventario',
            'INVENTORY_ADJUST': 'Ajuste de Stock',
            'INVENTORY_INIT': 'Inventario Inicial',
            'APPOINTMENT': 'Cita',
            'PATIENT_ADD': 'Paciente Nuevo',
            'PATIENT_EDIT': 'Paciente Editado',
            'PATIENT_DELETE': 'Paciente Eliminado',
            'CLIENT_ADD': 'Cliente Nuevo',
            'CLIENT_EDIT': 'Cliente Editado',
            'CLIENT_DELETE': 'Cliente Eliminado',
            'TUTOR_ADD': 'Tutor Nuevo',
            'PRODUCT_ADD': 'Producto Nuevo',
            'PRODUCT_CREATE': 'Producto Nuevo',
            'PRODUCT_ADD_BULK': 'Carga Masiva (CSV)',
            'PRODUCT_UPDATE': 'Producto Editado',
            'PRODUCT_DELETE': 'Producto Eliminado',
            'EMAIL_SENT': 'Correo Enviado',
            'SUPPLIER_ADD': 'Proveedor Nuevo',
            'SUPPLIER_EDIT': 'Proveedor Editado',
            'SUPPLIER_DELETE': 'Proveedor Eliminado',
            'USER_ADD': 'Usuario Nuevo',
            'USER_EDIT': 'Usuario Editado',
            'USER_DELETE': 'Usuario Eliminado',
            'USER_ACTIVATE': 'Usuario Activado',
            'USER_DEACTIVATE': 'Usuario Desactivado',
            'USER_UNLOCK': 'Usuario Desbloqueado',
            'USER_BLOCK': 'Usuario Bloqueado',
            'USER_PASSWORD_CHANGE': 'Clave Cambiada',
            'BRANCH_ADD': 'Sucursal Nueva',
            'BRANCH_UPDATE': 'Sucursal Editada',
            'BRANCH_DELETE': 'Sucursal Eliminada',
            'LOGIN': 'Inicio de Sesión',
            'LOGIN_FAILED': 'Sesión Fallida',
            'LOGOUT': 'Cierre de Sesión',
            'PASSWORD_RESET': 'Clave Restablecida',
            'SECURITY_LOGIN_FAIL': 'Sesión Fallida',
            'SECURITY_LOGIN_SUCCESS': 'Login Exitoso',
            'SECURITY_LOCKOUT': 'Cuenta Bloqueada (Seguridad)',
            'SECURITY_BLOCKED_ACCESS': 'Intento Cuenta Bloqueada',
            'SECURITY_INACTIVE_ACCESS': 'Intento Cuenta Inactiva',
            'SECURITY_SETTING_CHANGE': 'Seguridad: Cambio',
            'ROLE_UPDATE': 'Seguridad: Roles',
            'PERMISSION_UPDATE': 'Seguridad: Permisos',
            'CONSULTATION_ADD': 'Consulta Médica',
            'CONSULTATION_EDIT': 'Consulta Editada',
            'CONSULTATION_DELETE': 'Consulta Eliminada',
            'EXAM_ADD': 'Examen Nuevo',
            'EXAM_EDIT': 'Examen Editado',
            'EXAM_DELETE': 'Examen Eliminado',
            'DELIVERY_ADD': 'Despacho Nuevo',
            'DELIVERY_STATUS_UPDATE': 'Estado Despacho',
            'DELIVERY_DELETE': 'Despacho Eliminado',
            'APPOINTMENT_ADD': 'Cita Agendada',
            'APPOINTMENT_DELETE': 'Cita Eliminada',
        };
        return labels[type] || type.replace(/_/g, ' ');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Activity size={28} className="text-blue-400" />
                Historial de Actividades
            </h1>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
                    </div>

                    {/* Date Navigator */}
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                        <button
                            onClick={handlePrevDay}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="px-4 py-1 text-center min-w-[200px]">
                            <span className="block font-bold text-gray-800 capitalize">
                                {currentDate.toLocaleDateString("es-ES", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                })}
                            </span>
                        </div>

                        <button
                            onClick={handleNextDay}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            <option value="PATIENT_ADD">Pacientes (Altas)</option>
                            <option value="CLIENT_ADD">Clientes (Altas)</option>
                            <option value="PRODUCT_ADD">Productos (Altas)</option>
                            <option value="CLIENT_DELETE">Eliminaciones</option>
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

                    <div className="flex items-end gap-2">
                        <button
                            onClick={applyFilters}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 flex-1 justify-center"
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
                    </div>
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
                                        Hora
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
                                        {formatTime(activity.created_at)}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {activity.user_name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            onClick={() => activity.action_type === 'SALE' && handleActionClick(activity)}
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action_type)} ${activity.action_type === 'SALE' ? 'cursor-pointer hover:underline hover:opacity-80' : ''}`}
                                            title={activity.action_type === 'SALE' ? 'Ver detalle de venta' : ''}
                                        >
                                            {getActionLabel(activity.action_type)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {activity.description}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {getBranchName(activity)}
                                    </td>
                                </tr>
                            ))}

                            {activities.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">
                                        No se encontraron actividades para este día.
                                    </td>
                                </tr>
                            )}

                        </tbody>
                    </table>
                </div>

                {/* Load More / Less Buttons */}
                <div className="p-4 flex justify-center border-t border-gray-200 gap-2">
                    {activities.length > LIMIT && (
                        <button
                            onClick={handleShowLess}
                            disabled={loading}
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2 font-medium"
                        >
                            <ChevronUp size={16} />
                            Ver menos
                        </button>
                    )}

                    {hasMore && (
                        <button
                            onClick={handleLoadMore}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                        >
                            {loading ? (
                                <RefreshCw size={16} className="animate-spin" />
                            ) : (
                                <ChevronDown size={16} />
                            )}
                            {loading ? 'Cargando...' : 'Ver más actividades'}
                        </button>
                    )}
                </div>

                {/* Pagination Info */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 text-center">
                    Mostrando {activities.length} registro(s)
                </div>
            </div>
            {/* Sale Detail Modal */}
            {selectedSale && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Detalle de Venta</h3>
                                <p className="text-sm text-gray-500">ID: {selectedSale.id?.slice(-6) || '...'}</p>
                            </div>
                            <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div className="space-y-4">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <span className="block text-gray-500 text-xs">Cliente</span>
                                    <span className="font-semibold text-gray-800">
                                        {selectedSale.customer_name || 'Cliente General'}
                                    </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <span className="block text-gray-500 text-xs">Método de Pago</span>
                                    <span className="font-semibold text-gray-800">
                                        {{
                                            'CASH': 'Efectivo',
                                            'DEBIT': 'Débito',
                                            'CREDIT': 'Crédito',
                                            'TRANSFER': 'Transferencia',
                                            'DEBT': 'Deudado'
                                        }[selectedSale.payment_method as string] || selectedSale.payment_method}
                                    </span>
                                </div>
                            </div>

                            {/* Products List */}
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2 border-b pb-1">Productos</h4>
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {selectedSale.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <div>
                                                <span className="font-medium text-gray-800">{item.name}</span>
                                                <div className="text-xs text-gray-500">x{item.quantity} un.</div>
                                            </div>
                                            <span className="font-medium text-gray-600">${item.total?.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total Footer */}
                            <div className="border-t pt-4 flex justify-between items-center">
                                <span className="text-gray-600">Total Pagado</span>
                                <span className="text-2xl font-bold text-blue-600">${selectedSale.total?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityHistory;
