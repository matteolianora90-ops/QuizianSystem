import React from 'react';
import {
  Cpu,
  Database,
  Layout,
  BookOpen,
  FlaskConical,
  Calculator,
  Globe,
  Code2,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';

export interface CategoryVisual {
  icon: React.ElementType;
  bgClass: string;
  textClass: string;
  borderClass: string;
  label: string;
}

export function getCategoryVisual(category?: string, title?: string): CategoryVisual {
  const combined = `${category || ''} ${title || ''}`.toLowerCase();

  if (combined.includes('database') || combined.includes('sql') || combined.includes('data')) {
    return {
      icon: Database,
      bgClass: 'bg-[#FFF0E3]',
      textClass: 'text-[#F47A18]',
      borderClass: 'border-[#F47A18]/20',
      label: category || 'Database',
    };
  }

  if (combined.includes('ux') || combined.includes('design') || combined.includes('hci') || combined.includes('interaction')) {
    return {
      icon: Layout,
      bgClass: 'bg-[#172337]/8',
      textClass: 'text-[#172337]',
      borderClass: 'border-[#172337]/15',
      label: category || 'Design & UX',
    };
  }

  if (combined.includes('security') || combined.includes('cyber') || combined.includes('network')) {
    return {
      icon: ShieldCheck,
      bgClass: 'bg-[#239B70]/12',
      textClass: 'text-[#239B70]',
      borderClass: 'border-[#239B70]/20',
      label: category || 'Security',
    };
  }

  if (combined.includes('information system') || combined.includes('operating') || combined.includes('computer') || combined.includes('software')) {
    return {
      icon: Cpu,
      bgClass: 'bg-[#FFF0E3]',
      textClass: 'text-[#F47A18]',
      borderClass: 'border-[#F47A18]/20',
      label: category || 'Computer Science',
    };
  }

  if (combined.includes('code') || combined.includes('program') || combined.includes('algorithm')) {
    return {
      icon: Code2,
      bgClass: 'bg-[#172337]/8',
      textClass: 'text-[#172337]',
      borderClass: 'border-[#172337]/15',
      label: category || 'Programming',
    };
  }

  if (combined.includes('bio') || combined.includes('chem') || combined.includes('science') || combined.includes('physics')) {
    return {
      icon: FlaskConical,
      bgClass: 'bg-[#239B70]/12',
      textClass: 'text-[#239B70]',
      borderClass: 'border-[#239B70]/20',
      label: category || 'Science',
    };
  }

  if (combined.includes('math') || combined.includes('calc') || combined.includes('stat')) {
    return {
      icon: Calculator,
      bgClass: 'bg-[#FFF0E3]',
      textClass: 'text-[#F47A18]',
      borderClass: 'border-[#F47A18]/20',
      label: category || 'Mathematics',
    };
  }

  if (combined.includes('history') || combined.includes('geo') || combined.includes('social')) {
    return {
      icon: Globe,
      bgClass: 'bg-[#172337]/8',
      textClass: 'text-[#172337]',
      borderClass: 'border-[#172337]/15',
      label: category || 'Humanities',
    };
  }

  if (combined.includes('study') || combined.includes('review')) {
    return {
      icon: GraduationCap,
      bgClass: 'bg-[#FFF0E3]',
      textClass: 'text-[#F47A18]',
      borderClass: 'border-[#F47A18]/20',
      label: category || 'Study Review',
    };
  }

  return {
    icon: BookOpen,
    bgClass: 'bg-[#FFF0E3]',
    textClass: 'text-[#F47A18]',
    borderClass: 'border-[#F47A18]/20',
    label: category || 'General',
  };
}

const DAILY_MOTIVATIONS = [
  'Short, active quiz sessions strengthen memory far faster than passive re-reading.',
  'Testing yourself before reviewing the answer doubles long-term recall retention.',
  'Mix multiple question types today—recognition, recall, and word puzzles engage deeper pathways.',
  'Consistent 15-minute daily reviews beat marathon cramming every single time.',
  'Explaining a concept in your own words is the fastest way to lock it into memory.',
  'Challenge a classmate today—friendly competition turns revision into lasting mastery.',
  'Every wrong answer in practice is one less mistake when exam day arrives.',
];

export function getDailyStudyMotivation(streakDays = 5): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const idx = (dayOfYear + streakDays) % DAILY_MOTIVATIONS.length;
  return DAILY_MOTIVATIONS[idx];
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
