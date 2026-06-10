'use client';

import { useState, useCallback } from 'react';
import { Wallet, Plus, RefreshCw, Sparkles, Trash2, TrendingDown, TrendingUp, CreditCard, Landmark, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlaidLink } from 'react-plaid-link';
import { usePlaid } from '@/hooks/use-plaid';
import { useFamilyMembers } from '@/hooks/use-family';
import { askHermes } from '@/lib/hermes';
import { authFetch } from '@/lib/api-client';
import { format, parseISO } from 'date-fns';

const CATEGORY_COLORS: Record<string, string> = {
  'Food and Drink': 'bg-orange-400',
  'Shops': 'bg-blue-400',
  'Travel': 'bg-purple-400',
  'Recreation': 'bg-green-400',
  'Service': 'bg-yellow-400',
  'Healthcare': 'bg-red-400',
  'Transfer': 'bg-slate-400',
  'Payment': 'bg-pink-400',
  'Other': 'bg-slate-300',
};

function PlaidLinkButton({ onSuccess, children }: { onSuccess: (publicToken: string, metadata: any) => void; children: React.ReactNode }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: (public_token, metadata) => {
      onSuccess(public_token, metadata);
      setLinkToken(null);
    },
    onExit: () => setLinkToken(null),
  });

  async function handleClick() {
    setFetching(true);
    try {
      const res = await authFetch('/api/plaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.link_token) {
        setLinkToken(data.link_token);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }

  // Open Plaid Link once token is ready
  if (linkToken && ready) {
    open();
  }

  return (
    <button
      onClick={handleClick}
      disabled={fetching}
      className="flex items-center gap-2 bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 text-sm"
    >
      {fetching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      {children}
    </button>
  );
}

export default function BudgetPage() {
  const {
    linkedBanks, accounts, transactions, spendingByCategory,
    totalSpent, totalBalance, loadingBanks, loadingData, error,
    exchangeAndSave, fetchAll, removeBank,
  } = usePlaid();
  const { users } = useFamilyMembers();

  const [hermesLoading, setHermesLoading] = useState(false);
  const [hermesInsight, setHermesInsight] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'budget'>('overview');

  async function handleLinkSuccess(publicToken: string, metadata: any) {
    await exchangeAndSave(publicToken, metadata?.institution?.name);
  }

  async function askHermesInsights() {
    setHermesLoading(true);
    setHermesInsight('');
    try {
      const topCategories = Object.entries(spendingByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`);

      const { content } = await askHermes(
        [{ role: 'user', content: `Analyze this family's spending for the past 30 days and give 2-3 specific, actionable insights. Total spent: $${totalSpent.toFixed(2)}. By category: ${topCategories.join(', ')}. Keep it brief and practical.` }],
        { users, shopping: topCategories },
      );
      setHermesInsight(content);
    } catch {
      setHermesInsight('Could not reach Hermes. Check ANTHROPIC_API_KEY in Vercel env vars.');
    } finally {
      setHermesLoading(false);
    }
  }

  const sortedCategories = Object.entries(spendingByCategory)
    .sort((a, b) => b[1] - a[1]);

  if (loadingBanks) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 pb-24">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Budget</h1>
              <p className="text-xs text-slate-500">Powered by Plaid · {linkedBanks.length} bank{linkedBanks.length !== 1 ? 's' : ''} linked</p>
            </div>
          </div>
          <div className="flex gap-2">
            {linkedBanks.length > 0 && (
              <>
                <button
                  onClick={() => fetchAll()}
                  disabled={loadingData}
                  className="p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={askHermesInsights}
                  disabled={hermesLoading || transactions.length === 0}
                  className="flex items-center gap-1.5 bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {hermesLoading ? '…' : 'Insights'}
                </button>
              </>
            )}
            <PlaidLinkButton onSuccess={handleLinkSuccess}>
              {linkedBanks.length === 0 ? 'Connect Bank' : 'Add Bank'}
            </PlaidLinkButton>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* No banks connected */}
        {linkedBanks.length === 0 && (
          <div className="text-center py-16">
            <Landmark className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <h2 className="text-xl font-black text-slate-700 mb-2">Connect your bank</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
              Link your accounts to track spending, balances, and get Hermes budget insights.
            </p>
            <PlaidLinkButton onSuccess={handleLinkSuccess}>Connect Bank Account</PlaidLinkButton>
          </div>
        )}

        {linkedBanks.length > 0 && (
          <>
            {/* Hermes insight */}
            <AnimatePresence>
              {hermesInsight && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-xl text-sm text-slate-700 relative"
                >
                  <button onClick={() => setHermesInsight('')} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <p className="font-bold text-purple-700 mb-1.5 flex items-center gap-1 text-xs"><Sparkles className="w-3 h-3" /> Hermes Budget Insights</p>
                  <p className="whitespace-pre-line leading-relaxed">{hermesInsight}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Net Balance</p>
                <p className={`text-2xl font-black ${totalBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  ${Math.abs(totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  {totalBalance >= 0 ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                  across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Spent (30d)</p>
                <p className="text-2xl font-black text-slate-800">
                  ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{transactions.filter(t => t.amount > 0).length} transactions</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
              {(['overview', 'transactions', 'budget'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${
                    activeTab === tab ? 'bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div className="space-y-3">
                {/* Accounts */}
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Accounts</h3>
                {loadingData ? (
                  <div className="py-4 text-center text-slate-400 text-sm">Loading accounts…</div>
                ) : (
                  accounts.map(acc => (
                    <div key={acc.account_id} className="bg-white border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {acc.type === 'credit' ? <CreditCard className="w-4 h-4 text-blue-600" /> : <Landmark className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate">{acc.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{acc.subtype}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-sm ${acc.type === 'credit' ? 'text-red-500' : 'text-green-600'}`}>
                          {acc.type === 'credit' ? '-' : ''}${(acc.balances.current ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        {acc.balances.available !== null && acc.balances.available !== acc.balances.current && (
                          <p className="text-[10px] text-slate-400">${acc.balances.available?.toLocaleString('en-US', { minimumFractionDigits: 2 })} avail</p>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Linked banks management */}
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider pt-2">Linked Banks</h3>
                {linkedBanks.map(bank => (
                  <div key={bank.itemId} className="flex items-center justify-between bg-slate-100 rounded-xl px-3 py-2">
                    <div>
                      <p className="text-sm font-bold text-slate-700">{bank.institutionName}</p>
                      <p className="text-xs text-slate-400">Linked {format(parseISO(bank.linkedAt), 'MMM d, yyyy')}</p>
                    </div>
                    <button onClick={() => removeBank(bank.itemId)} className="p-1.5 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Transactions tab */}
            {activeTab === 'transactions' && (
              <div className="space-y-2">
                {loadingData ? (
                  <div className="py-8 text-center text-slate-400">Loading transactions…</div>
                ) : transactions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">No transactions found</div>
                ) : (
                  transactions.slice(0, 50).map(tx => (
                    <motion.div
                      key={tx.transaction_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`bg-white border-2 border-black rounded-xl px-3 py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 ${tx.pending ? 'opacity-60' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_COLORS[tx.category?.[0] ?? 'Other'] ?? 'bg-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate">{tx.merchant_name ?? tx.name}</p>
                        <p className="text-[10px] text-slate-400">{format(parseISO(tx.date), 'MMM d')} · {tx.category?.[0] ?? 'Other'}{tx.pending ? ' · pending' : ''}</p>
                      </div>
                      <p className={`font-black text-sm flex-shrink-0 ${tx.amount < 0 ? 'text-green-600' : 'text-slate-800'}`}>
                        {tx.amount < 0 ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Budget/spending breakdown tab */}
            {activeTab === 'budget' && (
              <div className="space-y-3">
                {loadingData ? (
                  <div className="py-8 text-center text-slate-400">Loading…</div>
                ) : sortedCategories.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">No spending data yet</div>
                ) : (
                  sortedCategories.map(([cat, amt]) => {
                    const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                    const color = CATEGORY_COLORS[cat] ?? 'bg-slate-300';
                    return (
                      <div key={cat} className="bg-white border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-bold text-sm text-slate-800">{cat}</p>
                          <div className="text-right">
                            <span className="font-black text-sm text-slate-800">${amt.toFixed(2)}</span>
                            <span className="text-xs text-slate-400 ml-1.5">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${color}`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
