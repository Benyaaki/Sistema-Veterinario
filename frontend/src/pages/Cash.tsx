import React, { useState, useEffect } from 'react';
import { useBranch } from '../context/BranchContext';
import api from '../api/axios';
import {
    Wallet, Lock, Unlock, DollarSign,
    CreditCard, Landmark,
    TrendingUp, AlertCircle, RefreshCw
} from 'lucide-react';

const DENOMINATIONS = ["20000", "10000", "5000", "2000", "1000", "500", "100", "50", "10"];

interface Session {
    _id: string;
    id: string;
    status: 'OPEN' | 'CLOSED';
    opening_balance: number;
    opening_denominations: Record<string, number>;
    closing_balance_expected: number;
    sales_cash: number;
    sales_transfer: number;
    sales_debit: number;
    sales_credit: number;
    sales_debt: number;
    opened_at: string;
}

const Cash = () => {
    const { currentBranch } = useBranch();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<Session | null>(null);
    const [isOpening, setIsOpening] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Forms
    const [openingForm, setOpeningForm] = useState({
        balance: 0,
        denominations: {} as Record<string, number>
    });
    const [closingForm, setClosingForm] = useState({
        balance_real: 0,
        denominations: {} as Record<string, number>,
        manual_transbank: 0,
        manual_withdrawals: 0,
        manual_expenses: 0,
        manual_other_day_cash: 0,
        manual_other_day_transbank: 0
    });

    useEffect(() => {
        loadCurrentSession();
    }, [currentBranch]);

    const loadCurrentSession = async () => {
        if (!currentBranch) {
            setLoading(false);
            setSession(null);
            return;
        }
        setLoading(true);
        try {
            const branchId = currentBranch._id || currentBranch.id;
            const res = await api.get(`/cash/current?branch_id=${branchId}`);
            setSession(res.data);

            if (res.data) {
                setClosingForm(prev => ({
                    ...prev,
                    denominations: res.data.opening_denominations || {}
                }));
            }
        } catch (e) {
            console.error(e);
            setSession(null);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSession = async () => {
        if (!currentBranch) return;
        try {
            const branchId = currentBranch._id || currentBranch.id;
            const res = await api.post('/cash/open', {
                branch_id: branchId,
                opening_balance: openingForm.balance,
                opening_denominations: openingForm.denominations
            });
            setSession(res.data);
            setIsOpening(false);
        } catch (e) {
            alert("Error al abrir caja");
        }
    };

    const handleCloseSession = async () => {
        if (!session) return;
        try {
            const res = await api.post(`/cash/close/${session._id || session.id}`, closingForm);
            setSession(res.data);
            setIsClosing(false);
            alert("Venta cerrada exitosamente");
        } catch (e) {
            alert("Error al cerrar caja");
        }
    };

    const calculateBalanceFromDenominations = (denoms: Record<string, number>) => {
        return Object.entries(denoms).reduce((acc, [val, qty]) => acc + (parseInt(val) * (qty || 0)), 0);
    };

    const formatDateTime = (dateStr: string) => {
        try {
            // Ensure ISO format for consistent parsing
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Hora inválida';

            return date.toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (e) {
            return 'Error hora';
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando estado de caja...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Wallet className="text-blue-500" size={32} />
                        Gestión de Caja
                    </h1>
                    <p className="text-gray-500 mt-1">Control diario de ingresos y egresos de efectivo</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadCurrentSession}
                        disabled={loading}
                        className={`p-2 rounded-lg transition-all ${loading ? 'bg-gray-100 text-gray-400' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
                        title="Actualizar datos"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {session?.status === 'OPEN' && (
                        <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full border border-green-200">
                            <Unlock size={18} />
                            <span className="font-bold">Caja Abierta</span>
                        </div>
                    )}
                </div>
            </div>

            {!session ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                        <Lock size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">La caja está cerrada</h2>
                    <p className="text-gray-500 mb-8">Debe realizar la apertura inicial para comenzar a registrar ventas.</p>
                    <button
                        onClick={() => setIsOpening(true)}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200"
                    >
                        Abrir Caja Ahora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Summary Statistics */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <StatBox
                                title="Balance Esperado"
                                value={`$${session.closing_balance_expected?.toLocaleString() || '-'}`}
                                subtitle="Efectivo en caja proyectado"
                                icon={<TrendingUp className="text-blue-500" />}
                            />
                            <StatBox
                                title="Ventas Totales"
                                value={`$${(session.sales_cash + session.sales_transfer + session.sales_debit + session.sales_credit).toLocaleString()}`}
                                subtitle="Suma de todos los medios de pago"
                                icon={<DollarSign className="text-green-500" />}
                            />
                        </div>

                        {/* Totals by Method */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h3 className="font-bold text-gray-800 mb-4">Ventas por Medio de Pago</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <MethodBox label="Efectivo" value={session.sales_cash} icon={<DollarSign size={16} />} color="text-green-600" />
                                <MethodBox label="Transferencia" value={session.sales_transfer} icon={<Landmark size={16} />} color="text-purple-600" />
                                <MethodBox label="Débito" value={session.sales_debit} icon={<CreditCard size={16} />} color="text-blue-600" />
                                <MethodBox label="Crédito" value={session.sales_credit} icon={<CreditCard size={16} />} color="text-indigo-600" />
                                <MethodBox label="Fiado/Deuda" value={session.sales_debt} icon={<AlertCircle size={16} />} color="text-red-600" />
                            </div>
                        </div>

                        {/* Recent History or Log */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                                Movimientos de Sesión
                                <span className="text-xs font-normal text-gray-400">
                                    Iniciada: {session.opened_at ? formatDateTime(session.opened_at) : 'No definida'}
                                </span>
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm">
                                    <span className="text-gray-600">Apertura Inicial</span>
                                    <span className="font-bold text-blue-600">+${session.opening_balance.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm">
                                    <span className="text-gray-600">Total Efectivo Ventas</span>
                                    <span className="font-bold text-green-600">+${session.sales_cash.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions Column */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-blue-500">
                            <h4 className="font-bold text-gray-800 mb-2">Acciones Rápidas</h4>
                            <p className="text-xs text-gray-500 mb-4">Registre retiros o gastos manuales para el cuadre final.</p>
                            <button
                                onClick={() => setIsClosing(true)}
                                className="w-full bg-gray-800 text-white font-bold py-3 rounded-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                            >
                                <Lock size={18} />
                                Cerrar Caja del Día
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Opening Modal */}
            {isOpening && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 bg-blue-600 text-white">
                            <h2 className="text-xl font-bold">Apertura de Caja</h2>
                            <p className="text-blue-100 text-sm">Ingrese el efectivo inicial disponible</p>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-4">Desglose de Monedas/Billetes</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {DENOMINATIONS.map(d => (
                                        <div key={d} className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold mb-1">${parseInt(d).toLocaleString()}</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={openingForm.denominations[d] || ''}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const newDenoms = { ...openingForm.denominations, [d]: val };
                                                    const total = calculateBalanceFromDenominations(newDenoms);
                                                    setOpeningForm({ denominations: newDenoms, balance: total });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                                <span className="font-bold text-blue-800">Total Calculado:</span>
                                <span className="text-2xl font-black text-blue-600">${openingForm.balance.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex gap-3 border-t">
                            <button
                                onClick={() => setIsOpening(false)}
                                className="flex-1 py-3 text-gray-500 font-bold hover:text-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleOpenSession}
                                className="flex-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                            >
                                Confirmar Apertura
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Closing Modal */}
            {isClosing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 bg-gray-800 text-white">
                            <h2 className="text-xl font-bold">Cierre de Caja</h2>
                            <p className="text-gray-400 text-sm">Realice el conteo final y declare otros movimientos</p>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-8">
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2">
                                    <DollarSign size={18} className="text-green-500" />
                                    Conteo de Efectivo
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {DENOMINATIONS.map(d => (
                                        <div key={d} className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold mb-1">${parseInt(d).toLocaleString()}</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={closingForm.denominations[d] || ''}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const newDenoms = { ...closingForm.denominations, [d]: val };
                                                    const total = calculateBalanceFromDenominations(newDenoms);
                                                    setClosingForm(prev => ({ ...prev, denominations: newDenoms, balance_real: total }));
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2">
                                        <Landmark size={18} className="text-purple-500" />
                                        Transbank / Otros
                                    </h4>
                                    <div className="space-y-3">
                                        <ManualInput label="Total Transbank (Voucher)" value={closingForm.manual_transbank} onChange={(v: number) => setClosingForm((prev: any) => ({ ...prev, manual_transbank: v }))} />
                                        <ManualInput label="Sencillo día anterior" value={closingForm.manual_other_day_cash} onChange={(v: number) => setClosingForm((prev: any) => ({ ...prev, manual_other_day_cash: v }))} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2">
                                        <AlertCircle size={18} className="text-red-500" />
                                        Egresos/Retiros
                                    </h4>
                                    <div className="space-y-3">
                                        <ManualInput label="Gastos varios" value={closingForm.manual_expenses} onChange={(v: number) => setClosingForm((prev: any) => ({ ...prev, manual_expenses: v }))} color="red" />
                                        <ManualInput label="Retiros de efectivo" value={closingForm.manual_withdrawals} onChange={(v: number) => setClosingForm((prev: any) => ({ ...prev, manual_withdrawals: v }))} color="red" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-800 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <p className="text-gray-400 text-sm">Diferencia de Cuadre</p>
                                    <p className={`text-3xl font-black ${(closingForm.balance_real - (session?.closing_balance_expected || 0)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${(closingForm.balance_real - (session?.closing_balance_expected || 0)).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 text-sm">Total Efectivo Declarado</p>
                                    <p className="text-3xl font-black">${closingForm.balance_real.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex gap-3 border-t mt-auto">
                            <button
                                onClick={() => setIsClosing(false)}
                                className="flex-1 py-3 text-gray-500 font-bold hover:text-gray-700"
                            >
                                Regresar
                            </button>
                            <button
                                onClick={handleCloseSession}
                                className="flex-2 bg-gray-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-900 transition-all shadow-xl"
                            >
                                Finalizar y Cerrar Caja
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface StatBoxProps {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
}

const StatBox = ({ title, value, subtitle, icon }: StatBoxProps) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
        <div className="p-3 bg-gray-50 rounded-xl">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <h4 className="text-2xl font-bold text-gray-900 my-1">{value}</h4>
            <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
    </div>
);

interface MethodBoxProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
}

const MethodBox = ({ label, value, icon, color }: MethodBoxProps) => (
    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 mb-1">
            <span className={color}>{icon}</span>
            <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
        </div>
        <p className="text-lg font-bold text-gray-800">${value.toLocaleString()}</p>
    </div>
);

interface ManualInputProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    color?: string;
}

const ManualInput = ({ label, value, onChange, color = "blue" }: ManualInputProps) => (
    <div>
        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">{label}</label>
        <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 font-bold">$</span>
            <input
                type="number"
                className={`w-full pl-6 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-${color}-500 outline-none`}
                value={value || ''}
                onChange={e => onChange(parseFloat(e.target.value) || 0)}
            />
        </div>
    </div>
);

export default Cash;
