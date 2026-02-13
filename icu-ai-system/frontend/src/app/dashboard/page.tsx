'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import LiveVitalsCard from '@/components/LiveVitalsCard';
import RiskBadge from '@/components/RiskBadge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useSocket, useAuth } from '@/providers';
import { apiFetch } from '@/lib/auth';
import { formatDate, getStatusBadgeClasses } from '@/lib/utils';
import { BedDouble, Users, AlertTriangle, Activity, Heart, TrendingUp, Clock } from 'lucide-react';
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

interface Alert {
  _id: string;
  message: string;
  severity: string;
  time: string;
  patientId?: { name: string; bedNumber: number };
}

interface VitalsUpdate {
  patientId: string;
  vitals: { heartRate: number; spo2: number; temperature: number; riskScore: number };
  riskScore: number;
  riskLevel: string;
  patientName: string;
  bedNumber: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [latestVitals, setLatestVitals] = useState<VitalsUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      const [statsData, alertsData] = await Promise.all([
        apiFetch('/api/patients/stats/dashboard'),
        apiFetch('/api/alerts/recent'),
      ]);
      setStats(statsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleVitalsUpdate = (data: VitalsUpdate) => {
      setLatestVitals(data);
    };

    const handleNewAlert = (alert: Alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 5));
      // Refresh stats on new alert
      apiFetch('/api/patients/stats/dashboard').then(setStats).catch(console.error);
    };

    socket.on('updateVitals', handleVitalsUpdate);
    socket.on('newAlert', handleNewAlert);

    return () => {
      socket.off('updateVitals', handleVitalsUpdate);
      socket.off('newAlert', handleNewAlert);
    };
  }, [socket]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Here&apos;s your ICU overview for today
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Beds</p>
                      <p className="text-3xl font-bold mt-1">{stats?.totalBeds || 30}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-icu-50 dark:bg-icu-900/20">
                      <BedDouble className="w-6 h-6 text-icu-500" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">ICU: {stats?.icuOccupied || 0}/{stats?.icuBeds || 15}</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">Normal: {stats?.normalOccupied || 0}/{stats?.normalBeds || 15}</span>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Occupied</p>
                      <p className="text-3xl font-bold mt-1">{stats?.occupied || 0}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-hospital-50 dark:bg-hospital-900/20">
                      <Users className="w-6 h-6 text-hospital-500" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className="bg-hospital-500 rounded-full h-1.5 transition-all duration-500"
                        style={{ width: `${((stats?.occupied || 0) / (stats?.totalBeds || 30)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Critical</p>
                      <p className="text-3xl font-bold mt-1 text-red-500">{stats?.critical || 0}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-red-500 font-medium">Needs immediate attention</p>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Warning</p>
                      <p className="text-3xl font-bold mt-1 text-yellow-500">{stats?.warning || 0}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20">
                      <Activity className="w-6 h-6 text-yellow-500" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-yellow-600 dark:text-yellow-400 font-medium">Under close monitoring</p>
                </div>
              </div>

              {/* Live Vitals + Recent Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Vitals Section */}
                <div className="lg:col-span-2">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Live Vitals
                    {latestVitals && (
                      <span className="text-xs text-gray-400 font-normal">
                        Last: {latestVitals.patientName} (Bed {latestVitals.bedNumber})
                      </span>
                    )}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <LiveVitalsCard
                      label="Heart Rate"
                      value={latestVitals?.vitals?.heartRate?.toFixed(0) || '--'}
                      unit="bpm"
                      icon="heart"
                      status={
                        latestVitals?.vitals?.heartRate
                          ? latestVitals.vitals.heartRate > 110
                            ? 'critical'
                            : latestVitals.vitals.heartRate > 100
                              ? 'warning'
                              : 'normal'
                          : 'normal'
                      }
                    />
                    <LiveVitalsCard
                      label="SpO2"
                      value={latestVitals?.vitals?.spo2?.toFixed(1) || '--'}
                      unit="%"
                      icon="oxygen"
                      status={
                        latestVitals?.vitals?.spo2
                          ? latestVitals.vitals.spo2 < 92
                            ? 'critical'
                            : latestVitals.vitals.spo2 < 95
                              ? 'warning'
                              : 'normal'
                          : 'normal'
                      }
                    />
                    <LiveVitalsCard
                      label="Temperature"
                      value={latestVitals?.vitals?.temperature?.toFixed(1) || '--'}
                      unit="°C"
                      icon="temperature"
                      status={
                        latestVitals?.vitals?.temperature
                          ? latestVitals.vitals.temperature > 38.5
                            ? 'critical'
                            : latestVitals.vitals.temperature > 37.5
                              ? 'warning'
                              : 'normal'
                          : 'normal'
                      }
                    />
                    <LiveVitalsCard
                      label="AI Risk"
                      value={latestVitals ? (latestVitals.riskScore * 100).toFixed(0) : '--'}
                      unit="%"
                      icon="activity"
                      status={
                        latestVitals?.riskScore
                          ? latestVitals.riskScore > 0.7
                            ? 'critical'
                            : latestVitals.riskScore > 0.4
                              ? 'warning'
                              : 'normal'
                          : 'normal'
                      }
                    />
                  </div>

                  {/* Quick Links */}
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Link href="/patients" className="glass-card-hover p-4 flex items-center gap-3">
                      <Users className="w-5 h-5 text-hospital-500" />
                      <span className="text-sm font-medium">View Patients</span>
                    </Link>
                    <Link href="/beds" className="glass-card-hover p-4 flex items-center gap-3">
                      <BedDouble className="w-5 h-5 text-icu-500" />
                      <span className="text-sm font-medium">Bed Management</span>
                    </Link>
                    <Link href="/alerts" className="glass-card-hover p-4 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm font-medium">All Alerts</span>
                    </Link>
                  </div>
                </div>

                {/* Recent Alerts */}
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Recent Alerts
                  </h2>
                  <div className="glass-card divide-y divide-gray-100 dark:divide-slate-700/50">
                    {alerts.length === 0 ? (
                      <div className="p-6 text-center text-gray-400">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No recent alerts</p>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div key={alert._id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                              alert.severity === 'critical' ? 'bg-red-500 critical-pulse' :
                              alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{alert.message}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`status-badge text-[10px] ${getStatusBadgeClasses(alert.severity === 'medium' ? 'warning' : alert.severity)}`}>
                                  {alert.severity}
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(alert.time)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="p-3">
                      <Link href="/alerts" className="text-xs text-hospital-500 hover:text-hospital-600 font-medium flex items-center justify-center gap-1">
                        View all alerts
                        <TrendingUp className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
