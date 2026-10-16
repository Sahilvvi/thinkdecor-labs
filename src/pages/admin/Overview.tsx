import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye, Users, Sparkles, PoundSterling, Ticket, ArrowRight, Inbox, FileText, Check,
} from 'lucide-react';
import { SEO } from '@/components/shared/SEO';
import { AdminShell } from '@/components/admin/AdminShell';
import { Seg } from '@/components/admin/Seg';
import { CountUp } from '@/components/admin/CountUp';
import { useAdminUsers, useOverviewStats, type OverviewRange } from '@/lib/admin';
import { useLeadsSummary } from '@/lib/leads';
import { useBlogSummary } from '@/lib/blog';
import { money } from '@/lib/billing';

const KIND_LABEL: Record<string, string> = {
  redesign: 'Mantha redesigns',
  repaint_floor: 'Floor repaints',
  repaint_walls: 'Wall repaints',
  cleanup: 'Cleanups',
  replace: 'Replacements',
};

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' });
}
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const RANGE_COPY: Record<OverviewRange, { title: [string, string]; window: string; chart: string; signups: string }> = {
  '7d': { title: ['The week at a ', 'glance'], window: 'the last 7 days', chart: 'Last 7 days', signups: 'this week' },
  '30d': { title: ['The month at a ', 'glance'], window: 'the last 30 days', chart: 'Last 30 days', signups: 'in 30 days' },
  all: { title: ['Everything, at a ', 'glance'], window: 'all time', chart: 'Last 30 days', signups: 'all time' },
};

const TEMPLATE_SAMPLES = ['/assets/rooms/t-scandi.webp', '/assets/rooms/t-classic.webp', '/assets/rooms/t-japandi.webp'];

