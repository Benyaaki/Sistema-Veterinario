import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { formatPhoneNumber, capitalizeWords, cleanName } from '../../utils/formatters';

const schema = z.object({
    first_name: z.string().min(1, "Nombre requerido").max(15, "Máximo 15 caracteres").regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras permitidas"),
    last_name: z.string().min(1, "Apellido requerido").max(15, "Máximo 15 caracteres").regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras permitidas"),
    phone: z.string().min(1, "Teléfono requerido").regex(/^\+56 9 \d{4} \d{4}$/, "Formato: +56 9 XXXX XXXX"),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TutorForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            phone: '+56 9 '
        }
    });

    useEffect(() => {
        if (isEdit) {
            api.get(`/tutors/${id}`).then(({ data }) => {
                reset(data);
            }).catch(() => {
                alert('Error al cargar tutor');
                navigate('/tutores');
            });
        }
    }, [id, isEdit, reset, navigate]);

    const onSubmit = async (data: FormData) => {
        try {
            if (isEdit) {
                await api.put(`/tutors/${id}`, data);
            } else {
                await api.post('/tutors/', {
                    ...data,
                    is_tutor: true,
                    is_client: false
                });
            }
            navigate('/tutores');
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                {isEdit ? 'Editar Tutor' : 'Nuevo Tutor'}
            </h1>

            <div className="bg-white rounded-xl shadow-sm border p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                            <input
                                {...register('first_name')}
                                maxLength={15}
                                onChange={(e) => setValue('first_name', capitalizeWords(cleanName(e.target.value)))}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                            {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                            <input
                                {...register('last_name')}
                                maxLength={15}
                                onChange={(e) => setValue('last_name', capitalizeWords(cleanName(e.target.value)))}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                            {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                        <input
                            {...register('phone')}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                setValue('phone', formatted);
                            }}
                            placeholder="+56 9 1234 5678"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            {...register('email')}
                            type="email"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>

                    {/* Address field removed as requested */}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/tutores')}
                            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-primary hover:opacity-90 text-white font-medium rounded-lg disabled:opacity-70"
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TutorForm;
