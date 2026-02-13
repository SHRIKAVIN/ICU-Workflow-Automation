'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useSocket, useAuth } from '@/providers';
import { apiFetch } from '@/lib/auth';
import { cn, getStatusBadgeClasses } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  BedDouble, User, AlertTriangle, Wrench, CheckCircle, ArrowDown, ArrowUp, Brain, Shield,
  Wind, Activity, Monitor, Droplets, Filter, RefreshCw, Sparkles, Plus, Pencil, Trash2,
} from 'lucide-react';

interface BedFeatures {
  hasVentilator: boolean;
  hasMonitor: boolean;
  hasOxygenSupply: boolean;
  isIsolation: boolean;
  nearNursingStation: boolean;
}

interface Bed {
  _id: string;
  bedNumber: number;
  roomType: string;
  ward: string;
  floor: number;
  status: string;
  patientId: { _id: string; name: string; age: number; status: string; riskScore: number } | null;
  features: BedFeatures;
  priority: number;
  lastSanitized: string;
  notes: string;
}

interface BedStats {
  totalBeds: number;
  occupied: number;
  available: number;
  maintenance: number;
  byType: Record<string, { total: number; occupied: number; available: number }>;
  wardOccupancy: Record<string, { total: number; occupied: number; available: number; occupancyRate: number }>;
}

interface AvailableBed {
  _id: string;
  bedNumber: number;
  roomType: string;
  ward: string;
  floor: number;
}

interface StepDownRecommendation {
  patient: { _id: string; name: string; bedNumber: number; riskScore: number };
  currentRoom: string;
  suggestedRoom: string;
  reason: string;
  availableBeds: AvailableBed[];
}

interface EscalationRecommendation {
  patient: { _id: string; name: string; bedNumber: number; roomType: string };
  suggestedRoom: string;
  reason: string;
  urgency: string;
  availableBeds: AvailableBed[];
}

const emptyBedForm = {
  bedNumber: '', roomType: 'icu', ward: '', floor: '1', status: 'available', notes: '',
  hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false,
};

