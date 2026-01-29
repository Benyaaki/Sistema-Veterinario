import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Users, User, Calendar, Activity, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import WelcomeModal from '../components/WelcomeModal';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        total_patients: 0,
        total_tutors: 0,
        consultations_today: 0
    });
    const [loading, setLoading] = useState(true);

    // Welcome Modal State
    const [showWelcome, setShowWelcome] = useState(false);
    const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

    const [futureAppointments, setFutureAppointments] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Always fetch stats, today's, and upcoming
                const [statsRes, upcomingRes, todayRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/upcoming'),
                    api.get('/dashboard/today')
                ]);

                setStats(statsRes.data);
                setFutureAppointments(upcomingRes.data);
                setTodayAppointments(todayRes.data);

                // Check if welcome modal has been shown this session
                const welcomeShown = sessionStorage.getItem('welcomeShown');
                if (!welcomeShown) {
                    setShowWelcome(true);
                    sessionStorage.setItem('welcomeShown', 'true');
                }
            } catch (error) {
                console.error("Error fetching dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            day: date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' }),
            time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const ConsultationRow = ({ item }: { item: any }) => {
        const { day, time } = formatDate(item.date);
        return (
            <div className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="text-center min-w-[80px]">
                        <span className="block text-xs font-bold text-gray-500 uppercase">{day.split(' ')[0]}</span>
                        <span className="block text-lg font-bold text-gray-900">{new Date(item.date).getDate()}</span>
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-lg">{item.patient_name} <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">{item.patient_species}</span></p>
                        <p className="text-gray-600 text-sm">{item.reason}</p>
                    </div>
                </div>
                <div className="flex items-center text-gray-500 font-medium bg-gray-50 px-3 py-1 rounded-lg">
                    <Clock className="w-4 h-4 mr-2" />
                    {time}
                </div>
            </div>
        );
    };

    return (
        <div>
            <WelcomeModal
                isOpen={showWelcome}
                onClose={() => setShowWelcome(false)}
                appointments={todayAppointments}
                userName={user?.name || 'Doctor'}
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-accent/20">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-brand-surface text-primary rounded-lg">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Pacientes Totales</p>
                            <h2 className="text-3xl font-bold text-gray-900">{stats.total_patients}</h2>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center space-x-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                        <Activity className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Consultas Hoy</p>
                        <h2 className="text-3xl font-bold text-gray-900">{stats.consultations_today}</h2>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center space-x-4">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Tutores Registrados</p>
                        <h2 className="text-3xl font-bold text-gray-900">{stats.total_tutors}</h2>
                    </div>
                </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
                <div className="p-6 border-b flex justify-between items-center bg-green-50">
                    <h2 className="text-lg font-bold text-green-900 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-green-600" />
                        Atenciones de Hoy
                    </h2>
                </div>

                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Cargando...</div>
                    ) : todayAppointments.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 italic">No hay consultas para hoy.</div>
                    ) : (
                        todayAppointments.map((item) => (
                            <ConsultationRow key={item.id} item={item} />
                        ))
                    )}
                </div>
            </div>

            {/* Upcoming Schedule */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-gray-400" />
                        Próximas Atenciones
                    </h2>
                    <Link to="/pacientes" className="text-sm text-blue-600 hover:underline">Ver pacientes</Link>
                </div>

                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Cargando...</div>
                    ) : futureAppointments.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 italic">No hay consultas próximas agendadas.</div>
                    ) : (
                        futureAppointments.map((item) => (
                            <ConsultationRow key={item.id} item={item} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