export default function Overview() {
  const [range, setRange] = useState<OverviewRange>('7d');
  const { data: stats, isLoading, isFetching, error, dataUpdatedAt } = useOverviewStats(range);
  const { data: leadsSummary } = useLeadsSummary();
  const { data: blogSummary } = useBlogSummary();
  const { data: accounts } = useAdminUsers();
  const copy = RANGE_COPY[range];
  const latestSignups = (accounts ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const maxDaily = stats ? Math.max(1, ...stats.dailyViews.map((d) => d.count)) : 1;
  const totalViews = stats?.dailyViews.reduce((s, d) => s + d.count, 0) ?? 0;
  const peakDay = stats?.dailyViews.reduce((best, d) => (d.count > (best?.count ?? -1) ? d : best), stats.dailyViews[0]);
  const peakShare = peakDay && totalViews ? Math.round((peakDay.count / totalViews) * 100) : 0;
  const longSeries = (stats?.dailyViews.length ?? 0) > 7;
  const axisLabel = (iso: string, i: number) => (longSeries ? (i % 5 === 0 ? shortDate(iso) : '') : dayLabel(iso));
  const genByKind = (stats?.generationsByKind ?? []).slice().sort((a, b) => b.count - a.count);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <AdminShell>
      <SEO title="Overview · Admin" description="Traffic, signups and revenue at a glance." />

      <section className="panel">
        <div className="ph">
          <div className="r">
            <div className="kicker">{today}</div>
            <h1>{copy.title[0]}<em>{copy.title[1]}</em></h1>
            <p className="sub">
              Site traffic, signups and designs for {copy.window}
              <span className="sep" />
              {isLoading || isFetching
                ? 'Refreshing…'
                : `Updated ${new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <div className="actions r" style={{ ['--i' as string]: 1 }}>
            <Seg<OverviewRange>
              layoutId="overview-range"
              value={range}
              onChange={setRange}
              options={[{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: 'all', label: 'All time' }]}
            />
          </div>
        </div>

        {!isLoading && error && (
          <div className="mt-8 rounded-2xl px-6 py-10 text-center" style={{ boxShadow: 'inset 0 0 0 1px var(--stone-2)' }}>
            <p className="text-[14.5px]" style={{ color: 'var(--taupe)' }}>
              Couldn't load stats. If this is a fresh setup, run the <code>admin_panel</code> migration in Supabase.
            </p>
          </div>
        )}

        {stats && (
          <>
            <div className="kpis r" style={{ ['--i' as string]: 2 }}>
              <div className="kpi lead">
                <div className="lab"><Eye width={15} height={15} /> Visitors</div>
                <div className="v"><CountUp value={stats.visitors} /></div>
                <div className="n"><b>{stats.pageViews}</b> page views</div>
                <svg className="spark" width="96" height="40" viewBox="0 0 96 40" fill="none">
                  <path
                    className="l"
                    d={sparkPath(stats.dailyViews.map((d) => d.count))}
                    stroke="#8FE3D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="kpi">
                <div className="lab"><Users width={15} height={15} /> Signups</div>
                <div className="v"><CountUp value={stats.signupsTotal} /></div>
                <div className="n"><b>+{stats.signups}</b> {copy.signups}</div>
              </div>
              <div className="kpi">
                <div className="lab"><Sparkles width={15} height={15} /> Designs</div>
                <div className="v"><CountUp value={stats.generationsTotal} /></div>
                <div className="n"><b>{stats.generations}</b> {range === 'all' ? 'overall' : copy.signups} · {stats.activeSubscriptions} active plans</div>
              </div>
              <div className="kpi">
                <div className="lab"><PoundSterling width={15} height={15} /> Revenue</div>
                <div className="v">{money(stats.revenuePenceTotal / 100)}</div>
                <div className="n">All-time, paid</div>
              </div>
              <div className="kpi">
                <div className="lab"><Ticket width={15} height={15} /> Open queries</div>
                <div className="v"><CountUp value={stats.openTickets} /></div>
                <div className="n">{stats.openTickets ? 'Awaiting a reply' : 'Inbox is clear'}</div>
              </div>
            </div>

            <div className="row2">
              <div className="card r" style={{ ['--i' as string]: 3 }}>
                <div className="card-h">
                  <h3>Page views</h3>
                  <span className="tagp">{copy.chart}</span>
                </div>
                <div className="chart">
                  <div className="sum">
                    <b>{totalViews}</b>
                    <span>views{peakDay?.count ? ` · busiest ${longSeries ? shortDate(peakDay.day) : dayLabel(peakDay.day)} (${peakShare}%)` : ''}</span>
                  </div>
                  <div className="bars">
                    <div className="gl" style={{ bottom: '33%' }}><span>{Math.round(maxDaily * 0.33)}</span></div>
                    <div className="gl" style={{ bottom: '66%' }}><span>{Math.round(maxDaily * 0.66)}</span></div>
                    {stats.dailyViews.map((d, i) => {
                      const isPeak = peakDay && d.day === peakDay.day && d.count > 0;
                      const pct = Math.max(3, (d.count / maxDaily) * 100);
                      return (
                        <div
                          key={d.day}
                          className={`bar${isPeak ? ' hi' : d.count === 0 ? ' z' : ''}`}
                          style={{ ['--h' as string]: d.count === 0 ? '3px' : `${pct}%`, ['--d' as string]: i }}
                        >
                          {isPeak && <span className="tip">{longSeries ? shortDate(d.day) : dayLabel(d.day)} · {d.count} views</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="days">
                    {stats.dailyViews.map((d, i) => (
                      <span key={d.day} className={peakDay?.day === d.day ? 't' : ''}>{axisLabel(d.day, i)}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card r" style={{ ['--i' as string]: 4 }}>
                <div className="card-h"><h3>Designs by type</h3></div>
                {genByKind.length === 0 ? (
                  <div className="empty">
                    <div className="stack">
                      {TEMPLATE_SAMPLES.map((src) => <figure key={src}><img src={src} alt="" /></figure>)}
                    </div>
                    <h4>No generations yet</h4>
                    <p>Redesigns, cleanups and replacements show up here once members start designing.</p>
                    <div className="types">
                      <div>Redesign<b>0</b></div>
                      <div>Cleanup<b>0</b></div>
                      <div>Replace<b>0</b></div>
                    </div>
                  </div>
                ) : (
                  <div className="empty" style={{ justifyContent: 'center', gap: 14 }}>
                    {genByKind.map((k) => {
                      const max = genByKind[0].count || 1;
                      return (
                        <div key={k.kind}>
                          <div className="flex items-center justify-between text-[12.5px]" style={{ color: 'var(--taupe)' }}>
                            <span>{KIND_LABEL[k.kind] ?? k.kind}</span>
                            <span style={{ color: 'var(--char)', fontWeight: 600 }}>{k.count}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--stone-2)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(k.count / max) * 100}%`, background: 'var(--brass)', transition: 'width .6s var(--ease)' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="row3">
              <div className="card r" style={{ ['--i' as string]: 5 }}>
                <div className="card-h">
                  <h3>Latest signups</h3>
                  <span className="tagp">{stats.signupsTotal} total</span>
                  <Link className="more" to="/admin/accounts">All accounts <ArrowRight width={13} height={13} /></Link>
                </div>
                <div className="people">
                  {stats.signupsTotal === 0 && <p className="px-3 py-6 text-[13px]" style={{ color: 'var(--taupe)' }}>No signups yet.</p>}
                  {latestSignups.map((u) => (
                    <Link key={u.id} to={`/admin/accounts?q=${encodeURIComponent(u.email ?? '')}`} className="person">
                      <div className="av s l">{(u.name || u.email || '?').charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="nm">{u.name || 'No name'}</div>
                        <div className="em">{u.email} · {shortDate(u.createdAt)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="card r" style={{ ['--i' as string]: 6 }}>
                <div className="card-h">
                  <h3>Needs your attention</h3>
                </div>
                <div className="todo">
                  <Link className="task" to="/admin/leads">
                    <div className={`ic${leadsSummary?.unread ? ' hot' : ''}`}><Inbox width={18} height={18} /></div>
                    <div>
                      <b>{leadsSummary?.unread ? `${leadsSummary.unread} new lead${leadsSummary.unread === 1 ? '' : 's'} unread` : 'Leads inbox clear'}</b>
                      <span>{leadsSummary?.total ?? 0} total enquiries</span>
                    </div>
                    <span className="go"><ArrowRight width={16} height={16} /></span>
                  </Link>
                  <Link className="task" to="/admin/blog">
                    <div className="ic"><FileText width={18} height={18} /></div>
                    <div>
                      <b>{blogSummary?.total ?? 0} articles in the journal</b>
                      <span>Manage drafts and live posts</span>
                    </div>
                    <span className="go"><ArrowRight width={16} height={16} /></span>
                  </Link>
                  <Link className={`task${!stats.openTickets ? ' done' : ''}`} to="/admin/support">
                    <div className="ic"><Check width={18} height={18} /></div>
                    <div>
                      <b>{stats.openTickets ? `${stats.openTickets} open support ${stats.openTickets === 1 ? 'ticket' : 'tickets'}` : 'Support inbox clear'}</b>
                      <span>{stats.openTickets ? 'Waiting on you' : 'Nothing waiting'}</span>
                    </div>
                    <span className="go"><ArrowRight width={16} height={16} /></span>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </AdminShell>
  );
}

/** A tiny 96×40 sparkline from the last 7 days of page views. */
function sparkPath(counts: number[]) {
  const max = Math.max(1, ...counts);
  const step = 96 / Math.max(1, counts.length - 1);
  const points = counts.map((c, i) => [i * step, 36 - (c / max) * 32]);
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}
