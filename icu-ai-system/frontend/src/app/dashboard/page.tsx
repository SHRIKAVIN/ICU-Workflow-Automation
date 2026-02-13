'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import LiveVitalsCard from '@/components/LiveVitalsCard';
import RiskBadge from '@/components/RiskBadge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useSocket, useAuth } from '@/providers';
import { apiFetch } from '@/lib/auth';
import { cn, formatDate, getStatusBadgeClasses } from '@/lib/utils';
import {
  BedDouble, Users, AlertTriangle, Activity, Heart, TrendingUp, Clock, Stethoscope,
  ChevronRight, ShieldCheck, Zap, UserCheck, Thermometer, Droplets, Wifi, ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalBeds: number;
  occupied: number;
  critical: number;
  warning: number;
  stable: number;
  icuBeds: number;
  normalBeds: number;
  icuOccupied: number;
  normalOccupied: number;
}

interface BedStats {
  totalBeds: number;
  occupied: number;
  available: number;
  maintenance: number;
  byType: Record<string, { total: number; occupied: number; available: number }>;
  wardOccupancy: Record<string, { total: number; occupied: number; available: number; occupancyRate: number }>;
}

interface Patient {
  _id: string;
  name: string;
  age: number;
  gender: string;
  bedNumber: number;
  roomType: string;
  status: string;
  diagnosis: string;
  riskScore: number;
  updatedAt: string;
}

interface Alert {
  _id: string;
  message: string;
  severity: string;
  time: string;
  acknowledged: boolean;
  patientId?: { name: string; bedNumber: number };
}

interface StaffMember {
  _id: string;
  name: string;
  role: string;
  department: string;
  shift: string;
  isOnDuty: boolean;
  assignedBeds: number[];
}

