'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useTheme, useSocket, useSettings, useSidebar } from '@/providers';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  UserCog,
  BedDouble,
  MapPin,
  LogOut,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Activity,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { href: '/beds', label: 'Bed Management', icon: BedDouble },
  { href: '/hospital-layout', label: 'Hospital Layout', icon: MapPin },
  { href: '/staff', label: 'Staff', icon: UserCog },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { dark, toggleDark } = useTheme();
  const { connected } = useSocket();
  const { voiceAlerts, toggleVoiceAlerts, toastsEnabled, toggleToasts } = useSettings();
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isCollapsed = !sidebarOpen;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn(
        'border-b border-gray-200/50 dark:border-slate-700/50 flex items-center overflow-hidden transition-all duration-300 ease-in-out',
        isCollapsed ? 'p-3 justify-center' : 'p-6'
      )}>
        <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-hospital-400 to-hospital-600 flex items-center justify-center shadow-lg">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div className={cn(
          'ml-3 min-w-0 overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap',
          isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[140px] opacity-100'
        )}>
          <h1 className="text-lg font-bold gradient-text truncate">ICU Monitor</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Smart Healthcare</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 p-4 space-y-1 overflow-hidden transition-all duration-300', isCollapsed && 'px-3')}>
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                isActive ? 'sidebar-link-active' : 'sidebar-link',
                'flex items-center gap-3 overflow-hidden',
                isCollapsed && 'justify-center p-3'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className={cn(
                'whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out',
                isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className={cn(
        'border-t border-gray-200/50 dark:border-slate-700/50 space-y-3 transition-all duration-300 min-w-0',
        isCollapsed ? 'px-2 py-3' : 'p-4'
      )}>
        {/* Connection status */}
        <div className={cn(
          'flex items-center rounded-lg bg-gray-50 dark:bg-slate-800/50 overflow-hidden transition-all duration-300',
          isCollapsed ? 'justify-center p-2' : 'gap-2 px-3 py-2'
        )}>
          {connected ? (
            <Wifi className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
          <span className={cn(
            'text-xs font-medium truncate whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out',
            connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[60px] opacity-100'
          )}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Controls - stack vertically when collapsed to avoid overflow */}
        <div className={cn(
          'flex gap-2 transition-all duration-300',
          isCollapsed ? 'flex-col items-center gap-1' : 'flex-row'
        )}>
          <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0" title="Toggle dark mode">
            {dark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-500" />}
          </button>
          <button onClick={toggleToasts} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0" title="Toggle notifications">
            {toastsEnabled ? <Bell className="w-4 h-4 text-hospital-500" /> : <BellOff className="w-4 h-4 text-gray-400" />}
          </button>
          <button onClick={toggleVoiceAlerts} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0" title="Toggle voice">
            {voiceAlerts ? <Volume2 className="w-4 h-4 text-hospital-500" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>
        </div>

        {/* User info */}
        <div className={cn('flex items-center overflow-hidden', isCollapsed ? 'justify-center flex-col gap-1' : 'justify-between gap-2')}>
          <div className={cn('flex items-center min-w-0 overflow-hidden', isCollapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-hospital-400 to-icu-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className={cn(
              'ml-2 min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out',
              isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[120px] opacity-100'
            )}>
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              'p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 flex-shrink-0',
              isCollapsed && 'w-full justify-center'
            )}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-lg md:hidden"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar - full or collapsed (icon-only) with animation */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-slate-700/50 flex flex-col z-40 transition-[width,padding,transform] duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0',
          sidebarOpen ? 'md:w-64' : 'md:w-20'
        )}
      >
        {sidebarContent}

        {/* Toggle button - on sidebar edge */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'absolute -right-3 top-8 z-50 hidden md:flex h-6 w-6 items-center justify-center rounded-full bg-hospital-500 text-white shadow-lg hover:bg-hospital-600 transition-all hover:scale-110',
            isCollapsed && 'top-6'
          )}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose className="w-3 h-3" /> : <PanelLeft className="w-3 h-3" />}
        </button>
      </aside>
    </>
  );
}
