import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Mail, AlertCircle, ArrowRight, Eye, EyeOff, Lock, ArrowLeft, CheckCircle } from 'lucide-react';

// --- Validation Schemas ---
const loginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(1, "Contraseña requerida"),
});

const forgotSchema = z.object({
    email: z.string().email("Email inválido"),
});

const verifySchema = z.object({
    code: z.string().length(6, "El código debe tener 6 caracteres"),
});

const resetSchema = z.object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;
type VerifyForm = z.infer<typeof verifySchema>;
type ResetForm = z.infer<typeof resetSchema>;

type ViewState = 'login' | 'forgot' | 'verify' | 'reset' | 'success';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<ViewState>('login');
    const [emailForReset, setEmailForReset] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // --- Forms ---
    const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
    const forgotForm = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });
    const verifyForm = useForm<VerifyForm>({ resolver: zodResolver(verifySchema) });
    const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

    // --- Handlers ---
    const onLoginSubmit = async (data: LoginForm) => {
        try {
            setGlobalError(null);
            if (data.email.toLowerCase().trim() === 'demo@calfer.cl' && data.password.trim() === 'admin123') {
                console.log("Demo login triggered");
                await login('demo_token', 'demo_refresh');
                navigate('/dashboard');
                return;
            }

            const formData = new FormData();
            formData.append('username', data.email);
            formData.append('password', data.password);

            const response = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await login(response.data.access_token, response.data.refresh_token);

            if (response.data.show_notice) {
                navigate('/dashboard?unlockNotice=true');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error("Login error object:", err);

            if (err.code === 'ECONNABORTED' || !err.response) {
                setGlobalError(`No se pudo conectar con el servidor (${err.message || 'Error de Red'}). Revisa tu conexión.`);
                return;
            }

            const status = err.response.status;
            const data = err.response.data;
            let detail = data?.detail || "Error al iniciar sesión";

            // If detail is a validation array (FastAPI)
            if (Array.isArray(detail)) {
                detail = detail[0]?.msg || "Datos inválidos";
            }

            if (status === 429) {
                setGlobalError("Demasiados intentos. Por favor, espera un momento.");
            } else if (status === 403) {
                setGlobalError(detail);
            } else if (status === 401) {
                setGlobalError("Email o contraseña incorrectos");
            } else {
                setGlobalError(detail);
            }
        }
    };

    const onForgotSubmit = async (data: ForgotForm) => {
        try {
            setGlobalError(null);
            await api.post('/auth/forgot-password', data);
            setEmailForReset(data.email);
            setView('verify');
        } catch (err: any) {
            if (err.response?.status === 429) {
                setGlobalError("Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.");
            } else {
                setGlobalError(err.response?.data?.detail || "Error al enviar código");
            }
        }
    };

    const onVerifySubmit = async (data: VerifyForm) => {
        try {
            setGlobalError(null);
            await api.post('/auth/verify-reset-code', { email: emailForReset, code: data.code });
            setResetCode(data.code);
            setView('reset');
        } catch (err: any) {
            setGlobalError(err.response?.data?.detail || "Código inválido");
        }
    };

    const onResetSubmit = async (data: ResetForm) => {
        try {
            setGlobalError(null);
            await api.post('/auth/reset-password', {
                email: emailForReset,
                code: resetCode,
                new_password: data.password
            });
            setView('success');
        } catch (err: any) {
            setGlobalError(err.response?.data?.detail || "Error al restablecer contraseña");
        }
    };

    const goBack = () => {
        setGlobalError(null);
        setView('login');
    };

    return (
        <div
            className="min-h-screen flex items-center justify-end relative"
            style={{
                backgroundImage: `url(${import.meta.env.BASE_URL}img/logo_bg.png)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Content Container */}
            <div className="relative z-10 w-full h-full px-16 py-12 flex items-center justify-between">

                {/* Left Side - Logo Only */}
                <div className="flex-1 flex items-center justify-center -ml-48">
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-2xl border border-white/30 p-8">
                        <img src={`${import.meta.env.BASE_URL}img/logo_nombre.png`} alt="CalFer" className="w-56 h-auto object-contain drop-shadow-lg" />
                    </div>
                </div>

                {/* Right Side - Forms */}
                <div className="w-full max-w-md">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">

                        {/* Header based on View */}
                        <div className="mb-8">
                            {view !== 'login' && view !== 'success' && (
                                <button onClick={goBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4 text-sm font-medium">
                                    <ArrowLeft className="w-4 h-4" /> Volver
                                </button>
                            )}

                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {view === 'login' && "Iniciar Sesión"}
                                {view === 'forgot' && "Recuperar Contraseña"}
                                {view === 'verify' && "Verificar Código"}
                                {view === 'reset' && "Nueva Contraseña"}
                                {view === 'success' && "¡Contraseña Actualizada!"}
                            </h1>
                            <p className="text-gray-500">
                                {view === 'login' && "Ingresa tus credenciales para acceder al panel."}
                                {view === 'forgot' && "Ingresa tu email para recibir un código de verificación."}
                                {view === 'verify' && `Hemos enviado un código a ${emailForReset}. Ingresa los 6 dígitos.`}
                                {view === 'reset' && "Crea una nueva contraseña segura para tu cuenta."}
                                {view === 'success' && "Tu contraseña ha sido restablecida exitosamente."}
                            </p>
                        </div>

                        {globalError && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{globalError}</span>
                            </div>
                        )}

                        {/* LOGIN FORM */}
                        {view === 'login' && (
                            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 block">Email</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <input
                                            {...loginForm.register('email')}
                                            type="email"
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="nombre@ejemplo.com"
                                        />
                                    </div>
                                    {loginForm.formState.errors.email && <p className="text-red-500 text-xs">{loginForm.formState.errors.email.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 block">Contraseña</label>
                                    <div className="relative group">
                                        <input
                                            {...loginForm.register('password')}
                                            type={showPassword ? "text" : "password"}
                                            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {loginForm.formState.errors.password && <p className="text-red-500 text-xs">{loginForm.formState.errors.password.message}</p>}
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                                    <label className="flex items-center text-gray-500 hover:text-gray-700 cursor-pointer">
                                        <input type="checkbox" className="mr-2 rounded border-gray-300 text-primary focus:ring-primary" />
                                        Recordarme
                                    </label>
                                    <button type="button" onClick={() => setView('forgot')} className="text-primary hover:underline font-medium text-left sm:text-right">
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loginForm.formState.isSubmitting}
                                    className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                                >
                                    {loginForm.formState.isSubmitting ? 'Ingresando...' : 'Acceder al Sistema'}
                                    {!loginForm.formState.isSubmitting && <ArrowRight className="w-5 h-5" />}
                                </button>

                                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                    <p className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-2">
                                        <AlertCircle size={14} /> Acceso para Demostración
                                    </p>
                                    <div className="space-y-1 text-xs text-blue-600">
                                        <p><strong>Email:</strong> demo@calfer.cl</p>
                                        <p><strong>Clave:</strong> admin123</p>
                                        <p className="mt-2 text-[10px] opacity-70">Nota: Este acceso simula un Administrador para vista en GitHub Pages.</p>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* FORGOT PASSWORD FORM */}
                        {view === 'forgot' && (
                            <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 block">Email Registrado</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <input
                                            {...forgotForm.register('email')}
                                            type="email"
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="nombre@ejemplo.com"
                                        />
                                    </div>
                                    {forgotForm.formState.errors.email && <p className="text-red-500 text-xs">{forgotForm.formState.errors.email.message}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={forgotForm.formState.isSubmitting}
                                    className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {forgotForm.formState.isSubmitting ? 'Enviando...' : 'Enviar Código'}
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </form>
                        )}

                        {/* VERIFY CODE FORM */}
                        {view === 'verify' && (
                            <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 block">Código de Verificación</label>
                                    <input
                                        {...verifyForm.register('code')}
                                        type="text"
                                        maxLength={6}
                                        className="w-full text-center tracking-[1em] font-mono text-lg py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase"
                                        placeholder="ERROR"
                                    />
                                    {verifyForm.formState.errors.code && <p className="text-red-500 text-xs text-center">{verifyForm.formState.errors.code.message}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={verifyForm.formState.isSubmitting}
                                    className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {verifyForm.formState.isSubmitting ? 'Verificando...' : 'Verificar Código'}
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </form>
                        )}

                        {/* RESET PASSWORD FORM */}
                        {view === 'reset' && (
                            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 block">Nueva Contraseña</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            {...resetForm.register('password')}
                                            type="password"
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="Min. 6 caracteres"
                                        />
                                    </div>
                                    {resetForm.formState.errors.password && <p className="text-red-500 text-xs">{resetForm.formState.errors.password.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 block">Confirmar Contraseña</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            {...resetForm.register('confirmPassword')}
                                            type="password"
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="Repite la contraseña"
                                        />
                                    </div>
                                    {resetForm.formState.errors.confirmPassword && <p className="text-red-500 text-xs">{resetForm.formState.errors.confirmPassword.message}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={resetForm.formState.isSubmitting}
                                    className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {resetForm.formState.isSubmitting ? 'Guardando...' : 'Cambiar Contraseña'}
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </form>
                        )}

                        {/* SUCCESS VIEW */}
                        {view === 'success' && (
                            <div className="text-center py-8">
                                <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">¡Todo listo!</h3>
                                <p className="text-gray-500 mb-8">
                                    Tu contraseña ha sido actualizada correctamente. Ahora puedes iniciar sesión con tus nuevas credenciales.
                                </p>
                                <button
                                    onClick={() => setView('login')}
                                    className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/30"
                                >
                                    Volver al Inicio de Sesión
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div >
    );
};

export default Login;
