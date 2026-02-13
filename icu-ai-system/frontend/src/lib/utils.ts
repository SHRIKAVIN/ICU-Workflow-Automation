import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getRiskColor(score: number): string {
  if (score > 0.7) return 'text-red-500';
  if (score > 0.4) return 'text-yellow-500';
  return 'text-green-500';
}

export function getRiskBgColor(score: number): string {
  if (score > 0.7) return 'bg-red-500/10 border-red-500/30';
  if (score > 0.4) return 'bg-yellow-500/10 border-yellow-500/30';
  return 'bg-green-500/10 border-green-500/30';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'critical': return 'bg-red-500';
    case 'warning': return 'bg-yellow-500';
    case 'stable': return 'bg-green-500';
    case 'discharged': return 'bg-gray-400';
    default: return 'bg-gray-400';
  }
}

export function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'stable': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'discharged': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    case 'low': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
    default: return 'text-gray-500 bg-gray-50';
  }
}

export function speakAlert(message: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.1;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }
}
