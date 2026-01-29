import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { Plus, Trash2, Printer } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';

const PrescriptionsTab = ({ patientId }: { patientId: string }) => {
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);

    const fetchPrescriptions = () => {
        api.get(`/prescriptions/patient/${patientId}`).then(({ data }) => setPrescriptions(data));
    };

    useEffect(() => {
        fetchPrescriptions();
    }, [patientId]);

    const downloadPDF = async (id: string, patientName: string) => {
        try {
            const response = await api.get(`/prescriptions/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `receta_${patientName}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            alert('Error al generar PDF');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Recetas Médicas</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-primary hover:opacity-90 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Receta</span>
                </button>
            </div>

            {showForm && (
                <PrescriptionForm patientId={patientId} onSuccess={() => { setShowForm(false); fetchPrescriptions(); }} />
            )}

            <div className="space-y-4">
                {prescriptions.map(p => (
                    <div key={p._id} className="bg-white border rounded-lg p-5 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-900">Receta del {new Date(p.date).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-500">{p.items.length} medicamentos</p>
                            <div className="mt-2 space-y-1">
                                {p.items.slice(0, 2).map((item: any, i: number) => (
                                    <p key={i} className="text-xs text-gray-600">• {item.medication}</p>
                                ))}
                                {p.items.length > 2 && <p className="text-xs text-gray-400">...</p>}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => downloadPDF(p._id, "paciente")}
                                className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg flex flex-col items-center"
                                title="Descargar PDF"
                            >
                                <Printer className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-bold">PDF</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PrescriptionForm = ({ patientId, onSuccess }: any) => {
    const { register, control, handleSubmit } = useForm({
        defaultValues: {
            items: [{ medication: '', dose: '', frequency: '', duration: '', instructions: '' }],
            general_instructions: ''
        }
    });
    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const onSubmit = async (data: any) => {
        try {
            await api.post('/prescriptions', { ...data, patient_id: patientId });
            onSuccess();
        } catch {
            alert('Error');
        }
    };

    return (
        <div className="bg-gray-50 p-6 rounded-lg border mb-8">
            <h4 className="font-bold text-gray-900 mb-4">Nueva Receta</h4>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="bg-white p-3 rounded border relative">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                                <input {...register(`items.${index}.medication` as const)} placeholder="Medicamento" className="px-2 py-1 border rounded text-sm" required />
                                <input {...register(`items.${index}.dose` as const)} placeholder="Dosis" className="px-2 py-1 border rounded text-sm" required />
                                <input {...register(`items.${index}.frequency` as const)} placeholder="Frecuencia" className="px-2 py-1 border rounded text-sm" required />
                                <input {...register(`items.${index}.duration` as const)} placeholder="Duración" className="px-2 py-1 border rounded text-sm" required />
                            </div>
                            <input {...register(`items.${index}.instructions` as const)} placeholder="Indicaciones adicionales" className="w-full px-2 py-1 border rounded text-sm" />

                            {fields.length > 1 && (
                                <button type="button" onClick={() => remove(index)} className="absolute top-1 right-1 text-red-400 hover:text-red-600">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={() => append({ medication: '', dose: '', frequency: '', duration: '', instructions: '' })} className="text-sm text-blue-600 hover:underline">
                        + Agregar Medicamento
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indicaciones Generales</label>
                    <textarea {...register('general_instructions')} className="w-full px-3 py-2 border rounded" rows={2} />
                </div>

                <div className="flex justify-end pt-2">
                    <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90">Emitir Receta</button>
                </div>
            </form>
        </div>
    )
}

export default PrescriptionsTab;
