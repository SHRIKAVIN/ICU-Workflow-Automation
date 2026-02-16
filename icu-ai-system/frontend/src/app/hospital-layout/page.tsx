'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useSocket, useSidebar } from '@/providers';
import { apiFetch } from '@/lib/auth';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  BedDouble,
  User,
  Wrench,
  CheckCircle,
  Shield,
  MapPin,
  Building2,
  ChevronRight,
  Compass,
} from 'lucide-react';

interface Bed {
  _id: string;
  bedNumber: number;
  roomType: string;
  ward: string;
  floor: number;
  status: string;
  patientId: { _id: string; name: string } | null;
  features: { nearNursingStation?: boolean };
}

function bedColor(status: string) {
  switch (status) {
    case 'occupied': return '#3B82F6';
    case 'available': return '#22C55E';
    case 'maintenance': return '#F59E0B';
    case 'reserved': return '#8B5CF6';
    default: return '#94A3B8';
  }
}

export default function HospitalLayoutPage() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>(1);
  const { socket } = useSocket();
  const { sidebarOpen } = useSidebar();

  const fetchData = useCallback(async () => {
    try {
      setBeds(await apiFetch('/api/beds'));
    } catch (err) {
      console.error('Error fetching beds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!socket) return;
    const h = () => fetchData();
    ['bedAllocated', 'bedReleased', 'bedAdded', 'bedUpdated', 'bedDeleted', 'bedTransferred'].forEach(e => socket.on(e, h));
    return () => ['bedAllocated', 'bedReleased', 'bedAdded', 'bedUpdated', 'bedDeleted', 'bedTransferred'].forEach(e => socket.off(e, h));
  }, [socket, fetchData]);

  const floors = [...new Set(beds.map(b => b.floor))].sort((a, b) => a - b);
  const bedsByFloor = selectedFloor === 'all' ? beds : beds.filter(b => b.floor === selectedFloor);
  const wards = [...new Set(bedsByFloor.map(b => b.ward))];
  const bedsByWard = wards.reduce<Record<string, Bed[]>>((acc, w) => {
    acc[w] = bedsByFloor.filter(b => b.ward === w).sort((a, b) => a.bedNumber - b.bedNumber);
    return acc;
  }, {});

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
        <Sidebar />
        <main className={cn('flex-1 p-4 md:p-6 min-h-screen transition-all duration-300', sidebarOpen ? 'md:ml-64' : 'md:ml-20')}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <MapPin className="w-6 h-6 text-hospital-500" />
                Hospital Floor Plan
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                Schematic view · Floor {selectedFloor === 'all' ? '1–3' : selectedFloor}
              </p>
            </div>
            <Link href="/beds" className="btn-secondary text-sm !py-2 !px-4 flex items-center gap-2 w-fit">
              <BedDouble className="w-4 h-4" /> Bed Management <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse w-48" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSelectedFloor('all')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium',
                    selectedFloor === 'all' ? 'bg-hospital-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  )}
                >
                  All Floors
                </button>
                {floors.map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedFloor(f)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2',
                      selectedFloor === f ? 'bg-hospital-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    )}
                  >
                    <Building2 className="w-4 h-4" /> Floor {f}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-5 mb-4 py-2 px-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                {[
                  { c: '#22C55E', l: 'Available' },
                  { c: '#3B82F6', l: 'Occupied' },
                  { c: '#F59E0B', l: 'Maintenance' },
                  { c: '#8B5CF6', l: 'Reserved' },
                ].map(({ c, l }) => (
                  <span key={l} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                    {l}
                  </span>
                ))}
              </div>

              <div className="space-y-8">
                {selectedFloor === 'all' ? (
                  floors.map(floor => (
                    <FloorPlan
                      key={floor}
                      floor={floor}
                      wards={[...new Set(beds.filter(b => b.floor === floor).map(b => b.ward))]}
                      bedsByWard={beds.filter(b => b.floor === floor).reduce<Record<string, Bed[]>>((acc, b) => {
                        if (!acc[b.ward]) acc[b.ward] = [];
                        acc[b.ward].push(b);
                        acc[b.ward].sort((a, x) => a.bedNumber - x.bedNumber);
                        return acc;
                      }, {})}
                    />
                  ))
                ) : (
                  <FloorPlan floor={selectedFloor} wards={wards} bedsByWard={bedsByWard} />
                )}
              </div>

              {wards.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No beds on this floor</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function FloorPlan({
  floor,
  wards,
  bedsByWard,
}: {
  floor: number;
  wards: string[];
  bedsByWard: Record<string, Bed[]>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-700 dark:text-slate-200">Floor {floor}</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Blueprint-style floor plan */}
      <div className="rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
        <div className="p-4 md:p-6">
          <div className="relative">
            {/* North arrow */}
            <div className="absolute top-0 right-0 flex items-center gap-1 text-[10px] text-slate-400">
              <Compass className="w-3.5 h-3.5" /> N
            </div>

            {/* Schematic: left wing | corridor | right wing */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-0">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:pr-4">
                {wards.slice(0, Math.ceil(wards.length / 2)).map(ward => (
                  <RoomBlock key={ward} ward={ward} beds={bedsByWard[ward] || []} />
                ))}
              </div>
              <div className="hidden lg:flex w-10 flex-shrink-0 flex-col items-center justify-center bg-slate-200/90 dark:bg-slate-700/90 border-x-2 border-dashed border-slate-400/50 dark:border-slate-500/50">
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-widest -rotate-90 whitespace-nowrap">
                  CORRIDOR
                </span>
              </div>
              <div className="lg:hidden h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:pl-4">
                {wards.slice(Math.ceil(wards.length / 2)).map(ward => (
                  <RoomBlock key={ward} ward={ward} beds={bedsByWard[ward] || []} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomBlock({ ward, beds }: { ward: string; beds: Bed[] }) {
  const roomType = beds[0]?.roomType || 'normal';
  const roomLabel = { icu: 'ICU', normal: 'General', isolation: 'Isolation', 'step-down': 'Step-Down' }[roomType] || roomType;

  return (
    <div className="rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50 p-3 min-h-[100px]">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
        <span className="font-bold text-slate-800 dark:text-white text-sm">{ward}</span>
        <span className="text-[9px] font-semibold uppercase text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60">
          {roomLabel}
        </span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
        {beds.map(bed => {
          const hasPatient = bed.patientId && typeof bed.patientId === 'object';
          const color = bedColor(bed.status);
          const el = (
            <div
              key={bed._id}
              className={cn(
                'rounded border-2 p-1.5 min-h-[48px] flex flex-col justify-between transition-all hover:scale-105 hover:shadow-md',
                hasPatient && 'cursor-pointer'
              )}
              style={{ borderColor: color, backgroundColor: `${color}15` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs">{bed.bedNumber}</span>
                {bed.status === 'occupied' && <User className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />}
                {bed.status === 'available' && <CheckCircle className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />}
                {bed.status === 'maintenance' && <Wrench className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />}
                {bed.status === 'reserved' && <Shield className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400" />}
              </div>
              <p className="text-[8px] truncate font-medium text-slate-700 dark:text-slate-200">
                {hasPatient ? bed.patientId!.name : bed.status}
              </p>
            </div>
          );
          return hasPatient ? (
            <Link key={bed._id} href={`/patients/${bed.patientId!._id}`} className="block">
              {el}
            </Link>
          ) : (
            <div key={bed._id}>{el}</div>
          );
        })}
      </div>
    </div>
  );
}
