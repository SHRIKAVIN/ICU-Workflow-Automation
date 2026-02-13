'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useSocket, useAuth } from '@/providers';
import { apiFetch } from '@/lib/auth';
import { formatDate, getSeverityColor } from '@/lib/utils';
import { AlertTriangle, Filter, CheckCircle, Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface Alert {
  _id: string;
  patientId: { _id: string; name: string; bedNumber: number } | string;
  message: string;
  severity: string;
  type: string;
  time: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const { socket } = useSocket();
  const { isDoctor } = useAuth();

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (severityFilter) params.set('severity', severityFilter);
      const data = await apiFetch(`/api/alerts?${params.toString()}`);
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [severityFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = (alert: Alert) => {
      setAlerts(prev => [alert, ...prev]);
    };

    const handleAcknowledged = (alert: Alert) => {
      setAlerts(prev => prev.map(a => a._id === alert._id ? { ...a, acknowledged: true, acknowledgedBy: alert.acknowledgedBy } : a));
    };

    socket.on('newAlert', handleNewAlert);
    socket.on('alertAcknowledged', handleAcknowledged);

    return () => {
      socket.off('newAlert', handleNewAlert);
      socket.off('alertAcknowledged', handleAcknowledged);
    };
  }, [socket]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await apiFetch(`/api/alerts/${alertId}/acknowledge`, { method: 'PUT' });
      setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, acknowledged: true } : a));
      toast.success('Alert acknowledged');
    } catch (err) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const mediumCount = alerts.filter(a => a.severity === 'medium' && !a.acknowledged).length;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-7 h-7 text-yellow-500" />
                Alerts
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {alerts.length} total alerts
              </p>
            </div>

            {/* Summary badges */}
            <div className="flex items-center gap-3">
              {criticalCount > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-sm font-semibold">
                  <Bell className="w-4 h-4" />
                  {criticalCount} Critical
                </span>
              )}
              {mediumCount > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-semibold">
                  {mediumCount} Warning
                </span>
              )}
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-3 mb-6">
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="input-field w-auto"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Alerts List */}
          {loading ? (
            <TableSkeleton rows={8} />
          ) : (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <BellOff className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-400 font-medium">No alerts found</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert._id}
                    className={`glass-card p-4 flex items-start gap-4 transition-all ${
                      alert.acknowledged ? 'opacity-60' : ''
                    } ${alert.severity === 'critical' && !alert.acknowledged ? 'border-l-4 border-l-red-500' : ''}`}
                  >
                    {/* Severity indicator */}
                    <div className={`w-3 h-3 mt-1.5 rounded-full flex-shrink-0 ${
                      alert.severity === 'critical' ? 'bg-red-500 critical-pulse' :
                      alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs text-gray-400 uppercase">{alert.type}</span>
                        <span className="text-xs text-gray-400">{formatDate(alert.time)}</span>
                        {alert.acknowledged && (
                          <span className="text-xs text-green-500 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Acknowledged
                            {alert.acknowledgedBy && ` by ${alert.acknowledgedBy}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert._id)}
                        className="flex-shrink-0 p-2 rounded-lg text-hospital-500 hover:bg-hospital-50 dark:hover:bg-hospital-900/20 transition-colors"
                        title="Acknowledge"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
