import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

const schema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(1, "Contraseña requerida"),
});

type FormData = z.infer<typeof schema>;

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        try {
            setError(null);
            const formData = new FormData();
            formData.append('username', data.email);
            formData.append('password', data.password);

            const response = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'multipart/form-data' } // OAuth2 expects form data
            });

            await login(response.data.access_token);
            navigate('/dashboard');
        } catch (err: any) {
            console.error("Login error", err);
            setError(err.response?.data?.detail || "Error al iniciar sesión");
        }
    };

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side - Image Placeholder / Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-60"
                    style={{ backgroundImage: "url('/img/login_bg.png')" }}
                ></div>
                <div className="relative z-10 w-full flex flex-col justify-center items-center text-white p-12 text-center">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/20">
                        <span className="text-4xl font-bold">P</span>
                    </div>
                    <h2 className="text-4xl font-bold mb-4">Bienvenido a PattyVet</h2>
                    <p className="text-lg text-gray-200 max-w-md">
                        Gestión veterinaria profesional, simplificada para el cuidado de tus pacientes.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-center mb-8 lg:text-left">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Iniciar Sesión</h1>
                        <p className="text-gray-500">
                            Ingresa tus credenciales para acceder al panel.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">Email</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="nombre@ejemplo.com"
                                />
                            </div>
                            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    {...register('password')}
                                    type="password"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center text-gray-500 hover:text-gray-700 cursor-pointer">
                                <input type="checkbox" className="mr-2 rounded border-gray-300 text-primary focus:ring-primary" />
                                Recordarme
                            </label>
                            <a href="#" className="text-primary hover:underline font-medium">¿Olvidaste tu contraseña?</a>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                        >
                            {isSubmitting ? 'Ingresando...' : 'Acceder al Sistema'}
                            {!isSubmitting && <ArrowRight className="w-5 h-5" />}
                        </button>

                        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400">
                                Default: admin@paty.vet / admin
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
