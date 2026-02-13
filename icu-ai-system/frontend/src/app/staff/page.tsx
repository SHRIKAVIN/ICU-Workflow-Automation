'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/ui/Modal';
import { TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/providers';
import { apiFetch } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
  UserCog, Stethoscope, BedDouble, CheckCircle, Circle, Phone, Mail, Plus, Pencil, Trash2,
} from 'lucide-react';

interface Task {
  description: string;
  priority: string;
  completed: boolean;
  dueTime?: string;
}

interface StaffMember {
  _id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  shift: string;
  assignedBeds: number[];
  tasks: Task[];
  isOnDuty: boolean;
}

const emptyForm = {
  name: '', role: 'nurse', email: '', phone: '', department: 'ICU',
  shift: 'morning', assignedBeds: '', isOnDuty: true,
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const { isAdmin } = useAuth();

  // CRUD state
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<StaffMember | null>(null);

  const fetchStaff = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      const data = await apiFetch(`/api/staff?${params.toString()}`);
      setStaff(data);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const openCreate = () => {
    setEditingStaff(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (m: StaffMember) => {
    setEditingStaff(m);
    setForm({
      name: m.name, role: m.role, email: m.email, phone: m.phone || '',
      department: m.department, shift: m.shift,
      assignedBeds: m.assignedBeds.join(', '), isOnDuty: m.isOnDuty,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.role || !form.email) {
      toast.error('Name, role, and email are required.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name, role: form.role, email: form.email, phone: form.phone,
        department: form.department, shift: form.shift, isOnDuty: form.isOnDuty,
        assignedBeds: form.assignedBeds ? form.assignedBeds.split(',').map(b => Number(b.trim())).filter(Boolean) : [],
      };
      if (editingStaff) {
        await apiFetch(`/api/staff/${editingStaff._id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('Staff member updated');
      } else {
        await apiFetch('/api/staff', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Staff member created');
      }
      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: StaffMember) => {
    try {
      await apiFetch(`/api/staff/${m._id}`, { method: 'DELETE' });
      toast.success('Staff member deleted');
      setDeleteConfirm(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete staff member');
    }
  };

  const shiftColors: Record<string, string> = {
    morning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    afternoon: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    night: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
  };

  const priorityColors: Record<string, string> = {
    high: 'text-red-500',
    medium: 'text-yellow-500',
    low: 'text-green-500',
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <UserCog className="w-7 h-7 text-icu-500" /> Staff Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{staff.length} staff members</p>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button onClick={openCreate} className="btn-primary text-sm !py-2 !px-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Staff
                </button>
              )}
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field w-auto">
                <option value="">All Roles</option>
                <option value="doctor">Doctors</option>
                <option value="nurse">Nurses</option>
                <option value="technician">Technicians</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff.map(member => (
                <div key={member._id} className="glass-card p-6 group relative">
                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(member)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(member)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                        member.role === 'doctor' ? 'bg-gradient-to-br from-icu-400 to-icu-600' : 'bg-gradient-to-br from-hospital-400 to-hospital-600'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{member.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs capitalize text-gray-500 flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" /> {member.role}
                          </span>
                          <span className="text-xs text-gray-400">|</span>
                          <span className="text-xs text-gray-500">{member.department}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`status-badge text-[10px] ${shiftColors[member.shift] || ''}`}>{member.shift}</span>
                      <span className={`text-xs font-medium ${member.isOnDuty ? 'text-green-500' : 'text-gray-400'}`}>
                        {member.isOnDuty ? 'On Duty' : 'Off Duty'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {member.email}</span>
                    {member.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</span>}
                  </div>

                  {member.assignedBeds.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Assigned Beds</p>
                      <div className="flex flex-wrap gap-1.5">
                        {member.assignedBeds.map(bed => (
                          <span key={bed} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-lg text-xs font-mono">
                            <BedDouble className="w-3 h-3" /> {bed}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {member.tasks.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tasks ({member.tasks.filter(t => !t.completed).length} pending)</p>
                      <div className="space-y-2">
                        {member.tasks.map((task, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            {task.completed ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Circle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${priorityColors[task.priority]}`} />
                            )}
                            <span className={`text-sm ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create/Edit Staff Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input-field">
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="technician">Technician</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="email@hospital.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+1-555-0100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="input-field" placeholder="ICU" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shift</label>
              <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })} className="input-field">
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Assigned Beds</label>
            <input value={form.assignedBeds} onChange={e => setForm({ ...form, assignedBeds: e.target.value })} className="input-field" placeholder="101, 102, 103 (comma-separated)" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isOnDuty}
              onChange={e => setForm({ ...form, isOnDuty: e.target.checked })}
              className="rounded border-gray-300 text-hospital-500 focus:ring-hospital-500"
            />
            Currently on duty
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button onClick={() => setShowModal(false)} className="btn-secondary text-sm !py-2.5 !px-5">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm !py-2.5 !px-5">
              {saving ? 'Saving...' : editingStaff ? 'Update Staff' : 'Create Staff'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Staff Member">
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-sm !py-2.5 !px-5">Cancel</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2.5 px-5 rounded-xl transition-colors">
            Delete
          </button>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
