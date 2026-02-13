'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useSocket, useAuth } from '@/providers';
import { apiFetch } from '@/lib/auth';
import { cn, getStatusBadgeClasses } from '@/lib/utils';
import {
  BedDouble,
  User,
  AlertTriangle,
  Wrench,
  CheckCircle,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Brain,
  Shield,
  Wind,
  Activity,
  Monitor,
  Droplets,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

interface StepDownRecommendation {
  patient: { _id: string; name: string; bedNumber: number; riskScore: number };
  currentRoom: string;
  suggestedRoom: string;
  reason: string;
}

interface EscalationRecommendation {
  patient: { _id: string; name: string; bedNumber: number; roomType: string };
  suggestedRoom: string;
  reason: string;
  urgency: string;
}

export default function BedsPage() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [stats, setStats] = useState<BedStats | null>(null);
  const [stepDownRecs, setStepDownRecs] = useState<StepDownRecommendation[]>([]);
  const [escalationRecs, setEscalationRecs] = useState<EscalationRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { socket } = useSocket();
  const { isDoctor } = useAuth();

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchData();
    socket.on('bedAllocated', handleUpdate);
    socket.on('bedReleased', handleUpdate);
    return () => {
      socket.off('bedAllocated', handleUpdate);
      socket.off('bedReleased', handleUpdate);
    };
  }, [socket, fetchData]);

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
                <BedDouble className="w-7 h-7 text-icu-500" />
                Bed Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Smart allocation & monitoring
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchData} className="btn-secondary text-sm !py-2 !px-4">
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
                      <span className={`status-badge text-[10px] ${roomTypeColor(type)}`}>
                        {type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{data.occupied}/{data.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={cn('rounded-full h-2 transition-all duration-500', type === 'icu' ? 'bg-red-500' : type === 'normal' ? 'bg-green-500' : type === 'isolation' ? 'bg-purple-500' : 'bg-blue-500')}
                        style={{ width: `${data.total > 0 ? (data.occupied / data.total) * 100 : 0}%` }}
                      />
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
                    <Sparkles className="w-5 h-5 text-hospital-500" />
                    AI Allocation Recommendations
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Escalation recommendations */}
                    {escalationRecs.map((rec, idx) => (
                      <div key={`esc-${idx}`} className="glass-card p-4 border-l-4 border-l-red-500">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowUp className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">Escalation Needed</span>
                        </div>
                        <p className="text-sm">{rec.reason}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">{rec.patient.roomType}</span>
                          <ArrowUp className="w-3 h-3 text-red-400" />
                          <span className="text-xs font-medium text-red-500">{rec.suggestedRoom}</span>
                        </div>
                      </div>
                    ))}

                    {/* Step-down recommendations */}
                    {stepDownRecs.map((rec, idx) => (
                      <div key={`sd-${idx}`} className="glass-card p-4 border-l-4 border-l-green-500">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowDown className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">Step-Down Opportunity</span>
                        </div>
                        <p className="text-sm">{rec.reason}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">{rec.currentRoom}</span>
                          <ArrowDown className="w-3 h-3 text-green-400" />
                          <span className="text-xs font-medium text-green-500">{rec.suggestedRoom}</span>
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
                          <span className={cn('font-medium',
                            data.occupancyRate > 80 ? 'text-red-500' :
                            data.occupancyRate > 60 ? 'text-yellow-500' : 'text-green-500'
                          )}>
                            {data.occupancyRate}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                          <div
                            className={cn('rounded-full h-1.5 transition-all',
                              data.occupancyRate > 80 ? 'bg-red-500' :
                              data.occupancyRate > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            )}
                            style={{ width: `${data.occupancyRate}%` }}
                          />
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
                {beds.map(bed => (
                  <div
                    key={bed._id}
                    className={cn(
                      'rounded-xl border-2 p-3 transition-all hover:shadow-lg cursor-default',
                      bedStatusColor(bed.status),
                      bed.patientId && bed.patientId.status === 'critical' && 'critical-pulse'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-lg">{bed.bedNumber}</span>
                      {bedStatusIcon(bed.status)}
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${roomTypeColor(bed.roomType)}`}>
                      {bed.roomType}
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">{bed.ward} · F{bed.floor}</p>

                    {/* Patient info if occupied */}
                    {bed.patientId && typeof bed.patientId === 'object' && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-slate-600/50">
                        <p className="text-xs font-medium truncate">{bed.patientId.name}</p>
                        <span className={`text-[10px] ${getStatusBadgeClasses(bed.patientId.status)} px-1.5 py-0.5 rounded-full`}>
                          {bed.patientId.status}
                        </span>
                      </div>
                    )}

                    {/* Features icons */}
                    <div className="flex items-center gap-1 mt-2">
                      {bed.features.hasVentilator && <span title="Ventilator"><Wind className="w-3 h-3 text-blue-400" /></span>}
                      {bed.features.hasMonitor && <span title="Monitor"><Monitor className="w-3 h-3 text-green-400" /></span>}
                      {bed.features.hasOxygenSupply && <span title="Oxygen"><Droplets className="w-3 h-3 text-cyan-400" /></span>}
                      {bed.features.isIsolation && <span title="Isolation"><Shield className="w-3 h-3 text-purple-400" /></span>}
                      {bed.features.nearNursingStation && <span title="Near Station"><Activity className="w-3 h-3 text-orange-400" /></span>}
                    </div>
                  </div>
                ))}
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
    </ProtectedRoute>
  );
}
