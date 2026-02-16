'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import RiskBadge from '@/components/RiskBadge';
import Modal from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useSocket, useAuth, useSidebar } from '@/providers';
import { apiFetch } from '@/lib/auth';
import { getStatusBadgeClasses, formatDate } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Search, UserPlus, ChevronRight, BedDouble, Users, Pencil, Trash2 } from 'lucide-react';

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
  assignedDoctor: string;
  assignedNurse: string;
}

const emptyForm = {
  name: '', age: '', gender: 'Male', bedNumber: '', roomType: 'icu',
  status: 'stable', diagnosis: '', assignedDoctor: '', assignedNurse: '',
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const { socket } = useSocket();
  const { isAdmin, user } = useAuth();
  const { sidebarOpen } = useSidebar();
  const canEditPatients = true; // all roles can manage patients

  // CRUD state
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (roomFilter) params.set('roomType', roomFilter);
      const data = await apiFetch(`/api/patients?${params.toString()}`);
      setPatients(data);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roomFilter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchPatients();
    socket.on('patientAdded', handleUpdate);
    socket.on('patientUpdated', handleUpdate);
    socket.on('patientDischarged', handleUpdate);
    return () => {
      socket.off('patientAdded', handleUpdate);
      socket.off('patientUpdated', handleUpdate);
      socket.off('patientDischarged', handleUpdate);
    };
  }, [socket, fetchPatients]);

  const openCreate = () => {
    setEditingPatient(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p: Patient) => {
    setEditingPatient(p);
    setForm({
      name: p.name, age: String(p.age), gender: p.gender, bedNumber: String(p.bedNumber),
      roomType: p.roomType, status: p.status, diagnosis: p.diagnosis,
      assignedDoctor: p.assignedDoctor, assignedNurse: p.assignedNurse,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.age || !form.bedNumber) {
      toast.error('Name, age, and bed number are required.');
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, age: Number(form.age), bedNumber: Number(form.bedNumber) };
      if (editingPatient) {
        await apiFetch(`/api/patients/${editingPatient._id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('Patient updated');
      } else {
        await apiFetch('/api/patients', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Patient created');
      }
      setShowModal(false);
      fetchPatients();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  const handleDischarge = async (id: string) => {
    try {
      await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
      toast.success('Patient discharged');
      setDeleteConfirm(null);
      fetchPatients();
    } catch (err: any) {
      toast.error(err.message || 'Failed to discharge patient');
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-8 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Patients</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {patients.length} patients currently registered
              </p>
            </div>
            <button onClick={openCreate} className="btn-primary text-sm !py-2.5 !px-5 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Add Patient
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search patients..."
                className="input-field pl-10"
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
              <option value="">All Status</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="stable">Stable</option>
            </select>
            <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className="input-field w-auto">
              <option value="">All Rooms</option>
              <option value="icu">ICU</option>
              <option value="normal">Normal</option>
              <option value="isolation">Isolation</option>
              <option value="step-down">Step-Down</option>
            </select>
          </div>

          {/* Patient Table */}
          {loading ? (
            <TableSkeleton rows={6} />
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bed</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Room</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Risk</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Diagnosis</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Updated</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {patients.map(patient => (
                      <tr key={patient._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-hospital-400 to-icu-500 flex items-center justify-center text-white text-sm font-bold">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{patient.name}</p>
                              <p className="text-xs text-gray-500">{patient.gender}, {patient.age}y</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <BedDouble className="w-4 h-4 text-gray-400" />
                            <span className="font-mono text-sm">{patient.bedNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium uppercase px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-700">
                            {patient.roomType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`status-badge ${getStatusBadgeClasses(patient.status)}`}>
                            {patient.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <RiskBadge score={patient.riskScore} size="sm" />
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                            {patient.diagnosis || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-500">{formatDate(patient.updatedAt)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(patient)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteConfirm(patient._id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Discharge">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/patients/${patient._id}`}
                              className="p-2 rounded-lg hover:bg-hospital-50 dark:hover:bg-hospital-900/20 text-hospital-500 transition-colors"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {patients.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No patients found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingPatient ? 'Edit Patient' : 'Add New Patient'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Patient name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Age *</label>
              <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="input-field" placeholder="Age" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="input-field">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bed Number *</label>
              <input type="number" value={form.bedNumber} onChange={e => setForm({ ...form, bedNumber: e.target.value })} className="input-field" placeholder="e.g. 101" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Room Type</label>
              <select value={form.roomType} onChange={e => setForm({ ...form, roomType: e.target.value })} className="input-field">
                <option value="icu">ICU</option>
                <option value="normal">Normal</option>
                <option value="isolation">Isolation</option>
                <option value="step-down">Step-Down</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="stable">Stable</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Diagnosis</label>
            <input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} className="input-field" placeholder="Diagnosis" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assigned Doctor</label>
              <input value={form.assignedDoctor} onChange={e => setForm({ ...form, assignedDoctor: e.target.value })} className="input-field" placeholder="Doctor name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assigned Nurse</label>
              <input value={form.assignedNurse} onChange={e => setForm({ ...form, assignedNurse: e.target.value })} className="input-field" placeholder="Nurse name" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button onClick={() => setShowModal(false)} className="btn-secondary text-sm !py-2.5 !px-5">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm !py-2.5 !px-5">
              {saving ? 'Saving...' : editingPatient ? 'Update Patient' : 'Create Patient'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Discharge Confirmation Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Discharge Patient">
        <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to discharge this patient? This action will mark them as discharged.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-sm !py-2.5 !px-5">Cancel</button>
          <button onClick={() => deleteConfirm && handleDischarge(deleteConfirm)} className="bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2.5 px-5 rounded-xl transition-colors">
            Discharge
          </button>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
