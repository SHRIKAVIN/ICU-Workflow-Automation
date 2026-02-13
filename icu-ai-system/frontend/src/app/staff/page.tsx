'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/auth';
import {
  UserCog,
  Stethoscope,
  BedDouble,
  CheckCircle,
  Circle,
  Clock,
  Phone,
  Mail,
  Filter,
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

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

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

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

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
                <UserCog className="w-7 h-7 text-icu-500" />
                Staff Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {staff.length} staff members
              </p>
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="input-field w-auto"
            >
              <option value="">All Roles</option>
              <option value="doctor">Doctors</option>
              <option value="nurse">Nurses</option>
              <option value="technician">Technicians</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff.map(member => (
                <div key={member._id} className="glass-card p-6">
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
                      <span className={`status-badge text-[10px] ${shiftColors[member.shift] || ''}`}>
                        {member.shift}
                      </span>
                      <span className={`text-xs font-medium ${member.isOnDuty ? 'text-green-500' : 'text-gray-400'}`}>
                        {member.isOnDuty ? 'On Duty' : 'Off Duty'}
                      </span>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {member.email}</span>
                    {member.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</span>}
                  </div>

                  {/* Assigned Beds */}
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

                  {/* Tasks */}
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
                            <span className={`text-sm ${task.completed ? 'line-through text-gray-400' : ''}`}>
                              {task.description}
                            </span>
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
    </ProtectedRoute>
  );
}
