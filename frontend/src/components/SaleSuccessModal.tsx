import { CheckCircle, Printer, X } from 'lucide-react';
import { useRef } from 'react';

interface SaleSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: any;
    storeName?: string;
}

const SaleSuccessModal = ({ isOpen, onClose, sale, storeName = 'CalFer' }: SaleSuccessModalProps) => {
    const receiptRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !sale) return null;

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
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle size={24} className="text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">¡Venta Realizada con Éxito!</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Receipt Preview */}
                <div className="p-6">
                    <div ref={receiptRef} className="receipt bg-white border-2 border-gray-300 rounded-lg p-6 mb-4">
                        <div className="header">
                            <div className="store-name">{storeName}</div>
                            <div className="info-line text-sm text-gray-600">
                                {sale.branch_name || 'Sucursal Principal'}
                            </div>
                            <div className="info-line text-sm text-gray-600">
                                {new Date(sale.created_at || new Date()).toLocaleString('es-CL')}
                            </div>
                            <div className="info-line text-sm text-gray-600">
                                Boleta N° {sale.id?.slice(-8) || 'N/A'}
                            </div>
                        </div>

                        <div className="items">
                            <div className="font-bold mb-2 text-sm">DETALLE DE VENTA</div>
                            {sale.items?.map((item: any, index: number) => (
                                <div key={index} className="item text-sm">
                                    <div className="item-name">{item.name || item.product_name}</div>
                                    <div className="item-qty">x{item.quantity}</div>
                                    <div className="item-price">${(item.unit_price * item.quantity).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>

                        <div className="totals">
                            <div className="total-line">
                                <span>Subtotal:</span>
                                <span>${sale.total?.toLocaleString() || 0}</span>
                            </div>
                            {sale.discount > 0 && (
                                <div className="total-line text-red-600">
                                    <span>Descuento:</span>
                                    <span>-${sale.discount?.toLocaleString() || 0}</span>
                                </div>
                            )}
                            <div className="total-line grand-total">
                                <span>TOTAL:</span>
                                <span>${sale.total?.toLocaleString() || 0}</span>
                            </div>
                            <div className="total-line text-sm text-gray-600">
                                <span>Método de Pago:</span>
                                <span className="uppercase">{sale.payment_method || 'EFECTIVO'}</span>
                            </div>
                        </div>

                        <div className="footer">
                            <div>¡Gracias por su compra!</div>
                            <div className="mt-2">www.calfer.cl</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            <Printer size={20} />
                            Imprimir Boleta
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaleSuccessModal;
