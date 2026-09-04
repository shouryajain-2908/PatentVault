import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { mockPatents, type MockPatent } from '@/lib/mockPatentData';
import { supabase, type Patent } from '@/lib/supabase';
import { TrendingUp, FileText, CheckCircle, Clock, XCircle, Search, ChevronDown, Network, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Patent>('filing_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    async function loadPatents() {
      const { data, error } = await supabase
        .from('patents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setPatents(mockPatents.map(p => ({
          id: p.id,
          user_id: user?.id || '',
          patent_number: p.patent_number,
          title: p.title,
          abstract: p.abstract,
          applicant: p.applicant,
          filing_date: p.filing_date,
          status: p.status,
          classification: p.classification,
          citations_count: p.citations_count,
          similarity_score: p.similarity_score,
          related_patents: p.related_patents,
          created_at: new Date().toISOString(),
        })));
      } else {
        setPatents(data as Patent[]);
      }
      setLoading(false);
    }
    loadPatents();
  }, [user?.id]);

  const filtered = patents
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .filter(p =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.patent_number.toLowerCase().includes(search.toLowerCase()) ||
      p.applicant.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

  const stats = {
    total: patents.length,
    granted: patents.filter(p => p.status === 'granted').length,
    pending: patents.filter(p => p.status === 'pending').length,
    rejected: patents.filter(p => p.status === 'rejected').length,
    avgCitations: patents.length > 0
      ? Math.round(patents.reduce((sum, p) => sum + (p.citations_count || 0), 0) / patents.length)
      : 0,
    avgSimilarity: patents.length > 0
      ? (patents.reduce((sum, p) => sum + (p.similarity_score || 0), 0) / patents.length).toFixed(2)
      : '0.00',
  };

  function toggleSort(field: keyof Patent) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const statusColors: Record<string, string> = {
    granted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div id="dashboard-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Patent Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor and analyze your patent portfolio</p>
        </div>
        <Link
          to="/visualization"
          id="dashboard-viz-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all"
        >
          <Network className="w-4 h-4" />
          Open 3D Visualization
        </Link>
      </div>

      {/* Stats grid */}
      <div id="dashboard-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Patents" value={stats.total} color="sky" />
        <StatCard icon={CheckCircle} label="Granted" value={stats.granted} color="emerald" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="amber" />
        <StatCard icon={TrendingUp} label="Avg Citations" value={stats.avgCitations} color="cyan" />
      </div>

      {/* Table */}
      <div id="dashboard-table" className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Table header / controls */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Patent Portfolio</h2>
          <div className="flex flex-col sm:flex-row gap-3 flex-1 sm:justify-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search patents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value="all">All Status</option>
              <option value="granted">Granted</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table body */}
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No patents found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-300" onClick={() => toggleSort('patent_number')}>
                    Patent #
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-300" onClick={() => toggleSort('title')}>
                    Title
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-300 hidden md:table-cell" onClick={() => toggleSort('applicant')}>
                    Applicant
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-300 hidden lg:table-cell" onClick={() => toggleSort('filing_date')}>
                    Filed
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-300 hidden md:table-cell" onClick={() => toggleSort('citations_count')}>
                    Citations
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-300 hidden lg:table-cell" onClick={() => toggleSort('similarity_score')}>
                    Similarity
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patent) => (
                  <>
                    <tr
                      key={patent.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === patent.id ? null : patent.id)}
                    >
                      <td className="px-4 py-3 text-sm text-sky-400 font-mono font-medium">{patent.patent_number}</td>
                      <td className="px-4 py-3 text-sm text-white max-w-xs truncate">{patent.title}</td>
                      <td className="px-4 py-3 text-sm text-slate-400 hidden md:table-cell">{patent.applicant}</td>
                      <td className="px-4 py-3 text-sm text-slate-400 hidden lg:table-cell">{patent.filing_date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[patent.status] || statusColors.pending}`}>
                          {patent.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 hidden md:table-cell">{patent.citations_count}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full"
                              style={{ width: `${(patent.similarity_score || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{(patent.similarity_score || 0).toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedRow === patent.id ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>
                    {expandedRow === patent.id && (
                      <tr className="bg-slate-800/20">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Abstract</p>
                              <p className="text-sm text-slate-300 leading-relaxed">{patent.abstract}</p>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div>
                                <span className="text-slate-500">Classification: </span>
                                <span className="text-slate-300 font-mono">{patent.classification}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Related Patents: </span>
                                <span className="text-sky-400">{(patent.related_patents || []).length} linked</span>
                              </div>
                            </div>
                            <Link
                              to="/chatbot"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 text-sky-400 text-xs font-medium rounded-lg border border-sky-500/20 hover:bg-sky-500/20 transition-all"
                            >
                              <Sparkles className="w-3 h-3" />
                              Ask AI about this patent
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof FileText; label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20',
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl lg:text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}
