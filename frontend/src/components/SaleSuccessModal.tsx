import { CheckCircle, Printer, X, Mail, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { salesService } from '../api/services';

interface SaleSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: any;
    storeName?: string;
}

const SaleSuccessModal = ({ isOpen, onClose, sale, storeName = 'CalFer' }: SaleSuccessModalProps) => {
    const receiptRef = useRef<HTMLDivElement>(null);

    const [sendingEmail, setSendingEmail] = useState(false);

    if (!isOpen || !sale) return null;

    const handleSendEmail = async () => {
        if (!sale.id && !sale._id) return;
        setSendingEmail(true);
        try {
            await salesService.sendSaleEmail(sale.id || sale._id);
            alert('Comprobante enviado exitosamente por correo.');
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Error al enviar el correo.');
        } finally {
            setSendingEmail(false);
        }
    };

    const handlePrint = () => {
        const printContent = receiptRef.current;
        if (!printContent) return;

        const width = 450;
        const height = 650;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const printWindow = window.open('', '', `width=${width},height=${height},left=${left},top=${top}`);
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Boleta de Venta</title>
                    <style>
                        body {
                            font-family: 'Courier New', monospace;
                            font-size: 14px;
                            margin: 0;
                            padding: 20px;
                            width: 100%;
                            box-sizing: border-box;
                        }
                        .receipt {
                            width: 100%;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 10px;
                            border-bottom: 2px dashed #000;
                            padding-bottom: 10px;
                        }
                        .store-name {
                            font-size: 18px;
                            font-weight: bold;
                            margin-bottom: 5px;
                        }
                        .info-line {
                            margin: 3px 0;
                        }
                        .items {
                            margin: 10px 0;
                            border-bottom: 2px dashed #000;
                            padding-bottom: 10px;
                        }
                        .item {
                            display: flex;
                            justify-content: space-between;
                            margin: 5px 0;
                        }
                        .item-name {
                            flex: 1;
                        }
                        .item-qty {
                            width: 30px;
                            text-align: center;
                        }
                        .item-price {
                            width: 80px;
                            text-align: right;
                        }
                        .totals {
                            margin: 10px 0;
                        }
                        .total-line {
                            display: flex;
                            justify-content: space-between;
                            margin: 5px 0;
                        }
                        .total-line.grand-total {
                            font-size: 16px;
                            font-weight: bold;
                            border-top: 2px solid #000;
                            padding-top: 5px;
                            margin-top: 10px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 15px;
                            border-top: 2px dashed #000;
                            padding-top: 10px;
                            font-size: 10px;
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header - Fixed */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle size={24} className="text-green-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Venta Exitosa</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Receipt Preview - Scrollable */}
                <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
                    <div ref={receiptRef} className="receipt bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-2 mx-auto max-w-[320px]">
                        <div className="header text-center mb-4 border-b border-dashed border-gray-300 pb-4">
                            <div className="store-name font-bold text-lg uppercase tracking-wider">{storeName}</div>
                            <div className="info-line text-xs text-gray-500 mt-1">
                                {sale.branch_name || 'Sucursal Principal'}
                            </div>
                            <div className="info-line text-[10px] text-gray-400">
                                {new Date(sale.created_at || new Date()).toLocaleString('es-CL')}
                            </div>
                            <div className="info-line text-[10px] text-gray-400 font-mono">
                                N° {sale.id?.slice(-8) || 'N/A'}
                            </div>
                        </div>

                        <div className="items mb-4 border-b border-dashed border-gray-300 pb-4">
                            <div className="font-bold mb-3 text-[10px] text-gray-400 uppercase tracking-widest text-center">Detalle de Productos</div>
                            <div className="space-y-2">
                                {sale.items?.map((item: any, index: number) => (
                                    <div key={index} className="item text-xs flex justify-between gap-4">
                                        <div className="item-name flex-1 text-gray-700 leading-tight">{item.name || item.product_name}</div>
                                        <div className="item-qty text-gray-500 font-medium">x{item.quantity}</div>
                                        <div className="item-price text-gray-900 font-semibold">${(item.unit_price * item.quantity).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="totals space-y-1.5">
                            <div className="total-line flex justify-between text-xs text-gray-600">
                                <span>Subtotal:</span>
                                <span>${sale.total?.toLocaleString() || 0}</span>
                            </div>
                            {sale.discount > 0 && (
                                <div className="total-line flex justify-between text-xs text-red-600 italic">
                                    <span>Descuento:</span>
                                    <span>-${sale.discount?.toLocaleString() || 0}</span>
                                </div>
                            )}
                            <div className="total-line grand-total flex justify-between text-base font-bold border-t border-gray-900 pt-2 mt-2 text-gray-900">
                                <span>TOTAL:</span>
                                <span>${sale.total?.toLocaleString() || 0}</span>
                            </div>
                            <div className="total-line text-[10px] text-gray-400 flex justify-between pt-1">
                                <span>Método Pago:</span>
                                <span className="uppercase font-medium">
                                    {(() => {
                                        switch (sale.payment_method) {
                                            case 'CASH': return 'Efectivo';
                                            case 'DEBIT': return 'Débito';
                                            case 'CREDIT': return 'Crédito';
                                            case 'TRANSFER': return 'Transferencia';
                                            case 'DEBT': return 'Deuda';
                                            default: return sale.payment_method || 'Efectivo';
                                        }
                                    })()}
                                </span>
                            </div>
                        </div>

                        <div className="footer text-center mt-6 border-t border-dashed border-gray-300 pt-4">
                            <div className="text-xs font-medium text-gray-600">¡Gracias por su compra!</div>
                            <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest leading-none">www.calfer.cl</div>
                        </div>
                    </div>
                </div>

                {/* Actions - Fixed at Bottom */}
                <div className="p-5 border-t border-gray-100 bg-white bg-opacity-95 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all font-semibold shadow-lg shadow-gray-200 active:scale-95"
                        >
                            <Printer size={18} />
                            Imprimir
                        </button>

                        <div className="relative group">
                            <button
                                onClick={handleSendEmail}
                                disabled={sendingEmail || !sale.customer_email}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all font-semibold shadow-lg active:scale-95 ${sale.customer_email
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                                    : 'bg-gray-200 cursor-not-allowed text-gray-400 shadow-none'
                                    }`}
                            >
                                {sendingEmail ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Mail size={18} />
                                )}
                                Correo
                            </button>
                            {!sale.customer_email && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    Cliente sin correo registrado
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-semibold active:scale-95"
                    >
                        Cerrar Comprobante
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaleSuccessModal;
