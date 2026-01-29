import { useEffect, useState } from 'react';
import api from '../api/axios';
import { ChevronLeft, ChevronRight, Plus, X, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Select from 'react-select';

const Agenda = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);

    // Management Modal State
    const [selectedEvents, setSelectedEvents] = useState<any>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
    const [patients, setPatients] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        patient_id: '',
        time: '10:00',
        reason: 'Consulta General',
        notes: ''
    });

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const fetchEvents = async () => {
        try {
            const res = await api.get('/dashboard/calendar', {
                params: {
                    start: startOfMonth.toISOString(),
                    // End date should be the very end of the month in UTC or start of next month
                    // Using start of next month to ensure we cover all hours of the last day
                    end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString()
                }
            });
            setEvents(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    // Fetch patients for the select input
    useEffect(() => {
        const loadPatients = async () => {
            try {
                // Fetching all patients for search. In production, consider async select with search endpoint
                const { data } = await api.get('/patients?limit=100');
                setPatients(data.map((p: any) => ({
                    value: p._id,
                    label: `${p.name} (${p.species}) - ${p.breed} `
                })));
            } catch (err) {
                console.error("Error loading patients", err);
            }
        };
        loadPatients();
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!formData.patient_id) {
                alert('Selecciona un paciente');
                return;
            }

            // Construct DateTime
            // selectedDate holds the Year-Month-Day selected in calendar
            const dateStr = selectedDate.toISOString().split('T')[0];
            const finalDate = new Date(`${dateStr}T${formData.time}:00`);

            await api.post('/consultations', {
                patient_id: formData.patient_id,
                date: finalDate.toISOString(),
                reason: formData.reason,
                notes: formData.notes
            });

            setShowModal(false);
            setFormData({ patient_id: '', time: '10:00', reason: 'Consulta General', notes: '' });
            fetchEvents(); // Refresh calendar
            alert('Hora agendada correctamente');
        } catch (error) {
            console.error(error);
            alert('Error al agendar');
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/consultations/${id}`);
            setSelectedEvents(null);
            fetchEvents();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar');
        }
    };

    const handleReschedule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const finalDate = new Date(`${rescheduleData.date}T${rescheduleData.time}:00`);
            await api.put(`/consultations/${selectedEvents.id}`, {
                date: finalDate.toISOString()
            });

            alert('Cita reagendada con éxito. Se ha enviado un correo al tutor.');
            setSelectedEvents(null);
            setIsRescheduling(false);
            fetchEvents();
        } catch (error) {
            console.error(error);
            alert('Error al reagendar');
        }
    };

    // Calendar Grid Logic
    const daysInMonth = endOfMonth.getDate();
    const firstDayOfWeek = startOfMonth.getDay();
    const emptyStartDays = Array(firstDayOfWeek).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getEventsForDay = (day: number) => {
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
        return events.filter(e => e.start.startsWith(dateStr));
    };

    return (
        <div className="flex h-[calc(100vh-100px)] space-x-6 relative">
            {/* Calendar View */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 capitalize">
                        {currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex space-x-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-lg">Hoy</button>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight /></button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden flex-1">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                        <div key={d} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-500 uppercase">
                            {d}
                        </div>
                    ))}

                    {emptyStartDays.map((_, i) => (
                        <div key={`empty - ${i} `} className="bg-white min-h-[100px]" />
                    ))}

                    {days.map(day => {
                        const dayEvents = getEventsForDay(day);
                        const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth();
                        const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

                        return (
                            <div
                                key={day}
                                onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                                className={`min-h-[120px] border rounded-lg flex flex-col items-start justify-start p-2 cursor-pointer transition-all
                                    ${isSelected
                                        ? 'bg-primary/10 border-primary shadow-sm'
                                        : 'hover:bg-gray-50 border-transparent bg-white'
                                    }
`}
                            >
                                <div className="w-full flex justify-between items-start mb-1">
                                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                                        ${isToday ? 'bg-secondary text-white' : (isSelected ? 'bg-primary text-white' : 'text-gray-700')}
                                    `}>
                                        {day}
                                    </span>
                                </div>
                                <div className="space-y-1 w-full overflow-y-auto max-h-[100px] scrollbar-hide">
                                    {dayEvents.map(ev => (
                                        <button
                                            key={ev.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEvents(ev);
                                                setIsRescheduling(false);
                                                const d = new Date(ev.start);
                                                setRescheduleData({
                                                    date: d.toISOString().split('T')[0],
                                                    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                                });
                                            }}
                                            className="block w-full text-left text-[10px] bg-white border border-brand-accent/30 text-gray-700 px-1.5 py-1 rounded truncate hover:bg-brand-surface shadow-sm focus:outline-none"
                                            title={`${new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${ev.title}`}
                                        >
                                            <span className="font-bold text-primary">{new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> {ev.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sidebar Details */}
            <div className="w-80 bg-white rounded-xl shadow-sm border p-6 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-1 capitalize">
                    {selectedDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-sm text-gray-500 mb-4">Agenda del día</p>

                <div className="flex-1 overflow-y-auto space-y-3">
                    {getEventsForDay(selectedDate.getDate()).length === 0 ? (
                        <p className="text-sm text-gray-400 italic text-center py-4">No hay atenciones agendadas.</p>
                    ) : (
                        getEventsForDay(selectedDate.getDate()).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map(ev => (
                            <button
                                key={ev.id}
                                onClick={() => {
                                    setSelectedEvents(ev);
                                    setIsRescheduling(false);
                                    const d = new Date(ev.start);
                                    setRescheduleData({
                                        date: d.toISOString().split('T')[0],
                                        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                    });
                                }}
                                className="block w-full text-left bg-gray-50 hover:bg-blue-50 p-3 rounded-lg border border-gray-100 transition-colors focus:outline-none"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-bold text-gray-900">
                                        {new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-0.5 rounded-full">
                                        Consulta
                                    </span>
                                </div>
                                <p className="font-medium text-gray-800 text-sm truncate">{ev.title}</p>
                                <p className="text-xs text-gray-500 truncate">{ev.reason}</p>
                            </button>
                        ))
                    )}
                </div>

                <div className="mt-4 pt-4 border-t">
                    <button
                        className="w-full btn-primary flex justify-center items-center space-x-2"
                        onClick={() => setShowModal(true)}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Agendar Hora</span>
                    </button>
                </div>
            </div>

            {/* Quick Schedule Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Nueva Cita</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                                <Select
                                    options={patients}
                                    placeholder="Buscar paciente..."
                                    noOptionsMessage={() => "No se encontraron pacientes"}
                                    loadingMessage={() => "Cargando..."}
                                    className="text-sm"
                                    onChange={(opt: any) => setFormData({ ...formData, patient_id: opt?.value || '' })}
                                />
                                <div className="text-right mt-1">
                                    <Link to="/pacientes/crear" className="text-xs text-blue-600 hover:underline">
                                        + Nuevo Paciente
                                    </Link>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600 text-sm">
                                        {selectedDate.toLocaleDateString()}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                                    <div className="relative">
                                        <Clock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="time"
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                            value={formData.time}
                                            onChange={e => setFormData({ ...formData, time: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                                <input
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Ej. Vacunación, Control..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios / Indicaciones</label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500 resize-none"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Ej. Traer carnet de vacunación, ayuno de 8 horas..."
                                />
                            </div>

                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 font-medium transition-colors shadow-sm"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Management Modal */}
            {selectedEvents && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setSelectedEvents(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {!isRescheduling ? (
                            <>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedEvents.title}</h3>
                                <div className="text-sm text-gray-500 mb-6">
                                    <p className="font-medium">{new Date(selectedEvents.start).toLocaleDateString()} - {new Date(selectedEvents.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    <p className="mt-2">{selectedEvents.reason}</p>
                                    {selectedEvents.description && <p className="italic mt-1">"{selectedEvents.description}"</p>}
                                </div>

                                <div className="space-y-3">
                                    <Link
                                        to={`/pacientes/${selectedEvents.patient_id}?tab=consultations&consultationId=${selectedEvents.id}`}
                                        className="block w-full text-center py-2.5 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                                    >
                                        Ver Ficha Clínica
                                    </Link>

                                    <div className="flex space-x-3 pt-2">
                                        <button
                                            onClick={() => setIsRescheduling(true)}
                                            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 bg-white"
                                        >
                                            Reagendar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEvent(selectedEvents.id)}
                                            className="flex-1 py-2.5 border border-red-200 text-red-600 bg-red-50 rounded-lg font-medium hover:bg-red-100"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleReschedule} className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Reagendar Cita</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Fecha</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                            value={rescheduleData.date}
                                            onChange={e => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Hora</label>
                                        <input
                                            type="time"
                                            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                            value={rescheduleData.time}
                                            onChange={e => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsRescheduling(false)}
                                        className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 bg-primary text-white rounded-lg hover:opacity-90 font-medium shadow-sm"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <style>{`
    .btn-primary { padding: 0.5rem 1rem; background-color: #2563EB; color: white; font-weight: 500; border-radius: 0.5rem; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #1D4ED8; }
`}</style>
        </div>
    );
};

export default Agenda;
