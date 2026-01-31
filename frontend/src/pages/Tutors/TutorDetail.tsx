import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    Phone, MapPin, Calendar, Activity,
    ArrowLeft, PawPrint, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { formatPhoneNumber } from '../../utils/formatters';

const TutorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get(`/tutors/${id}/details`);
                setData(response.data);
            } catch (error) {
                console.error("Error fetching tutor details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-8 text-center">Cargando perfil...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Tutor no encontrado</div>;

    const { tutor, patients, consultations, stats } = data;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10">
            {/* Header / Navigation */}
            <div className="flex items-center space-x-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Perfil del Tutor</h1>
            </div>

            {/* Profile Card & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tutor Info */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
                                {tutor.full_name[0]}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{tutor.full_name}</h2>
                                <p className="text-gray-500 text-sm">Registrado el {new Date(tutor.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                to={`/tutores/editar/${tutor._id || id}`}
                                className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center"
                            >
                                ✏️ Editar
                            </Link>
                            <Link
                                to={`/tutors`}
                                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                Ver todos
                            </Link>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center space-x-3 text-gray-700 bg-gray-50 p-3 rounded-lg">
                            <Phone className="w-5 h-5 text-primary" />
                            <span className="font-medium">{formatPhoneNumber(tutor.phone)}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-700 bg-gray-50 p-3 rounded-lg">
                            <MapPin className="w-5 h-5 text-primary" />
                            <span className="truncate" title={tutor.address || 'Sin dirección'}>
                                {tutor.address || 'Sin dirección'}
                            </span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-700 bg-gray-50 p-3 rounded-lg">
                            <Activity className="w-5 h-5 text-primary" />
                            {tutor.email ? (
                                <a href={`mailto:${tutor.email}`} className="hover:underline truncate" title={tutor.email}>
                                    {tutor.email}
                                </a>
                            ) : (
                                <span className="text-gray-400 italic">Sin email</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg p-6 text-white">
                    <h3 className="text-lg font-semibold mb-6 flex items-center opacity-90">
                        <Calendar className="w-5 h-5 mr-2 text-teal-300" />
                        Resumen de Asistencia
                    </h3>
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <span className="text-gray-300 text-sm">Citas Totales</span>
                            <span className="text-3xl font-bold">{stats.total_appointments}</span>
                        </div>

                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-teal-400"
                                style={{ width: stats.total_appointments ? `${(stats.attended / stats.total_appointments) * 100}%` : '0%' }}
                            />
                            <div
                                className="h-full bg-red-400"
                                style={{ width: stats.total_appointments ? `${(stats.no_shows / stats.total_appointments) * 100}%` : '0%' }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="bg-white/10 p-3 rounded-lg">
                                <div className="flex items-center space-x-2 mb-1">
                                    <CheckCircle className="w-4 h-4 text-teal-300" />
                                    <span className="text-xs font-medium text-teal-100">Asistidas</span>
                                </div>
                                <span className="text-xl font-bold">{stats.attended}</span>
                            </div>
                            <div className="bg-white/10 p-3 rounded-lg">
                                <div className="flex items-center space-x-2 mb-1">
                                    <XCircle className="w-4 h-4 text-red-300" />
                                    <span className="text-xs font-medium text-red-100">Faltas</span>
                                </div>
                                <span className="text-xl font-bold">{stats.no_shows}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pets List */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                            <PawPrint className="w-5 h-5 mr-2 text-primary" />
                            Mascotas ({patients.length})
                        </h3>
                        <div className="space-y-3">
                            {patients.length > 0 ? patients.map((patient: any) => (
                                <Link
                                    key={patient._id}
                                    to={`/patients/${patient._id}`}
                                    className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-teal-50 hover:shadow-sm transition-all border border-transparent hover:border-teal-100 group"
                                >
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
                                        {patient.species === 'Perro' ? '🐕' : patient.species === 'Gato' ? '🐈' : '🐾'}
                                    </div>
                                    <div className="ml-3">
                                        <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">{patient.name}</p>
                                        <p className="text-xs text-gray-500">{patient.breed} • {patient.sex}</p>
                                    </div>
                                </Link>
                            )) : (
                                <p className="text-gray-500 text-sm italic">Sin mascotas registradas</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Consultations */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border p-6 text-sm">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-primary" />
                            Historial de Citas
                        </h3>

                        {consultations.length > 0 ? (
                            <div className="space-y-4">
                                {consultations.map((consultation: any) => (
                                    <div key={consultation._id} className="relative pl-6 border-l-2 border-gray-100 last:mb-0 hover:bg-gray-50/50 p-2 rounded-r-lg transition-colors">
                                        <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm
                                            ${consultation.status === 'attended' ? 'bg-green-500' :
                                                consultation.status === 'no_show' ? 'bg-red-500' : 'bg-blue-400'}
                                        `}></div>

                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {new Date(consultation.date).toLocaleDateString()}
                                                    <span className="text-gray-400 font-normal mx-2">|</span>
                                                    {new Date(consultation.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <Link to={`/patients/${consultation.patient_id}`} className="text-primary hover:underline text-xs font-medium block mt-1">
                                                    Paciente: {patients.find((p: any) => p._id === consultation.patient_id)?.name || 'Desconocido'}
                                                </Link>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium
                                                ${consultation.status === 'attended' ? 'bg-green-100 text-green-700' :
                                                    consultation.status === 'no_show' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}
                                            `}>
                                                {consultation.status === 'attended' ? 'Asistió' :
                                                    consultation.status === 'no_show' ? 'No Asistió' : 'Agendada'}
                                            </span>
                                        </div>

                                        <p className="text-gray-600 mt-2 line-clamp-2">
                                            {consultation.reason || 'Sin motivo registrado'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8 italic">No hay historial de citas.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorDetail;