interface VitalsUpdate {
  patientId: string;
  vitals: { heartRate: number; spo2: number; temperature: number; riskScore: number; bloodPressureSystolic: number; respiratoryRate: number };
  riskScore: number;
  riskLevel: string;
  patientName: string;
  bedNumber: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bedStats, setBedStats] = useState<BedStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [latestVitals, setLatestVitals] = useState<VitalsUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { socket } = useSocket();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      const [statsData, alertsData, patientsData, bedStatsData, staffData] = await Promise.all([
        apiFetch('/api/patients/stats/dashboard'),
        apiFetch('/api/alerts?limit=10'),
        apiFetch('/api/patients'),
        apiFetch('/api/beds/stats'),
        apiFetch('/api/staff'),
      ]);
      setStats(statsData);
      setAlerts(alertsData);
      setPatients(patientsData.filter((p: Patient) => p.status !== 'discharged'));
      setBedStats(bedStatsData);
      setStaff(staffData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleVitalsUpdate = (data: VitalsUpdate) => {
      setLatestVitals(prev => {
        if (!prev || prev.patientId === data.patientId || data.riskScore >= prev.riskScore) return data;
        return prev;
      });
    };

    const handleNewAlert = (alert: Alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 10));
      apiFetch('/api/patients/stats/dashboard').then(setStats).catch(console.error);
    };

    socket.on('updateVitals', handleVitalsUpdate);
    socket.on('newAlert', handleNewAlert);

    return () => {
      socket.off('updateVitals', handleVitalsUpdate);
      socket.off('newAlert', handleNewAlert);
    };
  }, [socket]);

  const criticalPatients = patients.filter(p => p.status === 'critical').sort((a, b) => b.riskScore - a.riskScore);
  const warningPatients = patients.filter(p => p.status === 'warning').sort((a, b) => b.riskScore - a.riskScore);
  const atRiskPatients = [...criticalPatients, ...warningPatients];
  const onDutyStaff = staff.filter(s => s.isOnDuty);
  const occupancyRate = stats ? Math.round((stats.occupied / stats.totalBeds) * 100) : 0;

  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  const roomTypeColors: Record<string, string> = {
    icu: 'from-red-500 to-red-600',
    normal: 'from-green-500 to-green-600',
    isolation: 'from-purple-500 to-purple-600',
    'step-down': 'from-blue-500 to-blue-600',
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {greeting}, <span className="gradient-text">{user?.name?.split(' ').slice(0, 2).join(' ')}</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">ICU Command Center &middot; Real-time monitoring</p>
            </div>
            <div className="mt-3 md:mt-0 flex items-center gap-3">
              <div className="glass-card px-4 py-2.5 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">LIVE</span>
                </div>
                <div className="h-4 w-px bg-gray-300 dark:bg-slate-600" />
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <>
              {/* ── Row 1: Stat Cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="glass-card p-4 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-icu-400/20 to-icu-600/20 rounded-full" />
                  <BedDouble className="w-5 h-5 text-icu-500 mb-2" />
                  <p className="text-2xl font-bold">{stats?.totalBeds || 30}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Total Beds</p>
                </div>
                <div className="glass-card p-4 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full" />
                  <Users className="w-5 h-5 text-blue-500 mb-2" />
                  <p className="text-2xl font-bold text-blue-500">{stats?.occupied || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Occupied</p>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1 mt-2">
                    <div className="bg-blue-500 rounded-full h-1 transition-all" style={{ width: `${occupancyRate}%` }} />
                  </div>
                </div>
                <div className="glass-card p-4 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-full" />
                  <ShieldCheck className="w-5 h-5 text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-green-500">{bedStats?.available || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Available</p>
                </div>
                <div className="glass-card p-4 relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-red-400/20 to-red-600/20 rounded-full" />
                  <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
                  <p className="text-2xl font-bold text-red-500">{stats?.critical || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Critical</p>
                  {(stats?.critical || 0) > 0 && <div className="absolute inset-0 rounded-2xl critical-pulse pointer-events-none" />}
                </div>
                <div className="glass-card p-4 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 rounded-full" />
                  <Activity className="w-5 h-5 text-yellow-500 mb-2" />
                  <p className="text-2xl font-bold text-yellow-500">{stats?.warning || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Warning</p>
                </div>
                <div className="glass-card p-4 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-hospital-400/20 to-hospital-600/20 rounded-full" />
                  <Heart className="w-5 h-5 text-hospital-500 mb-2" />
                  <p className="text-2xl font-bold text-hospital-500">{stats?.stable || 0}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Stable</p>
                </div>
              </div>

              {/* ── Row 2: Bed Occupancy + Critical Patients ── */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                {/* Bed Occupancy by Type */}
                <div className="lg:col-span-2">
                  <div className="glass-card p-6 h-full">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <BedDouble className="w-4 h-4" /> Bed Occupancy
                      </h2>
                      <span className="text-2xl font-bold gradient-text">{occupancyRate}%</span>
                    </div>
                    <div className="space-y-4">
                      {bedStats?.byType && Object.entries(bedStats.byType).map(([type, data]) => (
                        <div key={type}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${roomTypeColors[type] || 'from-gray-400 to-gray-500'}`} />
                              <span className="text-sm font-medium capitalize">{type === 'step-down' ? 'Step-Down' : type.toUpperCase()}</span>
                            </div>
                            <span className="text-sm text-gray-500 tabular-nums">{data.occupied}/{data.total}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                            <div className={`bg-gradient-to-r ${roomTypeColors[type] || 'from-gray-400 to-gray-500'} rounded-full h-2.5 transition-all duration-700`} style={{ width: `${data.total > 0 ? (data.occupied / data.total) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Ward Summary */}
                    {bedStats?.wardOccupancy && (
                      <div className="mt-5 pt-4 border-t border-gray-200/50 dark:border-slate-700/50">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 font-semibold">By Ward</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(bedStats.wardOccupancy).map(([ward, data]) => (
                            <span key={ward} className={cn(
                              'text-[10px] font-medium px-2 py-1 rounded-lg',
                              data.occupancyRate > 80 ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                              data.occupancyRate > 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            )}>
                              {ward} {data.occupancyRate}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Critical & Warning Patients */}
                <div className="lg:col-span-3">
                  <div className="glass-card p-6 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-red-500" /> Patients Requiring Attention
                      </h2>
                      <Link href="/patients" className="text-xs text-hospital-500 hover:text-hospital-600 font-medium flex items-center gap-1">
                        View all <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                    {atRiskPatients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <ShieldCheck className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm font-medium">All patients stable</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {atRiskPatients.map(p => (
                          <Link key={p._id} href={`/patients/${p._id}`}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-md group',
                              p.status === 'critical'
                                ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200/50 dark:border-red-800/30'
                                : 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 border border-yellow-200/50 dark:border-yellow-800/30'
                            )}
                          >
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md',
                              p.status === 'critical' ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                            )}>
                              {p.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">{p.name}</p>
                                <span className={`status-badge text-[10px] !py-0.5 !px-2 ${getStatusBadgeClasses(p.status)}`}>{p.status}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" /> Bed {p.bedNumber}</span>
                                <span className="uppercase">{p.roomType}</span>
                                <span className="truncate">{p.diagnosis}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <RiskBadge score={p.riskScore} size="sm" />
                              <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Row 3: Live Vitals (Full Width) ── */}
              <div className="mb-6">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500 animate-pulse" /> Live Vitals Monitor
                    </h2>
                    {latestVitals && (
                      <Link href={`/patients/${latestVitals.patientId}`} className="flex items-center gap-2 text-sm hover:text-hospital-500 transition-colors">
                        <div className={cn(
                          'w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold',
                          latestVitals.riskLevel === 'critical' ? 'bg-red-500' : latestVitals.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        )}>
                          {latestVitals.patientName?.charAt(0)}
                        </div>
                        <span className="font-medium">{latestVitals.patientName}</span>
                        <span className="text-xs text-gray-400">Bed {latestVitals.bedNumber}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <LiveVitalsCard label="Heart Rate" value={latestVitals?.vitals?.heartRate?.toFixed(0) || '--'} unit="bpm" icon="heart"
                      status={latestVitals?.vitals?.heartRate ? (latestVitals.vitals.heartRate > 110 ? 'critical' : latestVitals.vitals.heartRate > 100 ? 'warning' : 'normal') : 'normal'} />
                    <LiveVitalsCard label="SpO2" value={latestVitals?.vitals?.spo2?.toFixed(1) || '--'} unit="%" icon="oxygen"
                      status={latestVitals?.vitals?.spo2 ? (latestVitals.vitals.spo2 < 92 ? 'critical' : latestVitals.vitals.spo2 < 95 ? 'warning' : 'normal') : 'normal'} />
                    <LiveVitalsCard label="Temperature" value={latestVitals?.vitals?.temperature?.toFixed(1) || '--'} unit="°C" icon="temperature"
                      status={latestVitals?.vitals?.temperature ? (latestVitals.vitals.temperature > 38.5 ? 'critical' : latestVitals.vitals.temperature > 37.5 ? 'warning' : 'normal') : 'normal'} />
                    <LiveVitalsCard label="Blood Pressure" value={latestVitals?.vitals?.bloodPressureSystolic?.toFixed(0) || '--'} unit="mmHg" icon="activity"
                      status={latestVitals?.vitals?.bloodPressureSystolic ? (latestVitals.vitals.bloodPressureSystolic > 160 ? 'critical' : latestVitals.vitals.bloodPressureSystolic > 140 ? 'warning' : 'normal') : 'normal'} />
                    <LiveVitalsCard label="Resp. Rate" value={latestVitals?.vitals?.respiratoryRate?.toFixed(0) || '--'} unit="/min" icon="activity"
                      status={latestVitals?.vitals?.respiratoryRate ? (latestVitals.vitals.respiratoryRate > 25 ? 'critical' : latestVitals.vitals.respiratoryRate > 20 ? 'warning' : 'normal') : 'normal'} />
                    <LiveVitalsCard label="AI Risk" value={latestVitals ? (latestVitals.riskScore * 100).toFixed(0) : '--'} unit="%" icon="activity"
                      status={latestVitals?.riskScore ? (latestVitals.riskScore > 0.7 ? 'critical' : latestVitals.riskScore > 0.4 ? 'warning' : 'normal') : 'normal'} />
                  </div>
                </div>
              </div>

              {/* ── Row 4: Alerts + Staff On Duty ── */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                {/* Recent Alerts */}
                <div className="lg:col-span-3">
                  <div className="glass-card h-full">
                    <div className="flex items-center justify-between px-6 pt-5 pb-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" /> Recent Alerts
                      </h2>
                      <Link href="/alerts" className="text-xs text-hospital-500 hover:text-hospital-600 font-medium flex items-center gap-1">
                        View all <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-700/50 max-h-[320px] overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                          <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No recent alerts</p>
                        </div>
                      ) : (
                        alerts.map(alert => (
                          <div key={alert._id} className="px-6 py-3 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'w-2 h-2 mt-2 rounded-full flex-shrink-0',
                                alert.severity === 'critical' ? 'bg-red-500 critical-pulse' : alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                              )} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{alert.message}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`status-badge text-[10px] !py-0 !px-2 ${getStatusBadgeClasses(alert.severity === 'medium' ? 'warning' : alert.severity)}`}>
                                    {alert.severity}
                                  </span>
                                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {formatDate(alert.time)}
                                  </span>
                                  {alert.acknowledged && <span className="text-[10px] text-green-500 font-medium">Ack</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Staff On Duty */}
                <div className="lg:col-span-2">
                  <div className="glass-card p-6 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-hospital-500" /> Staff On Duty
                      </h2>
                      <Link href="/staff" className="text-xs text-hospital-500 hover:text-hospital-600 font-medium flex items-center gap-1">
                        All staff <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                    {onDutyStaff.length === 0 ? (
                      <div className="text-center py-6 text-gray-400">
                        <p className="text-sm">No staff on duty</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {onDutyStaff.map(s => (
                          <div key={s._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className={cn(
                              'w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0',
                              s.role === 'doctor' ? 'bg-gradient-to-br from-icu-400 to-icu-600' : 'bg-gradient-to-br from-hospital-400 to-hospital-600'
                            )}>
                              {s.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{s.name}</p>
                              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <span className="capitalize flex items-center gap-1">
                                  <Stethoscope className="w-3 h-3" /> {s.role}
                                </span>
                                <span>{s.department}</span>
                              </div>
                            </div>
                            {s.assignedBeds.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {s.assignedBeds.slice(0, 3).map(b => (
                                  <span key={b} className="text-[10px] font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{b}</span>
                                ))}
                                {s.assignedBeds.length > 3 && <span className="text-[10px] text-gray-400">+{s.assignedBeds.length - 3}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Row 5: Quick Navigation ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/patients" className="glass-card-hover p-5 flex items-center gap-4 group">
                  <div className="p-3 rounded-xl bg-hospital-50 dark:bg-hospital-900/20 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 text-hospital-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Patients</p>
                    <p className="text-xs text-gray-500">{patients.length} registered</p>
                  </div>
                </Link>
                <Link href="/beds" className="glass-card-hover p-5 flex items-center gap-4 group">
                  <div className="p-3 rounded-xl bg-icu-50 dark:bg-icu-900/20 group-hover:scale-110 transition-transform">
                    <BedDouble className="w-5 h-5 text-icu-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Beds</p>
                    <p className="text-xs text-gray-500">{bedStats?.available || 0} available</p>
                  </div>
                </Link>
                <Link href="/alerts" className="glass-card-hover p-5 flex items-center gap-4 group">
                  <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Alerts</p>
                    <p className="text-xs text-gray-500">{alerts.filter(a => !a.acknowledged).length} unread</p>
                  </div>
                </Link>
                <Link href="/staff" className="glass-card-hover p-5 flex items-center gap-4 group">
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 group-hover:scale-110 transition-transform">
                    <Stethoscope className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Staff</p>
                    <p className="text-xs text-gray-500">{onDutyStaff.length} on duty</p>
                  </div>
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
