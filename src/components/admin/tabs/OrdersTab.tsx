import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  ShoppingCart,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Printer,
  Package,
  XCircle,
  Trash2,
  X,
  Clock,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  User,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Order, OrderStatus } from '../../../types';

export const OrdersTab: React.FC = () => {
  const { orders, updateOrderStatus, confirmPaymentReceived, cancelOrder, deleteOrder, formatCurrency, t } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter(o => {
    const custName = (o.customerInfo?.name || o.customerInfo?.fullName || '').toLowerCase();
    const custPhone = (o.customerInfo?.phone || '').toLowerCase();
    const matchesSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      custName.includes(search.toLowerCase()) ||
      custPhone.includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
      case 'payment_pending':
        return 'bg-amber-950 text-amber-300 border-amber-500/40';
      case 'payment_confirmed':
        return 'bg-blue-950 text-blue-300 border-blue-500/40';
      case 'under_preparation':
        return 'bg-purple-950 text-purple-300 border-purple-500/40';
      case 'ready_for_delivery':
      case 'ready_for_pickup':
        return 'bg-indigo-950 text-indigo-300 border-indigo-500/40';
      case 'cancelled':
        return 'bg-rose-950 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Order Management (OpenCart Standard)</h2>
              <p className="text-[11px] text-purple-300/80">
                Process customer orders, verify CliQ/Bank payments, trigger DTF print runs, and track courier dispatches
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & Status Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders by #ID, customer name, or phone number..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `All (${orders.length})` },
            { id: 'payment_pending', label: 'Payment Pending' },
            { id: 'payment_confirmed', label: 'Payment Confirmed' },
            { id: 'under_preparation', label: 'DTF Printing' },
            { id: 'ready_for_delivery', label: 'Ready' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Orders List Table / Cards */}
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const total = order.totalAmount ?? order.total ?? 0;
          const custName = order.customerInfo?.name || order.customerInfo?.fullName || 'Customer';

          return (
            <div
              key={order.id}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white font-mono">{order.orderNumber}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadge(order.status)}`}>
                    {order.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <span className="text-xs font-black text-emerald-400 font-mono">{formatCurrency(total)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Customer & Item Overview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
                <div>
                  <div className="font-bold text-white">{custName}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {order.customerInfo?.phone || 'No phone'} • {order.customerInfo?.city || 'Amman'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">
                    {order.items?.length || 1} product(s) • {(order.paymentMethod || 'bank_transfer').replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Order Details & Invoice</span>
                </button>

                <div className="flex flex-wrap items-center gap-1.5">
                  {order.status === 'payment_pending' && (
                    <button
                      onClick={() => confirmPaymentReceived(order.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Bank Transfer</span>
                    </button>
                  )}

                  {order.status === 'payment_confirmed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'under_preparation', 'Sent to DTF RIP printer')}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Send to DTF Press</span>
                    </button>
                  )}

                  {order.status === 'under_preparation' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready_for_delivery', 'Heat-pressed & packaged')}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Mark Packaged</span>
                    </button>
                  )}

                  {order.status === 'ready_for_delivery' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed', 'Order delivered')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Complete Order</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Delete order ${order.orderNumber}?`)) {
                        deleteOrder(order.id);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition-all"
                    title="Delete Order"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Full Order Inspection & Packing Slip Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-5 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <span>Order: {selectedOrder.orderNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadge(selectedOrder.status)}`}>
                    {selectedOrder.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Details Block */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Customer & Shipping Information</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">Name</span>
                  <span className="font-bold text-white">{selectedOrder.customerInfo?.name || selectedOrder.customerInfo?.fullName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Phone</span>
                  <span className="font-mono text-white">{selectedOrder.customerInfo?.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">City / Address</span>
                  <span>{selectedOrder.customerInfo?.city || 'Amman'}, {selectedOrder.customerInfo?.address || selectedOrder.customerInfo?.streetAddress || ''}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Payment Method</span>
                  <span className="font-bold text-purple-300">{(selectedOrder.paymentMethod || 'bank_transfer').replace(/_/g, ' ').toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Items in this Order</span>
              {(selectedOrder.items || []).map((item, idx) => {
                const printMasterUrl = item.printReadyUrl || item.design?.imageUrl || item.customUploadedArtworkUrl;
                return (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.productImage || item.design?.imageUrl || item.customUploadedArtworkUrl}
                        alt={item.productName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-800"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.productName}</h4>
                        <p className="text-[10px] text-slate-400">
                          Size: {item.selectedSize || 'M'} • Color: {item.selectedColor || 'Black'} • Qty: {item.quantity || 1}
                        </p>
                        {item.isOwnerDesign ? (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 text-[9px] font-bold border border-purple-500/30">
                            In-House / Owner Design (0% Royalty)
                          </span>
                        ) : item.designerName || item.appliedRoyaltyRate !== undefined ? (
                          <div className="mt-0.5 text-[9px] font-mono text-cyan-400 flex items-center gap-1">
                            <span>Designer: {item.designerName || 'Third-Party'}</span>
                            <span>•</span>
                            <span>
                              Preserved Royalty: {item.appliedRoyaltyType === 'fixed' ? `${(item.appliedRoyaltyRate ?? 0.50).toFixed(2)} JOD/unit` : `${item.appliedRoyaltyRate}%/unit`}
                              {item.totalRoyaltyAmount !== undefined ? ` (+${item.totalRoyaltyAmount.toFixed(2)} JOD total)` : ''}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {printMasterUrl && (
                        <a
                          href={printMasterUrl}
                          download={`Order_${selectedOrder.orderNumber}_Master_${idx + 1}.png`}
                          className="p-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-all"
                          title="Download 300 DPI Master Print File"
                        >
                          <Download className="w-3 h-3" />
                          <span className="hidden sm:inline">Download Master</span>
                        </a>
                      )}
                      <div className="text-right font-mono font-bold text-xs text-white">
                        {formatCurrency((item.price || 0) * (item.quantity || 1))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Calculation */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Grand Total</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {formatCurrency(selectedOrder.totalAmount ?? selectedOrder.total ?? 0)}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
