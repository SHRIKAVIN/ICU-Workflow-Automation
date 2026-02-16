'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import VitalsChart from '@/components/VitalsChart';
import LiveVitalsCard from '@/components/LiveVitalsCard';
import RiskBadge from '@/components/RiskBadge';
import Modal from '@/components/ui/Modal';
import { ChartSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { useSocket, useAuth } from '@/providers';
import { apiFetch } from '@/lib/auth';
import { cn, formatDate, getStatusBadgeClasses } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRightLeft,
  BedDouble,
  Calendar,
  User,
  Stethoscope,
  Download,
  Activity,
  Clock,
  AlertTriangle,
  Wind,
  Monitor,
  Droplets,
  Shield,
  Video,
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

interface AvailableBed {
  _id: string;
  bedNumber: number;
  roomType: string;
  ward: string;
  floor: number;
  features: {
    hasVentilator: boolean;
    hasMonitor: boolean;
    hasOxygenSupply: boolean;
    isIsolation: boolean;
    nearNursingStation: boolean;
  };
}

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<VitalsData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const { user } = useAuth();
  const canChangeRoom = user?.role === 'doctor' || user?.role === 'nurse';
  const chartRef = useRef<HTMLDivElement>(null);

  // Change bed state
  const [showBedModal, setShowBedModal] = useState(false);
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [selectedBed, setSelectedBed] = useState('');
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [transferring, setTransferring] = useState(false);

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

  const openChangeBed = async () => {
    setShowBedModal(true);
    setLoadingBeds(true);
    try {
      const beds = await apiFetch('/api/beds?status=available');
      setAvailableBeds(beds);
      setSelectedBed(beds.length > 0 ? beds[0]._id : '');
    } catch (err) {
      toast.error('Failed to load available beds');
    } finally {
      setLoadingBeds(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedBed || !patient) return;
    setTransferring(true);
    try {
      const res = await apiFetch('/api/beds/transfer', {
        method: 'POST',
        body: JSON.stringify({ patientId: patient._id, targetBedId: selectedBed }),
      });
      toast.success(res.message || 'Bed changed successfully');
      setShowBedModal(false);
      fetchData(); // refresh patient data
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed');
    } finally {
      setTransferring(false);
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
                        {canChangeRoom && (
                          <button
                            onClick={openChangeBed}
                            className="flex items-center gap-1 text-xs font-medium text-hospital-500 hover:text-hospital-600 bg-hospital-50 dark:bg-hospital-900/20 hover:bg-hospital-100 dark:hover:bg-hospital-900/30 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <ArrowRightLeft className="w-3 h-3" /> Change Bed
                          </button>
                        )}
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

              {/* Live Patient Video (dummy placeholder) */}
              <div className="glass-card overflow-hidden mb-6">
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-slate-700/50">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Video className="w-5 h-5 text-hospital-500" />
                    Live Patient Video
                  </h2>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="relative aspect-video bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 overflow-hidden">
                  {/* Simulated video placeholder - scan line effect */}
                  <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                    <Video className="w-16 h-16 mb-3 opacity-40" />
                    <p className="text-sm font-medium">Bed {patient.bedNumber} · Room Camera</p>
                    <p className="text-xs mt-1 opacity-75">camera feed will display here</p>
                    <p className="text-[10px] mt-4 text-gray-600">{new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
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

      {/* Change Bed Modal */}
      <Modal open={showBedModal} onClose={() => setShowBedModal(false)} title="Change Patient Bed" maxWidth="max-w-lg">
        {loadingBeds ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-3 border-hospital-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Current: <strong>Bed {patient?.bedNumber}</strong> ({patient?.roomType})
            </p>

            {availableBeds.length > 0 ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">Select new bed</label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {availableBeds.map(bed => (
                    <label
                      key={bed._id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                        selectedBed === bed._id
                          ? 'border-hospital-500 bg-hospital-50 dark:bg-hospital-900/20'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      )}
                    >
                      <input
                        type="radio"
                        name="targetBed"
                        value={bed._id}
                        checked={selectedBed === bed._id}
                        onChange={() => setSelectedBed(bed._id)}
                        className="text-hospital-500 focus:ring-hospital-500"
                      />
                      <BedDouble className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">Bed {bed.bedNumber}</span>
                          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${roomTypeColor(bed.roomType)}`}>{bed.roomType}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{bed.ward} · Floor {bed.floor}</span>
                          <div className="flex items-center gap-1 ml-auto">
                            {bed.features?.hasVentilator && <span title="Ventilator"><Wind className="w-3 h-3 text-blue-400" /></span>}
                            {bed.features?.hasMonitor && <span title="Monitor"><Monitor className="w-3 h-3 text-green-400" /></span>}
                            {bed.features?.hasOxygenSupply && <span title="Oxygen"><Droplets className="w-3 h-3 text-cyan-400" /></span>}
                            {bed.features?.isIsolation && <span title="Isolation"><Shield className="w-3 h-3 text-purple-400" /></span>}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 py-4 text-center">No available beds at this time.</p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button onClick={() => setShowBedModal(false)} className="btn-secondary text-sm !py-2.5 !px-5">Cancel</button>
              <button
                onClick={handleTransfer}
                disabled={transferring || !selectedBed || availableBeds.length === 0}
                className="btn-primary text-sm !py-2.5 !px-5 disabled:opacity-50 disabled:cursor-not-allowed"
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
