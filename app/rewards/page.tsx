'use client';

import { Gift, Star, DollarSign, Video, Film, Moon, IceCream, PartyPopper } from 'lucide-react';
import Image from 'next/image';
import { useFamilyMembers } from '@/hooks/use-family';

const REWARDS = [
  { id: 1, title: 'Extra Screen Time (30m)', cost: 50, icon: Video, color: 'bg-purple-100 text-purple-600' },
  { id: 2, title: 'Choose Movie Night', cost: 100, icon: Film, color: 'bg-rose-100 text-rose-600' },
  { id: 3, title: '$5 Allowance Bonus', cost: 200, icon: DollarSign, color: 'bg-green-100 text-green-600' },
  { id: 4, title: 'Stay Up 1hr Late', cost: 150, icon: Moon, color: 'bg-indigo-100 text-indigo-600' },
  { id: 5, title: 'Trip to Ice Cream Shop', cost: 300, icon: IceCream, color: 'bg-orange-100 text-orange-600' },
  { id: 6, title: 'Skip One Chore', cost: 120, icon: PartyPopper, color: 'bg-teal-100 text-teal-600' },
];

export default function RewardsPage() {
  const { users, updatePoints } = useFamilyMembers();
  const childrenFilter = users.filter(u => u.role === 'child');

  const handleClaim = (cost: number) => {
    const childId = window.prompt("Which child is reclaiming this? (Enter 3 for Julia, 4 for Abriana)");
    if (!childId) return;
    const child = users.find(u => u.id === childId);
    if (!child) return alert("Invalid child ID");
    if (child.points < cost) return alert("Not enough points!");
    
    updatePoints(child.id, -cost);
    alert(`Reward claimed for ${child.name}!`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 xl:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900">Reward Store</h1>
              <p className="text-slate-500 mt-1">Earn points by completing tasks and redeem them here.</p>
            </div>
          </div>
        </header>

        {/* Kids Point Balances */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {childrenFilter.map(child => (
            <div key={child.id} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                {child.avatarUrl ? (
                  <Image 
                    src={child.avatarUrl} 
                    alt={child.name} 
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-full object-cover shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-2 border-white hover:scale-110 transition-transform" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-full ${child.color} flex items-center justify-center text-white font-bold text-xl shadow-inner`}>
                    {child.name[0]}
                  </div>
                )}
                <div>
                  <h3 className="font-display font-medium text-lg text-slate-900">{child.name}&apos;s Points</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-amber-500 font-semibold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{child.points} pts available</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Store Catalog */}
        <section>
          <h2 className="font-display text-2xl font-semibold mb-6 text-slate-800">Catalog</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REWARDS.map(reward => (
              <button 
                key={reward.id}
                onClick={() => handleClaim(reward.cost)}
                className="group p-6 bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all text-left flex flex-col items-start gap-4 active:scale-95"
              >
                <div className={`p-4 rounded-2xl ${reward.color}`}>
                  <reward.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-medium text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{reward.title}</h3>
                  <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-slate-100 text-slate-700 rounded-full w-max text-sm font-medium">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {reward.cost} pts
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
