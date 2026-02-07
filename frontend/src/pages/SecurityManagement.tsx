import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Shield,
    Lock,
    Unlock,
    Globe,
    Smartphone,
    XCircle,
    Clock,
    User as UserIcon,
    RefreshCw,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

interface BlockedUser {
    id: string;
    name: string;
    email: string;
    blocked_at: string;
    failed_attempts: number;
    ips: string[];
}

interface UserSession {
    id: string;
    user_email: string;
    user_name: string;
    ip_address: string;
    user_agent: string;
    last_activity: string;
    created_at: string;
    is_current?: boolean;
}

interface SecurityAlert {
    id: string;
    type: string;
    description: string;
    user_name: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

const SecurityManagement = () => {
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
    const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'blocked' | 'sessions' | 'alerts'>('alerts');
    const [visibleCount, setVisibleCount] = useState(20);
    const [alertDate, setAlertDate] = useState(new Date());

    const fetchData = async () => {
        setLoading(true);
        try {
            const startOfDay = new Date(alertDate.getFullYear(), alertDate.getMonth(), alertDate.getDate(), 0, 0, 0).toISOString();
            const endOfDay = new Date(alertDate.getFullYear(), alertDate.getMonth(), alertDate.getDate(), 23, 59, 59).toISOString();

            const [blockedRes, sessionsRes, alertsRes] = await Promise.all([
                api.get('/security/blocked-accounts'),
                api.get('/security/active-sessions'),
                api.get(`/security/security-alerts?start_date=${startOfDay}&end_date=${endOfDay}`)
            ]);
            setBlockedUsers(blockedRes.data);
            setActiveSessions(sessionsRes.data);
            setSecurityAlerts(alertsRes.data);
        } catch (error: any) {
            console.error("Error fetching security data", error);
            if (error.response?.status === 403) {
                alert("No tienes permisos suficientes para ver esta información.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [alertDate]);

    const handlePrevDay = () => {
        const newDate = new Date(alertDate);
        newDate.setDate(alertDate.getDate() - 1);
        setAlertDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(alertDate);
        newDate.setDate(alertDate.getDate() + 1);
        setAlertDate(newDate);
    };

    const handleUnlock = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas desbloquear esta cuenta?')) return;
        try {
            await api.post(`/security/unlock/${id}`);
            alert('Cuenta desbloqueada');
            fetchData();
        } catch (error) {
            alert('Error al desbloquear');
        }
    };

    const handleRevokeSession = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas cerrar esta sesión de forma remota?')) return;
        try {
            await api.post(`/security/revoke-session/${id}`);
            alert('Sesión cerrada');
            fetchData();
        } catch (error) {
            alert('Error al cerrar sesión');
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('¿Estás seguro de que deseas limpiar todo el historial de alertas? Esta acción no se puede deshacer.')) return;
        try {
            await setLoading(true);
            await api.delete('/security/clear-alerts');
            setSecurityAlerts([]);
            alert('Historial limpiado');
        } catch (error) {
            alert('Error al limpiar el historial');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const hasTimezone = dateString.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(dateString);
        const isoString = hasTimezone ? dateString : `${dateString}Z`;
        return new Date(isoString).toLocaleString('es-CL');
    };

    const formatRelativeTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        const hasTimezone = dateString.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(dateString);
        const isoString = hasTimezone ? dateString : `${dateString}Z`;
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Hace unos segundos';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `Hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-8 h-8 text-indigo-600" />
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Seguridad</h1>
                </div>
                <p className="text-gray-600">Monitorea cuentas bloqueadas y sesiones activas en tiempo real.</p>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('blocked')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'blocked'
                        ? 'text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Cuentas Bloqueadas
                    {blockedUsers.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                            {blockedUsers.length}
                        </span>
                    )}
                    {activeTab === 'blocked' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('sessions')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'sessions'
                        ? 'text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Sesiones Activas
                    {activeTab === 'sessions' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'alerts'
                        ? 'text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Alertas (Historial)
                    {securityAlerts.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-600 rounded-full">
                            {securityAlerts.length}
                        </span>
                    )}
                    {activeTab === 'alerts' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                    )}
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                    <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Cargando datos de seguridad...</p>
                </div>
            ) : (
                <>
                    {activeTab === 'blocked' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {blockedUsers.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Unlock className="w-12 h-12 text-green-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">No hay cuentas bloqueadas</h3>
                                    <p className="text-gray-500">Todas las cuentas están operando normalmente.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Bloqueado el</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Intentos</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">IPs Origen</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {blockedUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900">{user.name}</div>
                                                            <div className="text-xs text-gray-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {formatDate(user.blocked_at)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-red-600">
                                                    {user.failed_attempts}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.ips.map((ip: string) => (
                                                            <span key={ip} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                                                                {ip}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleUnlock(user.id)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium text-sm shadow-sm"
                                                    >
                                                        <Unlock className="w-4 h-4" />
                                                        Desbloquear
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === 'sessions' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeSessions.map((session) => (
                                <div key={session.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                                {session.user_agent.toLowerCase().includes('mobile') ? <Smartphone className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-gray-900 line-clamp-1">{session.user_name}</div>
                                                    {session.is_current && (
                                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-200">
                                                            Tú
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 font-medium">{session.user_email}</div>
                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">{session.ip_address}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRevokeSession(session.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Cerrar Sesión"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="space-y-3 pt-3 border-t border-gray-50">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Clock className="w-4 h-4" />
                                            Iniciada: {formatRelativeTime(session.created_at)} ({formatDate(session.created_at)})
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <UserIcon className="w-4 h-4" />
                                            Última Actividad: {formatRelativeTime(session.last_activity)}
                                        </div>
                                        <div className="text-[10px] text-gray-400 italic truncate" title={session.user_agent}>
                                            {session.user_agent}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {activeSessions.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-gray-300">
                                    <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">No hay sesiones activas registradas</h3>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'alerts' && (
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
                                {/* Day Navigator */}
                                <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                    <button
                                        onClick={handlePrevDay}
                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>

                                    <div className="px-4 py-1 text-center min-w-[200px]">
                                        <span className="block font-bold text-gray-800 capitalize">
                                            {alertDate.toLocaleDateString("es-ES", {
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

                                <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                                    <span className="text-xs text-gray-500">Mostrando {Math.min(securityAlerts.length, visibleCount)} de {securityAlerts.length} alertas</span>
                                    {securityAlerts.length > 0 && (
                                        <button
                                            onClick={handleClearHistory}
                                            className="text-[10px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-1 bg-red-50 rounded-lg border border-red-100 transition-colors"
                                        >
                                            <XCircle className="w-3 h-3" />
                                            Limpiar Historial
                                        </button>
                                    )}
                                </div>
                            </div>

                            {securityAlerts.slice(0, visibleCount).map((alert) => (
                                <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-xl border ${alert.type === 'SECURITY_LOCKOUT' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                    <div className={`p-2 rounded-lg ${alert.type === 'SECURITY_LOCKOUT' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-gray-900">
                                                {alert.type.replace('SECURITY_', '').split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                                            </h4>
                                            <span className="text-xs text-gray-500">{formatDate(alert.created_at)}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1"><UserIcon size={14} /> {alert.user_name || 'Sistema/Anónimo'}</div>
                                            <div className="flex items-center gap-1"><Globe size={14} /> {alert.ip_address || 'N/A'}</div>
                                            <div className="flex items-center gap-1 italic truncate max-w-sm" title={alert.user_agent || ''}>
                                                <Smartphone size={14} /> {alert.user_agent || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {securityAlerts.length > 20 && (
                                <div className="flex justify-center gap-4 py-4">
                                    {visibleCount < securityAlerts.length && (
                                        <button
                                            onClick={() => setVisibleCount(prev => prev + 20)}
                                            className="px-6 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                            Ver más
                                        </button>
                                    )}
                                    {visibleCount > 20 && (
                                        <button
                                            onClick={() => setVisibleCount(20)}
                                            className="px-6 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                            Ver menos
                                        </button>
                                    )}
                                </div>
                            )}

                            {securityAlerts.length === 0 && (
                                <div className="py-20 text-center bg-white rounded-xl border border-dashed border-gray-300">
                                    <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">No hay alertas de seguridad críticas</h3>
                                    <p className="text-gray-500">El sistema se encuentra monitoreando la actividad en tiempo real.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SecurityManagement;
