'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mic, Users, Search } from 'lucide-react';

interface FieldNavProps {
  pendingCount: number;
}

const TABS = [
  { href: '/capture', label: 'Capture', Icon: Mic },
  { href: '/leads',   label: 'Leads',   Icon: Users },
  { href: '/lookup',  label: 'Look up',  Icon: Search },
];

export function FieldNav({ pendingCount }: FieldNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 safe-area-inset-bottom">
      <div className="max-w-[430px] mx-auto flex">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/capture' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-orange-500' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
                {href === '/leads' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-orange-500' : 'text-zinc-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
