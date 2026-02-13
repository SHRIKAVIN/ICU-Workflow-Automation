'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import VitalsChart from '@/components/VitalsChart';
import LiveVitalsCard from '@/components/LiveVitalsCard';
import RiskBadge from '@/components/RiskBadge';
import { ChartSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { useSocket } from '@/providers';
import { apiFetch } from '@/lib/auth';
import { formatDate, getStatusBadgeClasses } from '@/lib/utils';
import {
  ArrowLeft,
  BedDouble,
  Calendar,
  User,
  Stethoscope,
  Download,
  Activity,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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
  admissionDate: string;
  assignedDoctor: string;
  assignedNurse: string;
  allergies: string[];
  notes: string;
}

interface VitalsData {
  _id: string;
  heartRate: number;
  spo2: number;
  temperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  respiratoryRate: number;
  riskScore: number;
  riskLevel: string;
  timestamp: string;
}

interface AlertData {
  _id: string;
  message: string;
  severity: string;
  time: string;
  acknowledged: boolean;
}

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<VitalsData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const chartRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [patientData, vitalsData, alertsData] = await Promise.all([
        apiFetch(`/api/patients/${id}`),
        apiFetch(`/api/vitals/${id}?limit=100`),
        apiFetch(`/api/alerts?limit=20`),
      ]);
      setPatient(patientData);
      setVitals(vitalsData);
      // Filter alerts for this patient
      setAlerts(alertsData.filter((a: any) =>
        a.patientId === id || a.patientId?._id === id
      ));
    } catch (err) {
      console.error('Error fetching patient data:', err);
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time vitals updates
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('joinPatientRoom', id);

    const handleVitals = (data: VitalsData) => {
      setVitals(prev => [...prev.slice(-99), data]);
    };

    const handleVitalsUpdate = (data: any) => {
      if (data.patientId === id) {
        setVitals(prev => [...prev.slice(-99), data.vitals]);
        if (patient) {
          setPatient(prev => prev ? { ...prev, riskScore: data.riskScore } : prev);
        }
      }
    };

    socket.on('patientVitals', handleVitals);
    socket.on('updateVitals', handleVitalsUpdate);

    return () => {
      socket.emit('leavePatientRoom', id);
      socket.off('patientVitals', handleVitals);
      socket.off('updateVitals', handleVitalsUpdate);
    };
  }, [socket, id, patient]);

  const exportPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      if (!chartRef.current) return;

      toast.loading('Generating PDF report...');
      const canvas = await html2canvas(chartRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFontSize(18);
      pdf.text(`Patient Report: ${patient?.name || 'Unknown'}`, 14, 15);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()} | Bed: ${patient?.bedNumber} | Status: ${patient?.status}`, 14, 22);
      pdf.addImage(imgData, 'PNG', 10, 28, pdfWidth - 20, pdfHeight - 20);
      pdf.save(`patient-report-${patient?.name?.replace(/\s/g, '-')}-${Date.now()}.pdf`);

      toast.dismiss();
      toast.success('PDF report downloaded');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const latestVitals = vitals.length > 0 ? vitals[vitals.length - 1] : null;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          {/* Back button */}
          <Link href="/patients" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Patients</span>
          </Link>

          {loading ? (
            <div className="space-y-6">
              <CardSkeleton />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
            </div>
          ) : patient ? (
            <>
              {/* Patient Info Card */}
              <div className="glass-card p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-hospital-400 to-icu-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{patient.name}</h1>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {patient.gender}, {patient.age}y</span>
                        <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> Bed {patient.bedNumber}</span>
                        <span className="flex items-center gap-1 uppercase text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">{patient.roomType}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Admitted {formatDate(patient.admissionDate)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`status-badge text-sm ${getStatusBadgeClasses(patient.status)}`}>
                      {patient.status}
                    </span>
                    <RiskBadge score={patient.riskScore} size="md" />
                    <button onClick={exportPDF} className="btn-secondary text-sm !py-2 !px-4">
                      <Download className="w-4 h-4" /> Export PDF
                    </button>
                  </div>
                </div>

                {/* Diagnosis & Care Team */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-slate-700/50">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Diagnosis</p>
                    <p className="font-medium">{patient.diagnosis || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Attending Doctor</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-icu-500" />
                      {patient.assignedDoctor || 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Assigned Nurse</p>
                    <p className="font-medium">{patient.assignedNurse || 'Unassigned'}</p>
                  </div>
                </div>
              </div>

              {/* Live Vitals Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                <LiveVitalsCard
                  label="Heart Rate"
                  value={latestVitals?.heartRate?.toFixed(0) || '--'}
                  unit="bpm"
                  icon="heart"
                  status={latestVitals ? (latestVitals.heartRate > 110 ? 'critical' : latestVitals.heartRate > 100 ? 'warning' : 'normal') : 'normal'}
                />
                <LiveVitalsCard
                  label="SpO2"
                  value={latestVitals?.spo2?.toFixed(1) || '--'}
                  unit="%"
                  icon="oxygen"
                  status={latestVitals ? (latestVitals.spo2 < 92 ? 'critical' : latestVitals.spo2 < 95 ? 'warning' : 'normal') : 'normal'}
                />
                <LiveVitalsCard
                  label="Temperature"
                  value={latestVitals?.temperature?.toFixed(1) || '--'}
                  unit="°C"
                  icon="temperature"
                  status={latestVitals ? (latestVitals.temperature > 38.5 ? 'critical' : latestVitals.temperature > 37.5 ? 'warning' : 'normal') : 'normal'}
                />
                <LiveVitalsCard
                  label="BP Systolic"
                  value={latestVitals?.bloodPressureSystolic?.toFixed(0) || '--'}
                  unit="mmHg"
                  icon="activity"
                  status={latestVitals ? (latestVitals.bloodPressureSystolic > 160 ? 'critical' : latestVitals.bloodPressureSystolic > 140 ? 'warning' : 'normal') : 'normal'}
                />
                <LiveVitalsCard
                  label="Resp. Rate"
                  value={latestVitals?.respiratoryRate?.toFixed(0) || '--'}
                  unit="/min"
                  icon="activity"
                  status={latestVitals ? (latestVitals.respiratoryRate > 25 ? 'critical' : latestVitals.respiratoryRate > 20 ? 'warning' : 'normal') : 'normal'}
                />
                <LiveVitalsCard
                  label="AI Risk"
                  value={latestVitals ? (latestVitals.riskScore * 100).toFixed(0) : '--'}
                  unit="%"
                  icon="activity"
                  status={latestVitals ? (latestVitals.riskScore > 0.7 ? 'critical' : latestVitals.riskScore > 0.4 ? 'warning' : 'normal') : 'normal'}
                />
              </div>

              {/* Charts */}
              <div ref={chartRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <VitalsChart
                  data={vitals}
                  metric="heartRate"
                  title="Heart Rate"
                  unit="bpm"
                  color="#EF4444"
                  dangerHigh={110}
                />
                <VitalsChart
                  data={vitals}
                  metric="spo2"
                  title="Blood Oxygen (SpO2)"
                  unit="%"
                  color="#3B82F6"
                  dangerLow={92}
                />
                <VitalsChart
                  data={vitals}
                  metric="temperature"
                  title="Temperature"
                  unit="°C"
                  color="#F59E0B"
                  dangerHigh={38.5}
                />
                <VitalsChart
                  data={vitals}
                  metric="bloodPressureSystolic"
                  title="Blood Pressure (Systolic)"
                  unit="mmHg"
                  color="#8B5CF6"
                  dangerHigh={160}
                />
              </div>

              {/* Alert History */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Alert History
                </h2>
                {alerts.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4 text-center">No alerts for this patient</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map(alert => (
                      <div key={alert._id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                          alert.severity === 'critical' ? 'bg-red-500' :
                          alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {alert.severity}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(alert.time)}
                            </span>
                            {alert.acknowledged && (
                              <span className="text-xs text-green-500 font-medium">Acknowledged</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold">Patient not found</h2>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
