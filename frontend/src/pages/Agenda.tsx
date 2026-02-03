import { useEffect, useState } from 'react';
import api from '../api/axios';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Scissors, Stethoscope, DollarSign, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { useBranch } from '../context/BranchContext';

const Agenda = () => {
    const { currentBranch } = useBranch();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [agendaType, setAgendaType] = useState<'VET' | 'GROOMING'>('VET');

    // Management Modal State
    const [selectedEvents, setSelectedEvents] = useState<any>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
    const [patients, setPatients] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        patient_id: '',
        patient_id: '',
        time: '10:00',
        reason: 'Consulta General',
        service: 'Baño', // For grooming default
        notes: '',
        branch_id: ''
    });

    // Branches state
    const [branches, setBranches] = useState<any[]>([]);
    const [filterBranchId, setFilterBranchId] = useState<string>('all');

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const res = await api.get('/branches');
                setBranches(res.data);
                // Default to first available branch if current not set, or keep 'all'
                // If we want to default to user's branch:
                // if (currentBranch) setFilterBranchId(currentBranch.id || currentBranch._id);
            } catch (e) {
                console.error(e);
            }
        };
        loadBranches();
    }, []);


    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const fetchEvents = async () => {
        try {
            const res = await api.get('/dashboard/calendar', {
                params: {
                    start: startOfMonth.toISOString(),
                    end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString(),
                    appointment_type: agendaType
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
                // Fetching all patients for search.
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
    }, [currentDate, currentBranch, agendaType]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentBranch) return alert('Seleccione una sucursal');

        try {
            if (!formData.patient_id) {
                alert('Selecciona un paciente');
                return;
            }

            // Construct DateTime
            const dateStr = selectedDate.toISOString().split('T')[0];
            const finalDate = new Date(`${dateStr}T${formData.time}:00`);

            // Check for double booking
            const targetBranchId = formData.branch_id || currentBranch?.id || currentBranch?._id;
            const conflictingEvent = events.find(ev => {
                const evDate = new Date(ev.start);
                return evDate.getTime() === finalDate.getTime() && ev.branch_id === targetBranchId && ev.status !== 'cancelled';
            });

            if (conflictingEvent) {
                const branchName = branches.find(b => (b.id || b._id) === targetBranchId)?.name || 'la sucursal seleccionada';
                alert(`Ya existe una cita agendada a las ${formData.time} en ${branchName}.`);
                return;
            }

            await api.post('/consultations', {
                patient_id: formData.patient_id,
                date: finalDate.toISOString(),
                date: finalDate.toISOString(),
                reason: agendaType === 'GROOMING' ? formData.service : formData.reason,
                notes: formData.notes,
                branch_id: formData.branch_id || currentBranch?.id || currentBranch?._id,
                appointment_type: agendaType
            });

            setShowModal(false);
            setShowModal(false);
            setFormData(prev => ({ ...prev, patient_id: '', time: '10:00', reason: 'Consulta General', service: 'Baño', notes: '' }));
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
            await api.put(`/consultations/${selectedEvents.id}?notify_tutor=true`, {
                date: finalDate.toISOString()
            });

            alert('Cita reagendada con éxito.');
            setSelectedEvents(null);
            setIsRescheduling(false);
            fetchEvents();
        } catch (error) {
            console.error(error);
            alert('Error al reagendar');
        }
    };

    const handleFinishGrooming = async () => {
        // This is handled via status update. 
        // But if no sale ID, backend blocks it. 
        // So frontend should redirect to POS to create Sale, then link it.
        // Or simply check if Reference Sale exists.

        if (agendaType === 'GROOMING' && !selectedEvents.reference_sale_id && selectedEvents.status !== 'attended') {
            const confirmSale = confirm("Para finalizar una atención de peluquería debe realizar el cobro. ¿Ir a Caja?");
            if (confirmSale) {
                // Navigate to POS with pre-filled info?
                // For now, simple redirect.
                // Could pass state: { patientId: ..., service: 'Grooming' }
                navigate('/ventas/nueva');
            }
            return;
        }

        try {
            await api.put(`/consultations/${selectedEvents.id}`, {
                status: 'attended'
            });
            alert('Atención finalizada');
            setSelectedEvents(null);
            fetchEvents();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Error al finalizar');
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
        return events.filter(e => {
            const matchesDate = e.start.startsWith(dateStr);
            const matchesBranch = filterBranchId === 'all' || e.branch_id === filterBranchId;
            return matchesDate && matchesBranch;
        });
    };

    const getBranchColor = (branchName: string) => {
        const name = branchName?.toLowerCase() || '';
        if (name.includes('rancagua')) return 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100';
        if (name.includes('olivar')) return 'bg-green-50 border-green-200 text-green-900 hover:bg-green-100';
        if (name.includes('viña')) return 'bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100';
        if (name.includes('francisco') || name.includes('mostazal')) return 'bg-orange-50 border-orange-200 text-orange-900 hover:bg-orange-100';
        return 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100';
    };

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-100px)] gap-6 relative p-4 lg:p-0">
            {/* Calendar View */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border p-4 lg:p-6 flex flex-col min-h-[500px]">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    {/* Toggle and Branch Selector */}
                    <div className="flex flex-wrap items-center gap-4 bg-gray-100 p-1.5 rounded-lg">
                        <div className="flex bg-white rounded-md shadow-sm">
                            <button
                                onClick={() => setAgendaType('VET')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-l-md text-sm font-medium transition-colors border-r ${agendaType === 'VET' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                <Stethoscope size={16} /> Veterinaria
                            </button>
                            <button
                                onClick={() => setAgendaType('GROOMING')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-r-md text-sm font-medium transition-colors ${agendaType === 'GROOMING' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                <Scissors size={16} /> Peluquería
                            </button>
                        </div>

                        <div className="h-6 w-px bg-gray-300 mx-1"></div>

                        <select
                            value={filterBranchId}
                            onChange={(e) => setFilterBranchId(e.target.value)}
                            className="text-sm bg-white border-0 rounded-md px-3 py-1.5 shadow-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[150px]"
                        >
                            <option value="all">Todas las Sucursales</option>
                            {branches.map((b: any) => (
                                <option key={b.id || b._id} value={b.id || b._id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-900 capitalize">
                            {currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                        </h2>
                        <div className="flex space-x-2">
                            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft /></button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-lg">Hoy</button>
                            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight /></button>
                        </div>
                    </div>

                </div>

                <div className="flex-1 overflow-x-auto">
                    <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden min-w-[800px] h-full">
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
                                            ? 'bg-primary/5 border-primary shadow-sm'
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
                                    <div className="space-y-1 w-full overflow-hidden">
                                        {dayEvents.slice(0, 3).map(ev => (
                                            <button
                                                key={ev.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedEvents(ev);
                                                    setIsRescheduling(false);
                                                }}
                                                className={`block w-full text-left text-[10px] border px-1.5 py-1 rounded truncate shadow-sm focus:outline-none 
                                                    ${agendaType === 'GROOMING' ? 'bg-brand-surface text-primary border-brand-accent/50' : 'bg-white text-gray-700 border-gray-200'}
                                                `}
                                                title={`${new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${ev.title}`}
                                            >
                                                <span className="font-bold">{new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span> {ev.title}
                                            </button>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-[10px] text-center text-gray-500 font-medium pt-1">
                                                + {dayEvents.length - 3} más
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Sidebar Details */}
            <div className="w-full lg:w-80 bg-white rounded-xl shadow-sm border p-6 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-1 capitalize">
                    {selectedDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-500">Agenda {agendaType === 'VET' ? 'Veterinaria' : 'Peluquería'}</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                    {getEventsForDay(selectedDate.getDate()).length === 0 ? (
                        <p className="text-sm text-gray-400 italic text-center py-4">No hay atenciones agendadas.</p>
                    ) : (
                        getEventsForDay(selectedDate.getDate()).sort((a, b) => {
                            const branchRes = (a.branch_name || '').localeCompare(b.branch_name || '');
                            if (branchRes !== 0) return branchRes;
                            return new Date(a.start).getTime() - new Date(b.start).getTime();
                        }).map(ev => (
                            <button
                                key={ev.id}
                                onClick={() => {
                                    setSelectedEvents(ev);
                                    setIsRescheduling(false);
                                }}
                                className={`block w-full text-left p-3 rounded-lg border transition-colors focus:outline-none mb-3
                                    ${getBranchColor(ev.branch_name)}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-bold text-gray-900">
                                        {new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${agendaType === 'GROOMING' ? 'bg-brand-accent/20 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                                        {ev.status === 'attended' ? 'Finalizada' : 'Pendiente'}
                                    </span>
                                </div>
                                <p className="font-medium text-gray-800 text-sm truncate">{ev.title}</p>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-500 truncate">{ev.reason}</p>
                                    <p className="text-[10px] opacity-75 flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded">
                                        <MapPin size={10} /> {ev.branch_name}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="mt-4 pt-4 border-t">
                    <button
                        className="w-full btn-primary flex justify-center items-center space-x-2"
                        onClick={() => {
                            // Pre-fill branch if selected in filter
                            if (filterBranchId !== 'all') {
                                setFormData(prev => ({ ...prev, branch_id: filterBranchId }));
                            } else if (currentBranch) {
                                setFormData(prev => ({ ...prev, branch_id: currentBranch.id || currentBranch._id }));
                            }
                            setShowModal(true);
                        }}
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
                            <h3 className="text-xl font-bold text-gray-900">
                                {agendaType === 'VET' ? 'Nueva Cita Veterinaria' : 'Nueva Cita Peluquería'}
                            </h3>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                    value={formData.branch_id}
                                    onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccione Sucursal</option>
                                    {branches.map((b: any) => (
                                        <option key={b.id || b._id} value={b.id || b._id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {agendaType === 'GROOMING' ? 'Servicio' : 'Motivo / Servicio'}
                                </label>
                                {agendaType === 'GROOMING' ? (
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                        value={formData.service}
                                        onChange={e => setFormData({ ...formData, service: e.target.value })}
                                    >
                                        <option value="Baño">Baño</option>
                                        <option value="Baño y Peluquería">Baño y Peluquería</option>
                                        <option value="Corte de Uñas">Corte de Uñas</option>
                                        <option value="Deslanado">Deslanado</option>
                                    </select>
                                ) : (
                                    <input
                                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                        value={formData.reason}
                                        onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                        placeholder="Ej. Vacuna, Consulta, Revisión..."
                                        required
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500 resize-none"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Detalles adicionales..."

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
                </div >
            )}

            {/* Management Modal */}
            {
                selectedEvents && (
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
                                        {agendaType === 'GROOMING' && selectedEvents.status !== 'attended' && (
                                            <p className="mt-1 font-semibold text-red-500">🔴 Pendiente de Pago/Atención</p>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {/* Action Buttons */}
                                        <div className="space-y-2 mb-4">
                                            {/* Link to Clinical Record */}
                                            <Link
                                                to={`/pacientes/${selectedEvents.patient_id}?tab=consultations&consultationId=${selectedEvents.id}`}
                                                className="block w-full text-center py-2.5 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                                            >
                                                Ficha Clínica
                                            </Link>

                                            {/* Charge / Go to POS */}
                                            {selectedEvents.status !== 'attended' && (
                                                <button
                                                    onClick={() => {
                                                        if (agendaType === 'GROOMING') {
                                                            handleFinishGrooming();
                                                        } else {
                                                            // For Vet, just redirect to POS
                                                            navigate('/ventas/nueva');
                                                        }
                                                    }}
                                                    className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:opacity-90 flex justify-center items-center gap-2"
                                                >
                                                    Cobrar
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex space-x-3 pt-2">
                                            <button
                                                onClick={() => {
                                                    setIsRescheduling(true);
                                                    const d = new Date(selectedEvents.start);
                                                    setRescheduleData({
                                                        date: d.toISOString().split('T')[0],
                                                        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                                    });
                                                }}
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
                )
            }

            <style>{`
    .btn-primary { padding: 0.5rem 1rem; background-color: #5B9AA8; color: white; font-weight: 500; border-radius: 0.5rem; transition: background-color 0.2s; }
                .btn-primary:hover { opacity: 0.9; }
`}</style>
        </div >
    );
};

export default Agenda;
