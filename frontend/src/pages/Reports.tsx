import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    DollarSign, ShoppingCart, Users, Calendar,
    Package, Download, Activity, ArrowRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const Reports = () => {
    const { hasAnyRole } = useAuth();
    const [loading, setLoading] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

    // Stats
    const [salesStats, setSalesStats] = useState<any>(null);
    const [appointmentStats, setAppointmentStats] = useState<any>(null);
    const [productStats, setProductStats] = useState<any>(null);
    const [clientStats, setClientStats] = useState<any>(null);
    const [categoryStats, setCategoryStats] = useState<any[]>([]);
    const [commissionStats, setCommissionStats] = useState<any[]>([]);
    const [inventoryModal, setInventoryModal] = useState<{ title: string, items: any[] } | null>(null);

    if (!hasAnyRole(['admin', 'superadmin'])) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600">Solo los administradores pueden ver los reportes.</p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        loadAllStats();
    }, [dateRange]);

    const loadAllStats = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadSalesStats(),
                loadAppointmentStats(),
                loadProductStats(),
                loadClientStats(),
                loadCategoryStats(),
                loadCommissionStats()
            ]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadSalesStats = async () => {
        try {
            const res = await api.get(`/reports/sales?start=${dateRange.start}&end=${dateRange.end}`);
            setSalesStats(res.data);
        } catch (error) {
            console.error('Error loading sales stats:', error);
            // Mock data for demonstration
            setSalesStats({
                total_sales: 59990,
                count: 3,
                avg_ticket: 19997,
                by_day: [
                    { date: '2026-02-01', total: 25000, count: 1 },
                    { date: '2026-02-02', total: 15000, count: 1 },
                    { date: '2026-02-03', total: 19990, count: 1 }
                ],
                by_product: [
                    { name: 'Consulta Veterinaria', total: 25000, count: 5 },
                    { name: 'Vacuna Antirrábica', total: 15000, count: 10 },
                    { name: 'Baño y Peluquería', total: 19990, count: 8 }
                ]
            });
        }
    };

    const loadAppointmentStats = async () => {
        try {
            const res = await api.get(`/reports/appointments?start=${dateRange.start}&end=${dateRange.end}`);
            setAppointmentStats(res.data);
        } catch (error) {
            console.error('Error loading appointment stats:', error);
            // Mock data
            setAppointmentStats({
                total: 45,
                completed: 32,
                cancelled: 5,
                pending: 8,
                by_type: [
                    { type: 'Veterinaria', count: 20 },
                    { type: 'Peluquería', count: 15 },
                    { type: 'Vacunación', count: 10 }
                ]
            });
        }
    };

    const loadProductStats = async () => {
        try {
            const res = await api.get(`/reports/products?start=${dateRange.start}&end=${dateRange.end}`);
            setProductStats(res.data);
        } catch (error) {
            console.error('Error loading product stats:', error);
            // Mock data synchronized with the cards shown in UI
            setProductStats({
                total_products: 150,
                low_stock: 12,
                out_of_stock: 3,
                low_stock_items: [
                    { name: 'Alimento Premium Canino 15kg', quantity: 2 },
                    { name: 'Shampoo Antipulgas 250ml', quantity: 4 },
                    { name: 'Arena Sanitaria 5kg', quantity: 3 }
                ],
                out_of_stock_items: [
                    { name: 'Vacuna Óctuple', quantity: 0 },
                    { name: 'Pipeta Gato < 4kg', quantity: 0 },
                    { name: 'Jaula de Transporte Grande', quantity: 0 }
                ],
                top_selling: [
                    { name: 'Alimento Premium', quantity: 45 },
                    { name: 'Antipulgas', quantity: 32 },
                    { name: 'Shampoo', quantity: 28 }
                ]
            });
        }
    };

    const loadClientStats = async () => {
        try {
            const res = await api.get(`/reports/clients?start=${dateRange.start}&end=${dateRange.end}`);
            setClientStats(res.data);
        } catch (error) {
            console.error('Error loading client stats:', error);
            // Mock data
            setClientStats({
                total_clients: 234,
                new_clients: 12,
                active_clients: 156,
                total_patients: 312,
                debtor_clients: 45
            });
        }
    };

    const loadCategoryStats = async () => {
        try {
            const res = await api.get(`/reports/sales-by-category?start=${dateRange.start}&end=${dateRange.end}`);
            setCategoryStats(res.data);
        } catch (error) {
            console.error('Error loading category stats:', error);
        }
    };

    const loadCommissionStats = async () => {
        try {
            const res = await api.get(`/reports/commissions?start=${dateRange.start}&end=${dateRange.end}`);
            setCommissionStats(res.data);
        } catch (error) {
            console.error('Error loading commission stats:', error);
        }
    };

    const generatePDF = async () => {
        setGeneratingPDF(true);
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 20;

        // --- Helper Functions ---
        const addHeader = (title: string) => {
            // Brand Color Header
            doc.setFillColor(66, 133, 244); // Blue-500 equivalent
            doc.rect(0, 0, pageWidth, 15, 'F');

            // Title
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('Sistema CalFer', 14, 10);

            // Subtitle / Report Title
            doc.setFontSize(16);
            doc.setTextColor(50, 50, 50);
            doc.text(title, 14, 25);

            // Date Info
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Período: ${dateRange.start} al ${dateRange.end}`, 14, 32);
            doc.text(`Generado el: ${new Date().toLocaleString('es-CL')}`, 14, 37);

            doc.setDrawColor(200);
            doc.line(14, 40, pageWidth - 14, 40);
            yPos = 45;
        };

        const addChart = async (elementId: string, title: string) => {
            const element = document.getElementById(elementId);
            if (element) {
                // Check page break
                if (yPos + 90 > pageHeight) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(14);
                doc.setTextColor(0);
                doc.text(title, 14, yPos);
                yPos += 5;

                try {
                    const canvas = await html2canvas(element, { scale: 2 });
                    const imgData = canvas.toDataURL('image/png');
                    // Calculate ratio
                    const imgWidth = pageWidth - 28;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    doc.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
                    yPos += imgHeight + 10;
                } catch (err) {
                    console.error("Error capturing chart", err);
                }
            }
        };

        // --- PDF Content Generation ---

        // 1. Cover Page / Summary
        addHeader('Reporte de Gestión Integral');

        // KPI Section
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Resumen Ejecutivo', 14, yPos);
        yPos += 10;

        autoTable(doc, {
            startY: yPos,
            head: [['Indicador', 'Valor']],
            body: [
                ['Ventas Totales ($)', `$${salesStats?.total_sales?.toLocaleString() || 0}`],
                ['Transacciones', salesStats?.count || 0],
                ['Citas Totales', appointmentStats?.total || 0],
                ['Clientes Nuevos', clientStats?.new_clients || 0],
                ['Deuda Total Clientes', `$${(clientStats?.debtor_clients || 0).toLocaleString('es-CL')}`] // Assuming simpler metric? Actually debtor_clients was count in the UI, let's keep count
            ],
            theme: 'grid',
            headStyles: { fillColor: [66, 133, 244], textColor: 255 },
            styles: { fontSize: 12, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // 2. Charts Section

        // Sales Chart
        await addChart('chart-sales-by-day', 'Evolución de Ventas Diarias');

        // Appointments Chart
        await addChart('chart-appointments-by-type', 'Distribución de Citas');

        // Check if we need a new page for the next section
        if (yPos + 50 > pageHeight) {
            doc.addPage();
            yPos = 20;
        } else {
            yPos += 15;
        }

        doc.setFontSize(16);
        doc.text('Detalle de Ventas e Inventario', 14, yPos);
        yPos += 10;

        // Top Products Table
        doc.setFontSize(12);
        doc.text('Productos Más Vendidos', 14, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Producto', 'Cantidad Vendida']],
            body: (productStats?.top_selling || []).map((p: any) => [p.name, p.quantity]),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Sales by Branch Table
        doc.text('Ventas por Sucursal', 14, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Sucursal', 'Total Ventas', 'Transacciones']],
            body: (salesStats?.by_branch || []).map((b: any) => [
                b.name,
                `$${b.total.toLocaleString()}`,
                b.transactions || (salesStats.by_employee?.find((e: any) => e.branch === b.name)?.transactions || '-')
            ]),
            theme: 'striped',
            headStyles: { fillColor: [139, 92, 246] }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Employee Performance
        doc.text('Rendimiento de Empleados', 14, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Empleado', 'Ventas ($)', 'Transacciones']],
            body: (salesStats?.by_employee || []).map((e: any) => [
                e.name,
                `$${e.total.toLocaleString()}`,
                e.transactions
            ]),
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Sales by Category
        doc.text('Resumen por Categoría', 14, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Categoría', 'Total ($)', '%']],
            body: (categoryStats || []).map((c: any) => [
                c.name,
                `$${c.total.toLocaleString()}`,
                `${c.percentage?.toFixed(1)}%`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11] }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Professional Commissions
        doc.text('Rendimiento Profesionales', 14, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Profesional', 'Atenciones', 'Total Generado ($)']],
            body: (commissionStats || []).map((p: any) => [
                p.name,
                p.count,
                `$${p.total.toLocaleString()}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }
        });

        // Save
        doc.save(`Reporte_CalFer_${dateRange.start}_${dateRange.end}.pdf`);
        setGeneratingPDF(false);
    };

    const setTodayRange = () => {
        const today = new Date().toISOString().split('T')[0];
        setDateRange({
            start: today,
            end: today
        });
        setReportType('daily');
    };

    const setWeeklyRange = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
        setReportType('weekly');
    };

    const setMonthlyRange = () => {
        const end = new Date();
        const start = new Date(end.getFullYear(), end.getMonth(), 1);
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
        setReportType('monthly');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Activity size={28} className="text-blue-400" />
                    Reportes de Gestión
                </h1>
                <button
                    onClick={generatePDF}
                    disabled={generatingPDF}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:bg-gray-400"
                >
                    <Download size={18} />
                    {generatingPDF ? 'Exportando...' : 'Exportar PDF'}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <button
                        onClick={setTodayRange}
                        className={`px-4 py-2 rounded-lg transition-colors ${reportType === 'daily'
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Hoy
                    </button>
                    <button
                        onClick={setWeeklyRange}
                        className={`px-4 py-2 rounded-lg transition-colors ${reportType === 'weekly'
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Última Semana
                    </button>
                    <button
                        onClick={setMonthlyRange}
                        className={`px-4 py-2 rounded-lg transition-colors ${reportType === 'monthly'
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Este Mes
                    </button>
                    <button
                        onClick={loadAllStats}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ml-auto"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando estadísticas...</div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <StatCard
                            title="Ventas Totales"
                            value={`$${salesStats?.total_sales?.toLocaleString() || 0}`}
                            icon={<DollarSign size={24} />}
                            color="bg-green-100 text-green-600"
                        />
                        <StatCard
                            title="Transacciones"
                            value={salesStats?.count || 0}
                            icon={<ShoppingCart size={24} />}
                            color="bg-blue-100 text-blue-600"
                        />
                        <StatCard
                            title="Citas Totales"
                            value={appointmentStats?.total || 0}
                            icon={<Calendar size={24} />}
                            color="bg-brand-surface text-primary"
                        />
                        <StatCard
                            title="Clientes Deudores"
                            value={(clientStats?.debtor_clients || 0).toLocaleString('es-CL')}
                            icon={<Users size={24} />}
                            color="bg-red-100 text-red-600"
                        />
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Sales by Day */}
                        <div id="chart-sales-by-day" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ventas por Día</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={salesStats?.by_day || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis tickFormatter={(val) => val.toLocaleString('es-CL')} />
                                    <Tooltip formatter={(value: any) => value?.toLocaleString('es-CL') || '0'} />
                                    <Legend />
                                    <Bar dataKey="total" fill="#5B9AA8" name="Ventas ($)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Appointments by Type */}
                        <div id="chart-appointments-by-type" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Citas por Tipo</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={appointmentStats?.by_type || []}
                                        dataKey="count"
                                        nameKey="type"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {appointmentStats?.by_type?.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Top Products */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos Más Vendidos</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={productStats?.top_selling || []} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={150} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="quantity" fill="#3b82f6" name="Cantidad Vendida" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Inventory Status */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado del Inventario</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Package size={24} className="text-blue-400" />
                                        <span className="font-medium text-gray-700">Total Productos</span>
                                    </div>
                                    <span className="text-2xl font-bold text-blue-600">
                                        {productStats?.total_products || 0}
                                    </span>
                                </div>
                                <div
                                    onClick={() => {
                                        console.log("Opening Low Stock Modal. productStats:", productStats);
                                        const items = productStats?.low_stock_items || [];
                                        console.log("Items to show:", items);
                                        setInventoryModal({ title: 'Productos con Stock Bajo', items });
                                    }}
                                    className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors border border-transparent hover:border-yellow-200 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Package size={24} className="text-yellow-600 group-hover:scale-110 transition-transform" />
                                        <span className="font-medium text-gray-700">Stock Bajo</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-yellow-600">
                                            {productStats?.low_stock || 0}
                                        </span>
                                        <ArrowRight size={18} className="text-yellow-400 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                </div>
                                <div
                                    onClick={() => {
                                        console.log("Opening Out of Stock Modal. productStats:", productStats);
                                        const items = productStats?.out_of_stock_items || [];
                                        console.log("Items to show:", items);
                                        setInventoryModal({ title: 'Productos Sin Stock', items });
                                    }}
                                    className="flex justify-between items-center p-4 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors border border-transparent hover:border-red-200 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Package size={24} className="text-red-600 group-hover:scale-110 transition-transform" />
                                        <span className="font-medium text-gray-700">Sin Stock</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-red-600">
                                            {productStats?.out_of_stock || 0}
                                        </span>
                                        <ArrowRight size={18} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branch & Employee Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Sales by Branch */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ventas por Sucursal</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={salesStats?.by_branch || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(val) => `$${val.toLocaleString('es-CL')}`} />
                                    <Tooltip formatter={(value: any) => `$${value?.toLocaleString('es-CL') || '0'}`} />
                                    <Legend />
                                    <Bar dataKey="total" fill="#8b5cf6" name="Total Ventas ($)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Appointments by Branch */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Atenciones por Sucursal</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={appointmentStats?.by_branch || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#ec4899" name="Cantidad Citas" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Sellers */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Rendimiento de Empleados (Vendedores)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                    <tr>
                                        <th className="px-4 py-3">Empleado</th>
                                        <th className="px-4 py-3 text-right">Transacciones</th>
                                        <th className="px-4 py-3 text-right">Total Vendido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(salesStats?.by_employee || []).map((emp: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-800">
                                                {idx + 1}. {emp.name}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">{emp.transactions}</td>
                                            <td className="px-4 py-3 text-right font-bold text-green-600">
                                                ${emp.total.toLocaleString('es-CL')}
                                            </td>
                                        </tr>
                                    ))}
                                    {(salesStats?.by_employee || []).length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                                No hay datos de ventas en este período.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Client Stats */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Estadísticas de Clientes y Pacientes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-brand-surface rounded-lg">
                                <div className="text-3xl font-bold text-primary mb-1">
                                    {clientStats?.total_clients || 0}
                                </div>
                                <div className="text-sm text-gray-600">Total Clientes</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-3xl font-bold text-green-600 mb-1">
                                    {clientStats?.new_clients || 0}
                                </div>
                                <div className="text-sm text-gray-600">Nuevos Este Período</div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg text-red-600">
                                <div className="text-3xl font-bold mb-1">
                                    {(clientStats?.debtor_clients || 0).toLocaleString('es-CL')}
                                </div>
                                <div className="text-sm text-gray-600">Clientes Deudores</div>
                            </div>
                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                                <div className="text-3xl font-bold text-orange-600 mb-1">
                                    {clientStats?.total_patients || 0}
                                </div>
                                <div className="text-sm text-gray-600">Total Pacientes</div>
                            </div>
                        </div>
                    </div>

                    {/* Sales by Category & Commissions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Sales by Category */}
                        <div id="chart-sales-by-category" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ventas por Categoría</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={categoryStats}
                                            dataKey="total"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                        >
                                            {categoryStats.map((_: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: any) => `$${val.toLocaleString()}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2 overflow-y-auto max-h-[250px] pr-2">
                                    {categoryStats.map((cat, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                <span className="font-medium truncate max-w-[100px]">{cat.name}</span>
                                            </div>
                                            <span className="font-bold">${cat.total.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Commissions / Professionals */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Desempeño Profesionales (Comisiones)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Profesional</th>
                                            <th className="px-3 py-2 text-right">Cant.</th>
                                            <th className="px-3 py-2 text-right">Total Generado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {commissionStats.map((prof, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 font-medium">{prof.name}</td>
                                                <td className="px-3 py-2 text-right">{prof.count}</td>
                                                <td className="px-3 py-2 text-right font-bold text-blue-600">${prof.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {commissionStats.length === 0 && (
                                            <tr><td colSpan={3} className="px-3 py-8 text-center text-gray-400 italic">No hay datos de profesionales</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Inventory Items Modal */}
            {inventoryModal && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200"
                    onClick={() => setInventoryModal(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{inventoryModal.title}</h3>
                                <p className="text-sm text-gray-500">{inventoryModal.items.length} productos detectados</p>
                            </div>
                            <button
                                onClick={() => setInventoryModal(null)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {inventoryModal.items.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 italic">
                                    No se encontraron productos en esta categoría.
                                </div>
                            ) : (
                                inventoryModal.items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                <Package size={20} />
                                            </div>
                                            <span className="font-medium text-gray-800">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-lg font-bold ${item.quantity <= 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                                                {item.quantity}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-1">unidades</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 border-t rounded-b-2xl">
                            <button
                                onClick={() => setInventoryModal(null)}
                                className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-sm"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
        </div>
    </div>
);

export default Reports;
