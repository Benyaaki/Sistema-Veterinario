import { useEffect, useState, useRef } from 'react';
import api from '../../../api/axios';
import { Plus, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useForm } from 'react-hook-form';

const ConsultationsTab = ({ patientId, selectedConsultationId, onClearSelection }: { patientId: string, selectedConsultationId?: string, onClearSelection?: () => void }) => {
    const [consultations, setConsultations] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);

    // Fetch
    const fetchConsultations = () => {
        api.get(`/consultations/patient/${patientId}`)
            .then(({ data }) => setConsultations(data));
    };

    useEffect(() => {
        fetchConsultations();
    }, [patientId]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Historial de Consultas</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center space-x-2 text-sm font-medium text-primary hover:bg-brand-surface px-3 py-2 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>{showForm ? 'Cancelar' : 'Nueva Consulta'}</span>
                </button>
            </div>

            {showForm && (
                <ConsultationForm patientId={patientId} onSuccess={() => { setShowForm(false); fetchConsultations(); }} />
            )}

            <div className="space-y-4">
                {consultations.length === 0 ? (
                    <p className="text-gray-500 italic">No hay consultas registradas.</p>
                ) : (
                    consultations.map(c => (
                        <ConsultationCard
                            key={c._id}
                            consultation={c}
                            onDelete={fetchConsultations}
                            defaultExpanded={c._id === selectedConsultationId}
                            onClearSelection={onClearSelection}
                        />
                    ))
                )}
            </div>
        </div>
    );
};


// Helper for status color
const getStatusColor = (status: string) => {
    switch (status) {
        case 'attended': return 'bg-green-500';
        case 'no_show': return 'bg-red-500';
        case 'cancelled': return 'bg-red-500';
        default: return 'bg-orange-500'; // scheduled
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'attended': return 'Asistió';
        case 'no_show': return 'No Asistió';
        case 'cancelled': return 'Cancelada';
        case 'scheduled': return 'Agendada';
        default: return 'Agendada';
    }
};