export default function BedsPage() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [stats, setStats] = useState<BedStats | null>(null);
  const [stepDownRecs, setStepDownRecs] = useState<StepDownRecommendation[]>([]);
  const [escalationRecs, setEscalationRecs] = useState<EscalationRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { socket } = useSocket();
  const { isAdmin, user } = useAuth();
  const canEditBeds = true; // all roles can manage beds

  // CRUD state
  const [showModal, setShowModal] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [form, setForm] = useState(emptyBedForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Bed | null>(null);

  // Transfer state
  const [transferModal, setTransferModal] = useState<{
    patientId: string; patientName: string; beds: AvailableBed[]; type: 'step-down' | 'escalation';
  } | null>(null);
  const [selectedTargetBed, setSelectedTargetBed] = useState('');
  const [transferring, setTransferring] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('roomType', typeFilter);
      if (statusFilter) params.set('status', statusFilter);

      const [bedsData, statsData, stepDown, escalation] = await Promise.all([
        apiFetch(`/api/beds?${params.toString()}`),
        apiFetch('/api/beds/stats'),
        apiFetch('/api/beds/recommendations/step-down'),
        apiFetch('/api/beds/recommendations/escalation'),
      ]);

      setBeds(bedsData);
      setStats(statsData);
      setStepDownRecs(stepDown);
      setEscalationRecs(escalation);
    } catch (err) {
      console.error('Error fetching bed data:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchData();
    socket.on('bedAllocated', handleUpdate);
    socket.on('bedReleased', handleUpdate);
    socket.on('bedAdded', handleUpdate);
    socket.on('bedUpdated', handleUpdate);
    socket.on('bedDeleted', handleUpdate);
    socket.on('bedTransferred', handleUpdate);
    return () => {
      socket.off('bedAllocated', handleUpdate);
      socket.off('bedReleased', handleUpdate);
      socket.off('bedAdded', handleUpdate);
      socket.off('bedUpdated', handleUpdate);
      socket.off('bedDeleted', handleUpdate);
      socket.off('bedTransferred', handleUpdate);
    };
  }, [socket, fetchData]);

  const openCreate = () => {
    setEditingBed(null);
    setForm(emptyBedForm);
    setShowModal(true);
  };

  const openEdit = (bed: Bed) => {
    setEditingBed(bed);
    setForm({
      bedNumber: String(bed.bedNumber), roomType: bed.roomType, ward: bed.ward,
      floor: String(bed.floor), status: bed.status, notes: bed.notes || '',
      hasVentilator: bed.features.hasVentilator, hasMonitor: bed.features.hasMonitor,
      hasOxygenSupply: bed.features.hasOxygenSupply, isIsolation: bed.features.isIsolation,
      nearNursingStation: bed.features.nearNursingStation,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.bedNumber || !form.roomType || !form.ward) {
      toast.error('Bed number, room type, and ward are required.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        bedNumber: Number(form.bedNumber), roomType: form.roomType, ward: form.ward,
        floor: Number(form.floor), status: form.status, notes: form.notes,
        features: {
          hasVentilator: form.hasVentilator, hasMonitor: form.hasMonitor,
          hasOxygenSupply: form.hasOxygenSupply, isIsolation: form.isIsolation,
          nearNursingStation: form.nearNursingStation,
        },
      };
      if (editingBed) {
        await apiFetch(`/api/beds/${editingBed._id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('Bed updated');
      } else {
        await apiFetch('/api/beds', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Bed created');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bed: Bed) => {
    try {
      await apiFetch(`/api/beds/${bed._id}`, { method: 'DELETE' });
      toast.success('Bed deleted');
      setDeleteConfirm(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete bed');
    }
  };

  const openTransferModal = (patientId: string, patientName: string, availableBeds: AvailableBed[], type: 'step-down' | 'escalation') => {
    setTransferModal({ patientId, patientName, beds: availableBeds, type });
    setSelectedTargetBed(availableBeds.length > 0 ? availableBeds[0]._id : '');
  };

  const handleTransfer = async () => {
    if (!transferModal || !selectedTargetBed) return;
    setTransferring(true);
    try {
      const res = await apiFetch('/api/beds/transfer', {
        method: 'POST',
        body: JSON.stringify({ patientId: transferModal.patientId, targetBedId: selectedTargetBed }),
      });
      toast.success(res.message || 'Patient transferred successfully');
      setTransferModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const bedStatusIcon = (status: string) => {
    switch (status) {
      case 'occupied': return <User className="w-4 h-4 text-blue-500" />;
      case 'available': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-yellow-500" />;
      case 'reserved': return <Shield className="w-4 h-4 text-purple-500" />;
      default: return <BedDouble className="w-4 h-4 text-gray-400" />;
    }
  };

  const bedStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10';
      case 'available': return 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10';
      case 'maintenance': return 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10';
      case 'reserved': return 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10';
      default: return 'border-gray-200 dark:border-slate-700';
    }
  };

  const roomTypeColor = (type: string) => {
    switch (type) {
      case 'icu': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'normal': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'isolation': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'step-down': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <BedDouble className="w-7 h-7 text-icu-500" /> Bed Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Smart allocation & monitoring</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={openCreate} className="btn-primary text-sm !py-2 !px-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Bed
              </button>
              <button onClick={fetchData} className="btn-secondary text-sm !py-2 !px-4 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="glass-card p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Beds</p>
                  <p className="text-3xl font-bold mt-1">{stats?.totalBeds || 0}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Occupied</p>
                  <p className="text-3xl font-bold mt-1 text-blue-500">{stats?.occupied || 0}</p>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1 mt-2">
                    <div className="bg-blue-500 rounded-full h-1" style={{ width: `${((stats?.occupied || 0) / (stats?.totalBeds || 1)) * 100}%` }} />
                  </div>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Available</p>
                  <p className="text-3xl font-bold mt-1 text-green-500">{stats?.available || 0}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Maintenance</p>
                  <p className="text-3xl font-bold mt-1 text-yellow-500">{stats?.maintenance || 0}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Occupancy</p>
                  <p className="text-3xl font-bold mt-1 gradient-text">
                    {stats ? Math.round((stats.occupied / stats.totalBeds) * 100) : 0}%
                  </p>
                </div>
              </div>

              {/* Room Type Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {stats?.byType && Object.entries(stats.byType).map(([type, data]) => (
                  <div key={type} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`status-badge text-[10px] ${roomTypeColor(type)}`}>{type.toUpperCase()}</span>
                      <span className="text-xs text-gray-500">{data.occupied}/{data.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div className={cn('rounded-full h-2 transition-all duration-500', type === 'icu' ? 'bg-red-500' : type === 'normal' ? 'bg-green-500' : type === 'isolation' ? 'bg-purple-500' : 'bg-blue-500')} style={{ width: `${data.total > 0 ? (data.occupied / data.total) * 100 : 0}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{data.available} available</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Recommendations */}
              {(stepDownRecs.length > 0 || escalationRecs.length > 0) && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-hospital-500" /> AI Allocation Recommendations
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {escalationRecs.map((rec, idx) => (
                      <div key={`esc-${idx}`} className="glass-card p-4 border-l-4 border-l-red-500">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ArrowUp className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">Escalation Needed</span>
                          </div>
                          {rec.availableBeds?.length > 0 && (
                            <button
                              onClick={() => openTransferModal(rec.patient._id, rec.patient.name, rec.availableBeds, 'escalation')}
                              className="text-xs font-semibold px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1"
                            >
                              <ArrowUp className="w-3 h-3" /> Escalate
                            </button>
                          )}
                        </div>
                        <p className="text-sm">{rec.reason}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">{rec.patient.roomType}</span>
                          <ArrowUp className="w-3 h-3 text-red-400" />
                          <span className="text-xs font-medium text-red-500">{rec.suggestedRoom}</span>
                          {rec.availableBeds?.length > 0 && (
                            <span className="text-[10px] text-gray-400 ml-auto">{rec.availableBeds.length} bed{rec.availableBeds.length > 1 ? 's' : ''} available</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {stepDownRecs.map((rec, idx) => (
                      <div key={`sd-${idx}`} className="glass-card p-4 border-l-4 border-l-green-500">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ArrowDown className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">Step-Down Opportunity</span>
                          </div>
                          {rec.availableBeds?.length > 0 && (
                            <button
                              onClick={() => openTransferModal(rec.patient._id, rec.patient.name, rec.availableBeds, 'step-down')}
                              className="text-xs font-semibold px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1"
                            >
                              <ArrowDown className="w-3 h-3" /> Transfer
                            </button>
                          )}
                        </div>
                        <p className="text-sm">{rec.reason}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">{rec.currentRoom}</span>
                          <ArrowDown className="w-3 h-3 text-green-400" />
                          <span className="text-xs font-medium text-green-500">{rec.suggestedRoom}</span>
                          {rec.availableBeds?.length > 0 && (
                            <span className="text-[10px] text-gray-400 ml-auto">{rec.availableBeds.length} bed{rec.availableBeds.length > 1 ? 's' : ''} available</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field w-auto">
                  <option value="">All Room Types</option>
                  <option value="icu">ICU</option>
                  <option value="normal">Normal</option>
                  <option value="isolation">Isolation</option>
                  <option value="step-down">Step-Down</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
                  <option value="">All Status</option>
                  <option value="occupied">Occupied</option>
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              {/* Ward Occupancy */}
              {stats?.wardOccupancy && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 uppercase tracking-wider">Ward Occupancy</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Object.entries(stats.wardOccupancy).map(([ward, data]) => (
                      <div key={ward} className="glass-card p-3">
                        <p className="text-xs font-semibold mb-1">{ward}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                          <span>{data.occupied}/{data.total}</span>
                          <span className={cn('font-medium', data.occupancyRate > 80 ? 'text-red-500' : data.occupancyRate > 60 ? 'text-yellow-500' : 'text-green-500')}>{data.occupancyRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                          <div className={cn('rounded-full h-1.5 transition-all', data.occupancyRate > 80 ? 'bg-red-500' : data.occupancyRate > 60 ? 'bg-yellow-500' : 'bg-green-500')} style={{ width: `${data.occupancyRate}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bed Grid */}
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 uppercase tracking-wider">
                All Beds ({beds.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {beds.map(bed => {
                  const hasPatient = bed.patientId && typeof bed.patientId === 'object';
                  const cardContent = (
                    <>
                      {/* Edit/Delete actions */}
                      <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={e => e.preventDefault()}>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(bed); }} className="p-1 rounded bg-white/80 dark:bg-slate-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500" title="Edit">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm(bed); }} className="p-1 rounded bg-white/80 dark:bg-slate-800/80 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500" title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-lg">{bed.bedNumber}</span>
                        {bedStatusIcon(bed.status)}
                      </div>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${roomTypeColor(bed.roomType)}`}>{bed.roomType}</span>
                      <p className="text-[10px] text-gray-500 mt-1">{bed.ward} · F{bed.floor}</p>

                      {hasPatient && (
                        <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-slate-600/50">
                          <p className="text-xs font-medium truncate">{bed.patientId!.name}</p>
                          <span className={`text-[10px] ${getStatusBadgeClasses(bed.patientId!.status)} px-1.5 py-0.5 rounded-full`}>{bed.patientId!.status}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-2">
                        {bed.features.hasVentilator && <span title="Ventilator"><Wind className="w-3 h-3 text-blue-400" /></span>}
                        {bed.features.hasMonitor && <span title="Monitor"><Monitor className="w-3 h-3 text-green-400" /></span>}
                        {bed.features.hasOxygenSupply && <span title="Oxygen"><Droplets className="w-3 h-3 text-cyan-400" /></span>}
                        {bed.features.isIsolation && <span title="Isolation"><Shield className="w-3 h-3 text-purple-400" /></span>}
                        {bed.features.nearNursingStation && <span title="Near Station"><Activity className="w-3 h-3 text-orange-400" /></span>}
                      </div>
                    </>
                  );

                  const cardClasses = cn(
                    'rounded-xl border-2 p-3 transition-all hover:shadow-lg group relative block',
                    bedStatusColor(bed.status),
                    hasPatient && 'cursor-pointer',
                    bed.patientId && bed.patientId.status === 'critical' && 'critical-pulse'
                  );

                  return hasPatient ? (
                    <Link key={bed._id} href={`/patients/${bed.patientId!._id}`} className={cardClasses}>
                      {cardContent}
                    </Link>
                  ) : (
                    <div key={bed._id} className={cardClasses}>
                      {cardContent}
                    </div>
                  );
                })}
              </div>

              {beds.length === 0 && (
                <div className="glass-card p-12 text-center">
                  <BedDouble className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-400 font-medium">No beds match your filters</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Create/Edit Bed Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingBed ? 'Edit Bed' : 'Add New Bed'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bed Number *</label>
              <input type="number" value={form.bedNumber} onChange={e => setForm({ ...form, bedNumber: e.target.value })} className="input-field" placeholder="e.g. 101" disabled={!!editingBed} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room Type *</label>
              <select value={form.roomType} onChange={e => setForm({ ...form, roomType: e.target.value })} className="input-field">
                <option value="icu">ICU</option>
                <option value="normal">Normal</option>
                <option value="isolation">Isolation</option>
                <option value="step-down">Step-Down</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ward *</label>
              <input value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })} className="input-field" placeholder="e.g. ICU-A" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Floor</label>
              <input type="number" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field">
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Features</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'hasVentilator', label: 'Ventilator' },
                { key: 'hasMonitor', label: 'Monitor' },
                { key: 'hasOxygenSupply', label: 'Oxygen Supply' },
                { key: 'isIsolation', label: 'Isolation Room' },
                { key: 'nearNursingStation', label: 'Near Nursing Station' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm({ ...form, [key]: e.target.checked })}
                    className="rounded border-gray-300 text-hospital-500 focus:ring-hospital-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} placeholder="Optional notes..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button onClick={() => setShowModal(false)} className="btn-secondary text-sm !py-2.5 !px-5">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm !py-2.5 !px-5">
              {saving ? 'Saving...' : editingBed ? 'Update Bed' : 'Create Bed'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Bed">
        <p className="text-gray-600 dark:text-gray-300 mb-2">
          Are you sure you want to delete <strong>Bed {deleteConfirm?.bedNumber}</strong>?
        </p>
        {deleteConfirm?.status === 'occupied' && (
          <p className="text-red-500 text-sm mb-4">This bed is currently occupied. Release the patient first.</p>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-sm !py-2.5 !px-5">Cancel</button>
          <button
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            disabled={deleteConfirm?.status === 'occupied'}
            className="bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2.5 px-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Bed
          </button>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        open={!!transferModal}
        onClose={() => setTransferModal(null)}
        title={transferModal?.type === 'step-down' ? 'Step-Down Transfer' : 'Escalation Transfer'}
      >
        {transferModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Transfer <strong>{transferModal.patientName}</strong> to a new bed:
            </p>

            {transferModal.beds.length > 0 ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">Select target bed</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transferModal.beds.map(bed => (
                    <label
                      key={bed._id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                        selectedTargetBed === bed._id
                          ? 'border-hospital-500 bg-hospital-50 dark:bg-hospital-900/20'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      )}
                    >
                      <input
                        type="radio"
                        name="targetBed"
                        value={bed._id}
                        checked={selectedTargetBed === bed._id}
                        onChange={() => setSelectedTargetBed(bed._id)}
                        className="text-hospital-500 focus:ring-hospital-500"
                      />
                      <BedDouble className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <span className="font-mono font-semibold">Bed {bed.bedNumber}</span>
                        <span className="text-xs text-gray-500 ml-2">{bed.ward} · Floor {bed.floor}</span>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        bed.roomType === 'icu' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                        bed.roomType === 'normal' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        bed.roomType === 'step-down' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                      }`}>
                        {bed.roomType}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">No suitable beds available at this time.</p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button onClick={() => setTransferModal(null)} className="btn-secondary text-sm !py-2.5 !px-5">Cancel</button>
              <button
                onClick={handleTransfer}
                disabled={transferring || !selectedTargetBed}
                className={cn(
                  'font-medium text-sm py-2.5 px-5 rounded-xl transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed',
                  transferModal.type === 'step-down'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                )}
              >
                {transferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </ProtectedRoute>
  );
}
