import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Upload, Plus, Trash, Settings as SettingsIcon, Users, Calendar, Mail, Stethoscope } from 'lucide-react';

/* --- Sub-Components --- */

const TabButton = ({ id, icon: Icon, label, active, set }: any) => (
    <button
        onClick={() => set(id)}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
            ${active ? 'bg-white text-primary shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        `}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-secondary' : 'text-gray-400'}`} />
        <span>{label}</span>
    </button>
);

const GeneralSettings = ({ user }: any) => {
    const { register, handleSubmit, reset } = useForm();
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/settings').then(({ data }) => reset(data));
    }, [reset]);

    const onSubmit = async (data: any) => {
        setSaving(true);
        try {
            await api.put('/settings', data);
            if (signatureFile) {
                const formData = new FormData();
                formData.append('file', signatureFile);
                await api.post('/settings/signature', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            alert('Ajustes guardados');
        } catch {
            alert('Error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Información General</h2>
            <div className="space-y-4">
                <div>
                    <label className="label">Nombre Clínica</label>
                    <input {...register('clinic_name')} className="input" />
                </div>
                <div>
                    <label className="label">Dirección</label>
                    <input {...register('address')} className="input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label">Teléfono</label>
                        <input {...register('phone')} className="input" />
                    </div>
                    <div>
                        <label className="label">Email</label>
                        <input {...register('email')} className="input" />
                    </div>
                </div>
                <div>
                    <label className="label">Ciudad</label>
                    <input {...register('city')} className="input" />
                </div>
            </div>

            <div className="pt-6 border-t space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Firma Digital</h3>
                <div className="flex items-center space-x-4">
                    <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center shadow-sm">
                        <Upload className="w-4 h-4 mr-2" />
                        {signatureFile ? 'Cambiar Archivo' : 'Subir Firma (Imagen)'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setSignatureFile(e.target.files?.[0] || null)} />
                    </label>
                    {signatureFile && <span className="text-sm text-green-600 font-medium">{signatureFile.name}</span>}
                    {!signatureFile && user?.signature_file_id && <span className="text-sm text-gray-500">Firma actual guardada</span>}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    );
};

const ServicesSettings = () => {
    const [services, setServices] = useState<any[]>([]);
    const { register, handleSubmit, reset } = useForm();

    const fetchServices = () => api.get('/services').then(({ data }) => setServices(data));

    useEffect(() => { fetchServices(); }, []);

    const onSubmit = async (data: any) => {
        await api.post('/services', { ...data, price: Number(data.price), category: 'General' });
        reset();
        fetchServices();
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar servicio?')) {
            await api.delete(`/services/${id}`);
            fetchServices();
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Servicios y Lista de Precios</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 p-4 rounded-lg flex gap-4 items-end">
                <div className="flex-1">
                    <label className="label">Nombre del Servicio</label>
                    <input {...register('name')} className="input" placeholder="Ej. Consulta General" required />
                </div>
                <div className="w-32">
                    <label className="label">Precio</label>
                    <input {...register('price')} type="number" className="input" placeholder="0" required />
                </div>
                <button type="submit" className="btn-primary h-[42px] aspect-square flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                </button>
            </form>

            <div className="space-y-2">
                {services.map(s => (
                    <div key={s._id} className="flex justify-between items-center p-3 bg-white border rounded-lg hover:shadow-sm">
                        <div>
                            <p className="font-medium text-gray-900">{s.name}</p>
                            <p className="text-sm text-gray-500">${s.price.toLocaleString()}</p>
                        </div>
                        <button onClick={() => handleDelete(s._id)} className="text-red-400 hover:text-red-600 p-2">
                            <Trash className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {services.length === 0 && <p className="text-center text-gray-400 py-4">No hay servicios registrados.</p>}
            </div>
        </div>
    );
};

const TemplatesSettings = () => {
    const { register, handleSubmit, setValue } = useForm();

    useEffect(() => {
        api.get('/settings').then(({ data }) => {
            if (data.email_templates) {
                setValue('appointment_confirmation', data.email_templates.appointment_confirmation);
            }
        });
    }, [setValue]);

    const onSubmit = async (data: any) => {
        const current = (await api.get('/settings')).data;
        await api.put('/settings', {
            ...current,
            email_templates: { ...current.email_templates, ...data }
        });
        alert('Plantilla guardada');
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Plantillas de Correo</h2>
            <div>
                <label className="label">Confirmación de Cita</label>
                <p className="text-xs text-gray-500 mb-2">Variables disponibles: {'{tutor_name}, {patient_name}, {date}, {reason}, {notes}'}</p>
                <textarea
                    {...register('appointment_confirmation')}
                    rows={10}
                    className="input font-mono text-sm"
                />
            </div>
            <div className="flex justify-end">
                <button type="submit" className="btn-primary">Guardar Plantilla</button>
            </div>
        </form>
    );
};

const ScheduleSettings = () => {
    const { register, handleSubmit, setValue } = useForm();
    const days = [
        { key: 'monday', label: 'Lunes' },
        { key: 'tuesday', label: 'Martes' },
        { key: 'wednesday', label: 'Miércoles' },
        { key: 'thursday', label: 'Jueves' },
        { key: 'friday', label: 'Viernes' },
        { key: 'saturday', label: 'Sábado' },
        { key: 'sunday', label: 'Domingo' },
    ];

    useEffect(() => {
        api.get('/settings').then(({ data }) => {
            if (data.schedule) {
                days.forEach(d => setValue(d.key, data.schedule[d.key] || '09:00-19:00'));
            }
        });
    }, [setValue]);

    const onSubmit = async (data: any) => {
        const current = (await api.get('/settings')).data;
        await api.put('/settings', { ...current, schedule: data });
        alert('Horario guardado');
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Horarios de Atención</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {days.map(day => (
                    <div key={day.key}>
                        <label className="label">{day.label}</label>
                        <input {...register(day.key)} className="input" placeholder="Ej. 09:00-19:00 o Cerrado" />
                    </div>
                ))}
            </div>
            <div className="flex justify-end pt-4">
                <button type="submit" className="btn-primary">Guardar Horario</button>
            </div>
        </form>
    );
};

const UsersSettings = ({ currentUser }: any) => {
    const [users, setUsers] = useState<any[]>([]);
    const { register, handleSubmit, reset } = useForm();

    const fetchUsers = () => api.get('/auth/users').then(({ data }) => setUsers(data));
    useEffect(() => { fetchUsers(); }, []);

    const onSubmit = async (data: any) => {
        try {
            await api.post('/auth/register', data);
            reset();
            fetchUsers();
            alert('Usuario creado');
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Error');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar usuario?')) {
            try {
                await api.delete(`/auth/users/${id}`);
                fetchUsers();
            } catch (e: any) {
                alert(e.response?.data?.detail);
            }
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Gestión de Usuarios</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-blue-50 p-6 rounded-xl border border-blue-100 space-y-4">
                <h3 className="font-semibold text-blue-900">Crear nuevo usuario</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input {...register('name')} className="input" placeholder="Nombre completo" required />
                    <input {...register('email')} type="email" className="input" placeholder="Email" required />
                    <input {...register('password')} type="password" className="input" placeholder="Contraseña" required />
                    <select {...register('role')} className="input">
                        <option value="assistant">Asistente</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>
                <div className="flex justify-end">
                    <button type="submit" className="btn-primary bg-blue-600 hover:bg-blue-700">Crear Usuario</button>
                </div>
            </form>

            <div className="space-y-3">
                <h3 className="font-medium text-gray-700">Usuarios Existentes</h3>
                {users.map(u => (
                    <div key={u.id} className="flex justify-between items-center p-4 bg-white border rounded-lg shadow-sm">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">
                                {u.name[0]}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{u.name} {u.id === currentUser?.id && '(Tú)'}</p>
                                <p className="text-sm text-gray-500">{u.email} • <span className="capitalize">{u.role}</span></p>
                            </div>
                        </div>
                        {u.id !== currentUser?.id && (
                            <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ... (previous code) ... */

const ImportSettings = () => {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [mode, setMode] = useState<'full' | 'tutor'>('full');

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setImporting(true);
        setResult(null);
        try {
            const { data } = await api.post('/import/csv', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(data);
            alert('Importación completada');
            setFile(null);
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Error en la importación');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        let headers: string[] = [];
        let rows: string[][] = [];

        if (mode === 'full') {
            headers = ['tutor_email', 'tutor_name', 'tutor_phone', 'patient_name', 'species', 'breed', 'sex', 'color'];
            rows = [
                ['ejemplo@email.com', 'Juan Pérez', '555-1234', 'Firulais', 'Perro', 'Labrador', 'Macho', 'Negro'],
                ['ejemplo@email.com', 'Juan Pérez', '555-1234', 'Michi', 'Gato', 'Siamés', 'Hembra', 'Blanco'],
            ];
        } else {
            headers = ['tutor_email', 'tutor_name', 'tutor_phone'];
            rows = [
                ['juan@email.com', 'Juan Pérez', '555-1234'],
                ['maria@email.com', 'María Gómez', '555-9876'],
            ];
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Add BOM for Excel compatibility with UTF-8
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `plantilla_${mode}_pattyvet.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-xl font-bold text-gray-800">Importar Datos Masivos</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setMode('full')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'full' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Completo (Tutores + Mascotas)
                    </button>
                    <button
                        onClick={() => setMode('tutor')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'tutor' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Solo Tutores
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleDownloadTemplate}
                    className="text-primary hover:text-blue-700 text-sm font-medium flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <Upload className="w-4 h-4 rotate-180" />
                    {mode === 'full' ? 'Descargar Plantilla Completa' : 'Descargar Plantilla Tutores'}
                </button>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 mb-6">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <div className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">i</div>
                    Instrucciones del CSV
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-blue-800">
                        <thead className="text-xs text-blue-900 uppercase bg-blue-100 border-b border-blue-200">
                            <tr>
                                <th className="px-4 py-2 rounded-tl-lg">Columna</th>
                                <th className="px-4 py-2">Requerido</th>
                                <th className="px-4 py-2 rounded-tr-lg">Descripción</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-white/50 border-b border-blue-100">
                                <td className="px-4 py-2 font-mono font-medium">tutor_email</td>
                                <td className="px-4 py-2 font-bold text-red-600">SÍ</td>
                                <td className="px-4 py-2">Identificador único. Si existe, agrega la mascota; si no, crea el tutor.</td>
                            </tr>
                            <tr className="bg-white/50 border-b border-blue-100">
                                <td className="px-4 py-2 font-mono font-medium">tutor_name</td>
                                <td className="px-4 py-2 text-yellow-600">Si es nuevo</td>
                                <td className="px-4 py-2">Nombre completo del tutor.</td>
                            </tr>
                            {mode === 'full' && (
                                <>
                                    <tr className="bg-white/50 border-b border-blue-100">
                                        <td className="px-4 py-2 font-mono font-medium">patient_name</td>
                                        <td className="px-4 py-2 font-bold text-red-600">SÍ</td>
                                        <td className="px-4 py-2">Nombre de la mascota.</td>
                                    </tr>
                                    <tr className="bg-white/50 border-b border-blue-100">
                                        <td className="px-4 py-2 font-mono font-medium">species</td>
                                        <td className="px-4 py-2 font-bold text-red-600">SÍ</td>
                                        <td className="px-4 py-2">Ej: Perro, Gato, Conejo, etc.</td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <form onSubmit={handleImport} className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-white transition-colors">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-12 h-12 text-gray-400 mb-3" />
                        <span className="text-gray-700 font-medium text-lg">
                            {file ? file.name : 'Click para seleccionar archivo CSV'}
                        </span>
                        <span className="text-sm text-gray-500 mt-1">.csv (UTF-8)</span>
                    </label>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!file || importing}
                        className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {importing ? 'Procesando...' : 'Iniciar Importación'}
                    </button>
                </div>
            </form>

            {result && (
                <div className="mt-8 bg-white border rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Resultado de Importación</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-700">{result.tutors_created}</div>
                            <div className="text-xs text-green-600 font-medium">Tutores Creados</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-700">{result.tutors_updated}</div>
                            <div className="text-xs text-blue-600 font-medium">Tutores Actualizados</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-700">{result.patients_created}</div>
                            <div className="text-xs text-purple-600 font-medium">Pacientes Creados</div>
                        </div>
                    </div>

                    {result.errors && result.errors.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-semibold text-red-700 mb-2">Errores ({result.errors.length})</h4>
                            <div className="bg-red-50 p-3 rounded-lg border border-red-100 max-h-40 overflow-y-auto">
                                <ul className="list-disc list-inside text-xs text-red-600 space-y-1">
                                    {result.errors.map((err: string, i: number) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* --- Main Component --- */

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="mb-6 flex items-center">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <SettingsIcon className="mr-3 text-secondary" />
                    Ajustes de Veterinaria
                </h1>
            </div>

            <div className="bg-white rounded-xl shadow-lg border overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-gray-50 border-r border-gray-100 flex-shrink-0">
                    <nav className="p-4 space-y-1">
                        <TabButton id="general" icon={SettingsIcon} label="General" active={activeTab} set={setActiveTab} />
                        <TabButton id="services" icon={Stethoscope} label="Servicios y Precios" active={activeTab} set={setActiveTab} />
                        <TabButton id="templates" icon={Mail} label="Plantillas de Correo" active={activeTab} set={setActiveTab} />
                        <TabButton id="schedule" icon={Calendar} label="Horarios" active={activeTab} set={setActiveTab} />
                        <TabButton id="users" icon={Users} label="Usuarios y Acceso" active={activeTab} set={setActiveTab} />
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                    {activeTab === 'general' && <GeneralSettings user={user} />}
                    {activeTab === 'services' && <ServicesSettings />}
                    {activeTab === 'templates' && <TemplatesSettings />}
                    {activeTab === 'schedule' && <ScheduleSettings />}
                    {activeTab === 'users' && <UsersSettings currentUser={user} />}
                </div>
            </div>

            <style>{`
                .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
                .input { width: 100%; padding: 0.5rem 1rem; border: 1px solid #E5E7EB; border-radius: 0.5rem; outline: none; transition: all; }
                .input:focus { box-shadow: 0 0 0 2px #4FA3A1; border-color: #4FA3A1; }
                .btn-primary { padding: 0.5rem 1.5rem; background-color: #4FA3A1; color: white; font-weight: 500; border-radius: 0.5rem; transition: background-color 0.2s; }
                .btn-primary:hover { opacity: 0.9; }
            `}</style>
        </div>
    );
};

export default Settings;
