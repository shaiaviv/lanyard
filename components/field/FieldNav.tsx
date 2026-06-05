'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mic, Users, Search } from 'lucide-react';

interface FieldNavProps {
  pendingCount: number;
}

const TABS = [
  { href: '/capture', label: 'Capture',  Icon: Mic },
  { href: '/leads',   label: 'Leads',    Icon: Users },
  { href: '/lookup',  label: 'Look up',  Icon: Search },
];

export function FieldNav({ pendingCount }: FieldNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-[430px] mx-auto px-3 pb-4">
        <div
          className="glass rounded-2xl flex overflow-hidden"
          style={{ boxShadow: '0 -2px 40px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.5)' }}
        >
          {TABS.map(({ href, label, Icon }) => {
            const active =
              pathname === href || (href !== '/capture' && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center py-3.5 gap-1 transition-all"
              >
                <div
                  className={`flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200 relative ${
                    active ? 'bg-accent/10' : 'hover:bg-white/5'
                  }`}
                >
                  <Icon
                    size={19}
                    strokeWidth={active ? 2.5 : 1.75}
                    className={`transition-colors duration-200 ${active ? 'text-accent' : 'text-text3'}`}
                  />
                  {href === '/leads' && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] bg-accent text-[#07090F] text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium transition-colors duration-200 ${
                    active ? 'text-accent' : 'text-text3'
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
