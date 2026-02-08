import React, { useState, useEffect } from 'react';
import { useBranch } from '../context/BranchContext';
import api from '../api/axios';
import {
    Wallet, Lock, Unlock, DollarSign,
    CreditCard, Landmark,
    TrendingUp, Clock, AlertCircle, RefreshCw, FileText,
    Users, ArrowRight, Calendar, Download
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
    const [isHandover, setIsHandover] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);

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
        manual_other_day_transbank: 0,
        manual_debt: 0,
        manual_transfer: 0,
        manual_next_day_cash: 0,
        handover_to_user_id: '',
        handover_denominations: {} as Record<string, number>
    });

    const [handoverForm, setHandoverForm] = useState({
        denominations: {} as Record<string, number>,
        total: 0,
        targetUserId: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadCurrentSession();
        fetchEmployees();
    }, [currentBranch]);

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/users');
            setEmployees(res.data);
        } catch (e) {
            console.error("Error fetching employees:", e);
        }
    };

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

    const downloadReport = async (sessionId: string) => {
        try {
            const res = await api.get(`/cash/report/${sessionId}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_caja_${sessionId.slice(-6)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error("Error downloading PDF:", e);
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
            const sessionData = res.data;
            setSession(sessionData);
            setIsOpening(false);

            // Download PDF
            await downloadReport(sessionData._id || sessionData.id);
        } catch (e) {
            alert("Error al abrir caja");
        }
    };

    const handleCloseSession = async () => {
        if (!session) return;
        try {
            const dataToSubmit = {
                ...closingForm,
                closing_balance_real: closingForm.balance_real,
                manual_next_day_cash: handoverForm.total || closingForm.manual_next_day_cash,
                handover_to_user_id: handoverForm.targetUserId || null,
                handover_denominations: handoverForm.denominations,
                handover_date: handoverForm.date
            };

            const res = await api.post(`/cash/close/${session._id || session.id}`, dataToSubmit);
            const sessionData = res.data;
            setSession(sessionData);
            setIsClosing(false);
            setIsHandover(false);
            alert("Caja cerrada exitosamente");

            // Download PDF
            await downloadReport(sessionData._id || sessionData.id);
        } catch (e) {
            alert("Error al cerrar caja");
        }
    };

    const handleHandoverSave = async () => {
        if (!session) return;
        try {
            const dataToSubmit = {
                manual_next_day_cash: handoverForm.total,
                handover_to_user_id: handoverForm.targetUserId,
                handover_denominations: handoverForm.denominations,
                handover_date: handoverForm.date
            };

            // Save handover info without closing
            await api.post(`/cash/handover/${session._id || session.id}`, dataToSubmit);

            // Download focus handover PDF
            const resPdf = await api.get(`/cash/handover-pdf/${session._id || session.id}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([resPdf.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `entrega_caja_${(session._id || session.id).slice(-6)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setIsHandover(false);
            alert("Información de entrega guardada y PDF generado. La sesión de caja sigue ABIERTA.");
            loadCurrentSession();
        } catch (e) {
            alert("Error al guardar entrega");
        }
    };

    const openClosingModal = () => {
        if (session) {
            setClosingForm(prev => ({
                ...prev,
                manual_debt: session.sales_debt || 0,
                manual_transfer: session.sales_transfer || 0,
                manual_transbank: (session.sales_debit || 0) + (session.sales_credit || 0),
                denominations: {}, // Start with zeros as requested
                balance_real: 0
            }));
        }
        setIsClosing(true);
    };

    const calculateBalanceFromDenominations = (denoms: Record<string, number>) => {
        return Object.entries(denoms).reduce((acc, [val, qty]) => acc + (parseInt(val) * (qty || 0)), 0);
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
                    {session && (
                        <button
                            onClick={() => downloadReport(session._id || session.id)}
                            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-lg border shadow-sm hover:bg-gray-50 transition-all font-medium"
                            title="Descargar Reporte PDF"
                        >
                            <FileText size={18} className="text-red-500" />
                            Reporte
                        </button>
                    )}
                    {session?.status === 'OPEN' && (
                        <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full border border-green-200">
                            <Unlock size={18} />
                            <span className="font-bold">Caja Abierta</span>
                        </div>
                    )}
                    {session?.status === 'CLOSED' && (
                        <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full border border-red-200">
                            <Lock size={18} />
                            <span className="font-bold">Turno Cerrado</span>
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
                        <div className="grid grid-cols-1 gap-6">
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
                                <MethodBox label="Deuda" value={session.sales_debt} icon={<AlertCircle size={16} />} color="text-red-600" />
                            </div>
                        </div>

                    </div>

                    {/* Actions Column */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-blue-500">
                            <h4 className="font-bold text-gray-800 mb-2">Acciones Rápidas</h4>

                            {session.status === 'OPEN' ? (
                                <>
                                    <p className="text-xs text-gray-500 mb-4 tracking-tight">Registre movimientos o realice el cierre de jornada.</p>

                                    <button
                                        onClick={() => setIsHandover(true)}
                                        className="w-full bg-white text-blue-700 border-2 border-blue-200 font-bold py-3 rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mb-3"
                                    >
                                        <Users size={18} />
                                        Dejar Caja
                                    </button>

                                    <button
                                        onClick={openClosingModal}
                                        className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                                    >
                                        <Lock size={18} />
                                        Cerrar Caja del Día
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs text-gray-500 mb-4 tracking-tight">La caja se encuentra cerrada. Puede iniciar una nueva jornada para continuar.</p>
                                    <button
                                        onClick={() => {
                                            setOpeningForm({ balance: 0, denominations: {} });
                                            setIsOpening(true);
                                        }}
                                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                                    >
                                        <Unlock size={18} />
                                        Abrir Nuevo Turno
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Opening Modal */}
            {isOpening && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="bg-gray-900 text-white p-8">
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Unlock size={28} className="text-green-400" />
                                Apertura de Caja
                            </h2>
                            <p className="text-gray-400 text-sm mt-2 font-medium">Ingrese el efectivo inicial disponible para el turno</p>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-6">
                            <div>
                                <h3 className="font-black text-gray-800 mb-6 uppercase tracking-widest text-[10px]">Desglose de Efectivo</h3>
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

                            <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-xl flex justify-between items-center">
                                <div>
                                    <p className="text-blue-200 text-xs font-black uppercase tracking-widest mb-1">Monto Inicial Calculado</p>
                                    <p className="text-4xl font-black">${openingForm.balance.toLocaleString()}</p>
                                </div>
                                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                                    <Unlock size={32} />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-white border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setIsOpening(false)}
                                className="flex-1 py-4 px-6 border-2 border-gray-100 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all font-black uppercase tracking-widest text-[10px]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleOpenSession}
                                disabled={openingForm.balance <= 0}
                                className={`flex-[2] py-4 px-6 rounded-2xl text-white font-black shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] ${openingForm.balance <= 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                <Lock size={18} />
                                Abrir Caja Ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Closing Modal */}
            {isClosing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="bg-gray-900 text-white p-8">
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Lock size={28} className="text-blue-400" />
                                Cierre de Caja
                            </h2>
                            <p className="text-gray-400 text-sm mt-2 font-medium">Realice el conteo final y declare otros movimientos registrados</p>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-8 bg-gray-50/50">
                            {/* Ventas del Dia Section */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 border-b pb-3 uppercase tracking-wider text-sm">
                                    <TrendingUp size={18} className="text-blue-500" />
                                    Ventas del Día
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
                                    {DENOMINATIONS.map(d => (
                                        <div key={d} className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold mb-1">${parseInt(d).toLocaleString()}</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50"
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 border-t pt-6">
                                    <div className="space-y-4">
                                        <ManualInput label="Vtas. Efect." value={closingForm.balance_real} onChange={() => { }} disabled />
                                        <ManualInput label="Deudado" value={closingForm.manual_debt} onChange={(v: number) => setClosingForm(prev => ({ ...prev, manual_debt: v }))} />
                                        <ManualInput label="Transbank" value={closingForm.manual_transbank} onChange={(v: number) => setClosingForm(prev => ({ ...prev, manual_transbank: v }))} />
                                        <ManualInput label="Transf." value={closingForm.manual_transfer} onChange={(v: number) => setClosingForm(prev => ({ ...prev, manual_transfer: v }))} />
                                        <ManualInput label="Caja Mañana" value={closingForm.manual_next_day_cash} onChange={(v: number) => setClosingForm(prev => ({ ...prev, manual_next_day_cash: v }))} color="indigo" />
                                    </div>
                                    <div className="space-y-4">
                                        <ManualInput label="Retiros" value={closingForm.manual_withdrawals} onChange={(v: number) => setClosingForm(prev => ({ ...prev, manual_withdrawals: v }))} color="red" />
                                        <ManualInput label="Gastos" value={closingForm.manual_expenses} onChange={(v: number) => setClosingForm(prev => ({ ...prev, manual_expenses: v }))} color="red" />

                                        <div className="pt-4 mt-4 border-t border-dashed">
                                            <label className="block text-[10px] uppercase font-black text-blue-600 mb-1">Total Ventas día</label>
                                            <div className="text-2xl font-black text-gray-900 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                                ${(
                                                    closingForm.balance_real +
                                                    closingForm.manual_debt +
                                                    closingForm.manual_transbank +
                                                    closingForm.manual_transfer -
                                                    closingForm.manual_withdrawals -
                                                    closingForm.manual_expenses
                                                ).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pagos de Otros Dias Section */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 border-b pb-3 uppercase tracking-wider text-sm">
                                    <Clock size={18} className="text-purple-500" />
                                    Pagos de Otros Días
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ManualInput label="Efectivo (Transf)" value={closingForm.manual_other_day_cash} onChange={(v: number) => setClosingForm(prev => ({ ...prev, manual_other_day_cash: v }))} />
                                    <ManualInput label="Transbank" value={closingForm.manual_other_day_transbank} onChange={(v: number) => setClosingForm(prev => ({ ...prev, manual_other_day_transbank: v }))} />
                                </div>
                            </div>

                            {/* Final Total Section */}
                            <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-8">
                                <div className="text-center md:text-left">
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Declarado</p>
                                    <p className="text-5xl font-black text-white">
                                        ${(
                                            closingForm.balance_real +
                                            closingForm.manual_debt +
                                            closingForm.manual_transbank +
                                            closingForm.manual_transfer -
                                            closingForm.manual_withdrawals -
                                            closingForm.manual_expenses +
                                            closingForm.manual_other_day_cash +
                                            closingForm.manual_other_day_transbank
                                        ).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center md:items-end opacity-50">
                                    <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Cajero/a</p>
                                    <p className="text-lg font-bold">Sesión Abierta</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-white border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setIsClosing(false)}
                                className="flex-1 py-4 px-6 border-2 border-gray-100 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all font-black uppercase tracking-widest text-[10px]"
                            >
                                Regresar
                            </button>
                            <button
                                onClick={handleCloseSession}
                                className="flex-[2] py-4 px-6 bg-gray-900 text-white rounded-2xl font-black shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                            >
                                <Lock size={18} />
                                Finalizar y Cerrar Caja
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Handover Modal (Dejar Caja) */}
            {isHandover && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="bg-gray-900 text-white p-8">
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Users size={28} className="text-blue-400" />
                                Dejar Caja (Entrega Turno)
                            </h2>
                            <p className="text-gray-400 text-sm mt-2 font-medium">Prepare el fondo de caja y asigne al receptor del próximo turno</p>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-8 bg-gray-50/50">
                            {/* Handover Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                                    <h3 className="font-black text-gray-800 mb-4 uppercase tracking-widest text-[10px]">Asignar a Empleado/a</h3>
                                    <select
                                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-gray-700 font-bold focus:ring-4 focus:ring-blue-100 outline-none appearance-none transition-all"
                                        value={handoverForm.targetUserId}
                                        onChange={e => setHandoverForm(prev => ({ ...prev, targetUserId: e.target.value }))}
                                    >
                                        <option value="">Seleccione Receptor/a...</option>
                                        {employees.map(u => (
                                            <option key={u._id || u.id} value={u._id || u.id}>
                                                {u.name} {u.last_name || ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                                    <h3 className="font-black text-gray-800 mb-4 uppercase tracking-widest text-[10px]">Fecha de Entrega</h3>
                                    <div className="relative">
                                        <Calendar size={20} className="absolute left-4 top-4 text-gray-400" />
                                        <input
                                            type="date"
                                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 pl-12 text-gray-700 font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                            value={handoverForm.date}
                                            onChange={e => setHandoverForm(prev => ({ ...prev, date: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Denomination Picker */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                                <h3 className="font-black text-gray-800 mb-6 uppercase tracking-widest text-[10px]">Conteo de Entrega</h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {DENOMINATIONS.map(d => (
                                        <div key={d} className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold mb-1">${parseInt(d).toLocaleString()}</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="border-2 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 outline-none bg-gray-50/50 font-bold text-gray-700 transition-all"
                                                value={handoverForm.denominations[d] || ''}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const newDenoms = { ...handoverForm.denominations, [d]: val };
                                                    const total = calculateBalanceFromDenominations(newDenoms);
                                                    setHandoverForm(prev => ({ ...prev, denominations: newDenoms, total }));
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Box */}
                            <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-xl flex justify-between items-center">
                                <div>
                                    <p className="text-blue-200 text-xs font-black uppercase tracking-widest mb-1">Monto de Entrega</p>
                                    <p className="text-4xl font-black">${handoverForm.total.toLocaleString()}</p>
                                </div>
                                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                                    <ArrowRight size={32} />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setIsHandover(false)}
                                className="flex-1 py-4 px-6 border-2 border-gray-100 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleHandoverSave}
                                disabled={!handoverForm.targetUserId || handoverForm.total <= 0}
                                className={`flex-1 py-4 px-6 rounded-2xl text-white font-black shadow-lg transition-all flex items-center justify-center gap-2 ${(!handoverForm.targetUserId || handoverForm.total <= 0) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-95'}`}
                            >
                                <Download size={20} />
                                Generar PDF y Guardar Entrega
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
    disabled?: boolean;
}

const ManualInput = ({ label, value, onChange, color = "blue", disabled = false }: ManualInputProps) => (
    <div>
        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">{label}</label>
        <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 font-bold">$</span>
            <input
                type="number"
                disabled={disabled}
                className={`w-full pl-6 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-${color}-500 outline-none ${disabled ? 'bg-gray-50 text-gray-500 font-bold cursor-not-allowed' : 'bg-white'}`}
                value={value || ''}
                onChange={e => onChange(parseFloat(e.target.value) || 0)}
            />
        </div>
    </div>
);

export default Cash;
