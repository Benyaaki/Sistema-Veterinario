import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { DogBreeds } from '../../data/dogBreeds';

// Schema with refinement for conditional validation
const schema = z.object({
    name: z.string().min(1, "Nombre requerido"),
    species: z.string().min(1, "Especie requerida"), // Changed to generic string to support "Otro" logic better if needed, but keeping enum values in UI
    custom_species: z.string().optional(),
    breed: z.string().optional(),
    sex: z.string().min(1, "Sexo requerido"),
    color: z.string().min(1, "Color requerido"),
    birth_date: z.string().optional(),
    weight: z.coerce.number().optional(),
    allergies: z.string().optional(),
    notes: z.string().optional(),
    tutor_id: z.string().min(1, "Tutor es obligatorio"),
    tutor2_id: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.species === 'Otro') {
        if (!data.custom_species || data.custom_species.length < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['custom_species'],
                message: "Especifique la especie",
            });
        }
    } else {
        if (!data.breed || data.breed.length < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['breed'],
                message: "Raza requerida",
            });
        }
    }
});

type PatientFormData = z.infer<typeof schema>;

const PatientForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id && id !== 'crear';
    const [tutors, setTutors] = useState<any[]>([]);
    const [isCustomColor, setIsCustomColor] = useState(false);

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PatientFormData>({
        // @ts-ignore
        resolver: zodResolver(schema),
    });

    const selectedSpecies = watch('species');
    const selectedBreed = watch('breed');

    // Derived lists
    const breedList = selectedSpecies === 'Perro' ? Object.keys(DogBreeds).sort() : [];
    const colorList = (selectedSpecies === 'Perro' && selectedBreed && DogBreeds[selectedBreed])
        ? DogBreeds[selectedBreed]
        : [];

    useEffect(() => {
        api.get('/tutors?limit=100').then(({ data }) => setTutors(data));

        if (isEdit) {
            api.get(`/patients/${id}`).then(({ data }) => {
                // Populate form
                setValue('name', data.name);

                // Handle "Other" species logic for edit mode if saved differently? 
                // Assuming backend saves "Other" as species and specific in another field? 
                // OR saves the specific name as species?
                // Let's assume standard behavior for now:
                if (data.species !== 'Perro' && data.species !== 'Gato') {
                    setValue('species', 'Otro');
                    setValue('custom_species', data.species); // If previously saved as specfic string
                } else {
                    setValue('species', data.species);
                }

                setValue('breed', data.breed);
                setValue('sex', data.sex);
                setValue('color', data.color);
                setValue('birth_date', data.birth_date ? data.birth_date.split('T')[0] : '');
                setValue('weight', data.weight);
                setValue('allergies', data.allergies);
                setValue('notes', data.notes);
                setValue('tutor_id', data.tutor_id);
                setValue('tutor2_id', data.tutor2_id);
            }).catch(console.error);
        }
    }, [isEdit, id, setValue]);

    const onSubmit = async (data: PatientFormData) => {
        try {
            // If species is 'Otro', use custom_species as the actual species value sent to backend?
            // Or keep 'Otro' and add a new field? 
            // The prompt implies "write what species it is".
            // Implementation: We will send `species` as the custom text if it was 'Otro'.

            const finalSpecies = data.species === 'Otro' ? data.custom_species : data.species;

            const payload = {
                ...data,
                species: finalSpecies,
                tutor2_id: data.tutor2_id || null,
                weight: Number(data.weight) || 0
            };

            if (isEdit) {
                await api.put(`/patients/${id}`, payload);
            } else {
                await api.post('/patients', payload);
            }
            navigate('/pacientes');
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Editar Paciente' : 'Nuevo Paciente'}</h1>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">

                    {/* Basic Info */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Datos del Paciente</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Nombre *</label>
                                <input {...register('name')} className="input" />
                                {errors.name && <span className="error">{errors.name.message}</span>}
                            </div>

                            <div>
                                <label className="label">Especie *</label>
                                <select {...register('species')} className="input" onChange={(e) => {
                                    setValue('species', e.target.value as any);
                                    setValue('breed', ''); // Reset breed
                                    setValue('color', '');
                                    setValue('custom_species', ''); // Reset custom
                                    setIsCustomColor(false);
                                }}>
                                    <option value="Perro">Perro</option>
                                    <option value="Gato">Gato</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>

                            {/* Conditional Inputs based on Species */}
                            {selectedSpecies === 'Otro' ? (
                                <>
                                    <div>
                                        <label className="label">Especifique Especie *</label>
                                        <input {...register('custom_species')} className="input" placeholder="Ej. Conejo, Hamster..." />
                                        {errors.custom_species && <span className="error">{errors.custom_species.message}</span>}
                                    </div>
                                    <div>
                                        <label className="label">Raza (Opcional)</label>
                                        <input {...register('breed')} className="input" placeholder="Raza o tipo" />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="label">Raza *</label>
                                    {selectedSpecies === 'Perro' ? (
                                        <select {...register('breed')} className="input" onChange={(e) => {
                                            setValue('breed', e.target.value);
                                            setValue('color', '');
                                            setIsCustomColor(false);
                                        }}>
                                            <option value="">Seleccionar Raza...</option>
                                            {breedList.map(breed => (
                                                <option key={breed} value={breed}>{breed}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input {...register('breed')} className="input" placeholder="Ej. Siames / Común" />
                                    )}
                                    {errors.breed && <span className="error">{errors.breed.message}</span>}
                                </div>
                            )}

                            <div>
                                <label className="label">Sexo *</label>
                                <select {...register('sex')} className="input">
                                    <option value="Macho">Macho</option>
                                    <option value="Hembra">Hembra</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Color *</label>
                                {!isCustomColor && colorList.length > 0 ? (
                                    <select
                                        {...register('color')}
                                        className="input"
                                        onChange={(e) => {
                                            if (e.target.value === 'CUSTOM_COLOR') {
                                                setIsCustomColor(true);
                                                setValue('color', '');
                                            } else {
                                                setValue('color', e.target.value);
                                            }
                                        }}
                                    >
                                        <option value="">Seleccionar Color...</option>
                                        {colorList.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                        <option value="CUSTOM_COLOR" className="font-bold text-blue-600">+ Otro (Escribir manual)</option>
                                    </select>
                                ) : (
                                    <div className="flex space-x-2">
                                        <input {...register('color')} className="input" placeholder="Especifique color" autoFocus={isCustomColor} />
                                        {colorList.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setIsCustomColor(false)}
                                                className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                                            >
                                                Ver lista
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="label">Fecha Nacimiento</label>
                                <input
                                    type="date"
                                    max={new Date().toISOString().split('T')[0]}
                                    min="1990-01-01"
                                    {...register('birth_date')}
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="label">Peso (kg)</label>
                                <input type="number" step="0.1" {...register('weight')} className="input" />
                            </div>
                        </div>
                    </div>

                    {/* Tutors */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Tutores</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Tutor Principal *</label>
                                <select {...register('tutor_id')} className="input">
                                    <option value="">Seleccionar Tutor...</option>
                                    {tutors.map(t => (
                                        <option key={t._id} value={t._id}>{t.full_name} - {t.phone}</option>
                                    ))}
                                </select>
                                {errors.tutor_id && <span className="error">{errors.tutor_id.message}</span>}
                                <div className="text-xs text-right mt-1">
                                    <a href="/tutores/crear" target="_blank" className="text-primary hover:underline">Crear nuevo tutor</a>
                                </div>
                            </div>
                            <div>
                                <label className="label">Tutor Secundario</label>
                                <select {...register('tutor2_id')} className="input">
                                    <option value="">Ninguno</option>
                                    {tutors.map(t => (
                                        <option key={t._id} value={t._id}>{t.full_name} - {t.phone}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Medical Info */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Médica</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="label">Alergias</label>
                                <input {...register('allergies')} className="input" placeholder="Ninguna conocida" />
                            </div>
                            <div>
                                <label className="label">Notas Generales</label>
                                <textarea {...register('notes')} className="input" rows={3} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button type="button" onClick={() => navigate('/pacientes')} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Guardar Paciente</button>
                    </div>

                </form>
            </div>

            <style>{`
                .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
                .input { width: 100%; padding: 0.5rem 1rem; border: 1px solid #E5E7EB; border-radius: 0.5rem; outline: none; transition: all; }
                .input:focus { ring: 2px; ring-color: #4FA3A1; border-color: #4FA3A1; }
                .error { color: #D98FA6; font-size: 0.75rem; margin-top: 0.25rem; display: block; }
                .btn-primary { padding: 0.5rem 1.5rem; background-color: #4FA3A1; color: white; font-weight: 500; border-radius: 0.5rem; transition: background-color 0.2s; }
                .btn-primary:hover { opacity: 0.9; }
                .btn-secondary { padding: 0.5rem 1.5rem; color: #374151; font-weight: 500; border-radius: 0.5rem; transition: background-color 0.2s; }
                .btn-secondary:hover { background-color: #E6F2F3; }
            `}</style>
        </div>
    );
};

export default PatientForm;