const ConsultationForm = ({ patientId, consultation, onSuccess, onCancel }: any) => {
    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: consultation ? {
            ...consultation,
            date: consultation.date ? consultation.date.split('T')[0] : ''
        } : {
            status: 'scheduled',
            date: new Date().toISOString().split('T')[0]
        }
    });
    const currentStatus = watch('status');
    const [saving, setSaving] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

    const onSubmit = async (data: any) => {
        setSaving(true);
        try {
            let consultationId = consultation?._id;

            if (consultation) {
                await api.put(`/consultations/${consultation._id}`, data);
                alert('Consulta actualizada');
            } else {
                const res = await api.post('/consultations', { ...data, patient_id: patientId });
                consultationId = res.data._id;
                alert('Consulta creada');
            }

            // Upload files if any
            if (selectedFiles && selectedFiles.length > 0 && consultationId) {
                const filePromises = Array.from(selectedFiles).map(file => {
                    const formData = new FormData();
                    formData.append('file', file);
                    return api.post(`/consultations/${consultationId}/files`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                });
                await Promise.all(filePromises);
            }

            reset();
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Error al guardar consulta o archivos');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-gray-50 p-6 rounded-lg border mb-6">
            <div className="flex justify-between mb-4">
                <h4 className="font-bold text-gray-900">{consultation ? 'Editar Consulta' : 'Registrar Consulta'}</h4>
                {onCancel && (
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
                )}
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                        <input {...register('reason')} className="w-full px-3 py-2 border rounded-md" required />
                    </div>
                    <div>
                        <div className="flex space-x-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                <input type="date" {...register('date')} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance Confirmation Section */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-900 mb-3">¿Asistió el paciente a la consulta?</label>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setValue('status', 'attended')}
                            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center space-x-2 ${currentStatus === 'attended'
                                ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span>Sí, asistió</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setValue('status', 'no_show')}
                            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center space-x-2 ${currentStatus === 'no_show'
                                ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span>No asistió</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setValue('status', 'scheduled')}
                            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center space-x-2 ${currentStatus === 'scheduled' || !currentStatus
                                ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span>Pendiente / No responder</span>
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anamnesis</label>
                    <textarea {...register('anamnesis')} className="w-full px-3 py-2 border rounded-md" rows={2} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Examen Físico</label>
                    <textarea {...register('physical_exam')} className="w-full px-3 py-2 border rounded-md" rows={2} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
                        <input {...register('diagnosis')} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento</label>
                        <input {...register('treatment')} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exámenes Solicitados</label>
                    <textarea
                        {...register('exams_requested')}
                        className="w-full px-3 py-2 border rounded-md"
                        rows={2}
                        placeholder="Ej. Hemograma, Radiografía de tórax..."
                    />
                </div>

                {/* Image Upload Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Imágenes de Consulta</label>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setSelectedFiles(e.target.files)}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    <p className="text-xs text-gray-500 mt-1">Selecciona fotos para adjuntar a esta consulta.</p>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : (consultation ? 'Actualizar Consulta' : 'Guardar Consulta')}
                </button>
            </form >
        </div >
    );
};

const ConsultationCard = ({ consultation, onDelete, defaultExpanded, onClearSelection }: any) => {
    const [expanded, setExpanded] = useState(defaultExpanded || false);
    const [isEditing, setIsEditing] = useState(false); // Should NOT auto-edit by default
    const formRef = useRef<HTMLDivElement>(null);

    // Update expanded whenever defaultExpanded changes (e.g. from props)
    useEffect(() => {
        if (defaultExpanded) {
            setExpanded(true);
            setIsEditing(true); // Also auto-edit
            setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, [defaultExpanded]);

    const handleDelete = async () => {
        if (confirm('Eliminar consulta?')) {
            await api.delete(`/consultations/${consultation._id}`);
            onDelete();
        }
    };

    if (isEditing) {
        return (
            <div ref={formRef} className="bg-white border rounded-lg shadow-md overflow-hidden">
                <ConsultationForm
                    consultation={consultation}
                    onSuccess={() => { setIsEditing(false); onDelete(); if (onClearSelection) onClearSelection(); }}
                    onCancel={() => { setIsEditing(false); if (onClearSelection) onClearSelection(); }}
                />
            </div>
        );
    }

    return (
        <div ref={formRef} className={`bg-white border rounded-lg p-4 transition-all ${expanded ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'}`}>
            <div className="flex justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div>
                    <div className="flex items-center space-x-3">
                        {/* Status Indicator */}
                        <div
                            className={`w-3 h-3 rounded-full ${getStatusColor(consultation.status || 'scheduled')}`}
                            title={getStatusLabel(consultation.status || 'scheduled')}
                        />
                        <span className="font-bold text-gray-900">{new Date(consultation.date).toLocaleDateString()}</span>
                        <span className="text-gray-400">|</span>
                        <span className="font-medium text-gray-800">{consultation.reason}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </div>

            {expanded && (
                <div className="mt-4 pt-4 border-t space-y-3 text-sm">
                    {consultation.anamnesis && (
                        <div><span className="font-bold text-gray-700">Anamnesis:</span> <p className="text-gray-600">{consultation.anamnesis}</p></div>
                    )}
                    {consultation.physical_exam && (
                        <div><span className="font-bold text-gray-700">Examen Físico:</span> <p className="text-gray-600">{consultation.physical_exam}</p></div>
                    )}
                    {consultation.diagnosis && (
                        <div><span className="font-bold text-gray-700">Diagnóstico:</span> <p className="text-gray-600">{consultation.diagnosis}</p></div>
                    )}
                    {consultation.treatment && (
                        <div><span className="font-bold text-gray-700">Tratamiento:</span> <p className="text-gray-600">{consultation.treatment}</p></div>
                    )}
                    {consultation.notes && (
                        <div><span className="font-bold text-gray-700">Notas:</span> <p className="text-gray-600">{consultation.notes}</p></div>
                    )}
                    {consultation.exams_requested && (
                        <div className="bg-brand-surface p-2 rounded border border-brand-accent/30">
                            <span className="font-bold text-primary block mb-1">Exámenes Solicitados:</span>
                            <p className="text-gray-700">{consultation.exams_requested}</p>
                        </div>
                    )}

                    <div className="flex justify-end pt-2 space-x-3">
                        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="text-primary hover:text-primary/80 text-xs font-medium flex items-center">
                            <FileText className="w-3 h-3 mr-1" /> Editar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center">
                            <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsultationsTab;
