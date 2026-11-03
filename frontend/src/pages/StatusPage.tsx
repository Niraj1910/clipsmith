import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export function StatusPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-white">System Status</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded transition disabled:opacity-50"
            >
              {isFetching ? 'Checking...' : 'Refresh'}
            </button>
            <Link
              to="/"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded transition"
            >
              Home
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="text-sm text-slate-400 py-4 text-center">Checking system health...</div>
        )}

        {isError && (
          <div className="rounded-lg bg-red-950/60 border border-red-800/80 p-4 text-sm text-red-200">
            <p className="font-semibold">Backend Unreachable</p>
            <p className="text-xs text-red-300 mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        )}

        {data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-800">
              <span className="text-sm font-medium text-slate-300">Backend API</span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  data.status === 'ok'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {data.status === 'ok' ? 'UP' : 'DOWN'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-800">
              <span className="text-sm font-medium text-slate-300">MongoDB</span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  data.mongo === 'up'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {data.mongo.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-800">
              <span className="text-sm font-medium text-slate-300">Redis</span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  data.redis === 'up'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {data.redis.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
