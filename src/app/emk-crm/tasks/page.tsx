'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';

interface Task {
    id: string; title: string; type: string; status: string; dueDate: string | null;
    owner: { name: string } | null;
    lead: { name: string; phone: string | null } | null;
    account: { workspace: { name: string } } | null;
}

const TYPE_ICONS: Record<string, string> = {
    ALL: '📋', CALL: '📞', DEMO: '💻', FOLLOW_UP: '🔄', RENEWAL: '🔁', GENERAL: '📋',
};
const TYPE_VN: Record<string, string> = {
    ALL: 'Tất cả', CALL: 'Gọi điện', DEMO: 'Demo', FOLLOW_UP: 'Theo dõi', RENEWAL: 'Gia hạn', GENERAL: 'Chung',
};
const TYPE_COLORS: Record<string, string> = {
    CALL: '#3b82f6', DEMO: '#8b5cf6', FOLLOW_UP: '#f59e0b', RENEWAL: '#22c55e', GENERAL: '#6b7280',
};

const TABS = ['ALL', 'CALL', 'DEMO', 'FOLLOW_UP', 'RENEWAL', 'GENERAL'] as const;
const VIEW_MODES = ['LIST', 'CALENDAR'] as const;

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [view, setView] = useState<'LIST' | 'CALENDAR'>('LIST');
    const [showAdd, setShowAdd] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newType, setNewType] = useState('GENERAL');
    const [newDue, setNewDue] = useState('');
    const [adding, setAdding] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/emk-crm/tasks?status=OPEN').then(r => r.json()).then(d => { setTasks(d.tasks || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);
    useEffect(load, [load]);

    const filtered = useMemo(() => filter === 'ALL' ? tasks : tasks.filter(t => t.type === filter), [tasks, filter]);
    const overdueCount = useMemo(() => tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length, [tasks]);

    const addTask = async () => {
        if (!newTitle.trim()) return;
        setAdding(true);
        await fetch('/api/emk-crm/tasks', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, type: newType, dueDate: newDue || null }),
        });
        setNewTitle(''); setNewType('GENERAL'); setNewDue(''); setShowAdd(false); setAdding(false); load();
    };

    const complete = async (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
        await fetch('/api/emk-crm/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'DONE' }) });
    };

    const bulkComplete = async () => {
        const ids = [...selected];
        setTasks(prev => prev.filter(t => !selected.has(t.id)));
        setSelected(new Set());
        await fetch('/api/emk-crm/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, status: 'DONE' }) });
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    };

    // Calendar helpers
    const calDays = useMemo(() => {
        const first = new Date(calMonth.y, calMonth.m, 1);
        const lastDay = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
        const startPad = first.getDay() === 0 ? 6 : first.getDay() - 1; // Mon start
        const days: Array<{ day: number; date: string; isMonth: boolean }> = [];
        // Padding before
        const prevLast = new Date(calMonth.y, calMonth.m, 0).getDate();
        for (let i = startPad - 1; i >= 0; i--) days.push({ day: prevLast - i, date: '', isMonth: false });
        // Current month
        for (let d = 1; d <= lastDay; d++) {
            const dt = new Date(calMonth.y, calMonth.m, d);
            days.push({ day: d, date: dt.toISOString().slice(0, 10), isMonth: true });
        }
        // Padding after
        const remaining = 42 - days.length;
        for (let d = 1; d <= remaining; d++) days.push({ day: d, date: '', isMonth: false });
        return days;
    }, [calMonth]);

    const tasksByDate = useMemo(() => {
        const m = new Map<string, Task[]>();
        tasks.forEach(t => {
            if (t.dueDate) {
                const key = new Date(t.dueDate).toISOString().slice(0, 10);
                m.set(key, [...(m.get(key) || []), t]);
            }
        });
        return m;
    }, [tasks]);

    const today = new Date().toISOString().slice(0, 10);
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg> Công việc
                        {overdueCount > 0 && (
                            <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, background: '#ef444420', color: '#ef4444' }}>
                                ⚠ {overdueCount} quá hạn
                            </span>
                        )}
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        {tasks.length} việc · {filtered.length} hiển thị
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {/* View toggle */}
                    <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        {VIEW_MODES.map(m => (
                            <button key={m} onClick={() => setView(m)} style={{
                                padding: '8px 12px', fontSize: '12px', fontWeight: 600,
                                background: view === m ? 'var(--accent-primary)' : 'var(--bg-card)',
                                color: view === m ? 'white' : 'var(--text-muted)',
                                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                                {m === 'LIST' ? '☰ List' : '📅 Lịch'}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setShowAdd(!showAdd)} style={{
                        padding: '8px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px',
                        background: 'var(--accent-gradient)', border: 'none', color: 'white',
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                        + Tạo
                    </button>
                </div>
            </div>

            {/* Bulk actions bar */}
            {selected.size > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px', borderRadius: '12px',
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Đã chọn {selected.size} việc</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setSelected(new Set())} style={{
                            padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit',
                        }}>Bỏ chọn</button>
                        <button onClick={bulkComplete} style={{
                            padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                            background: '#22c55e', border: 'none', color: 'white',
                            cursor: 'pointer', fontFamily: 'inherit',
                        }}>✓ Hoàn thành tất cả</button>
                    </div>
                </div>
            )}

            {/* Add form */}
            {showAdd && (
                <div style={{
                    padding: '16px', borderRadius: '16px', background: 'var(--bg-card)',
                    border: '1px solid var(--accent-primary)', display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Tiêu đề công việc…"
                        onKeyDown={e => e.key === 'Enter' && addTask()}
                        style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={newType} onChange={e => setNewType(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit' }}>
                            {['GENERAL', 'CALL', 'DEMO', 'FOLLOW_UP', 'RENEWAL'].map(t => (
                                <option key={t} value={t}>{TYPE_ICONS[t]} {TYPE_VN[t]}</option>
                            ))}
                        </select>
                        <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowAdd(false)} style={{ padding: '10px 16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600 }}>Hủy</button>
                        <button onClick={addTask} disabled={adding || !newTitle.trim()} style={{
                            padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
                            background: 'var(--accent-gradient)', border: 'none', color: 'white',
                            cursor: adding ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: adding ? 0.6 : 1,
                        }}>
                            {adding ? 'Đang tạo…' : 'Tạo công việc'}
                        </button>
                    </div>
                </div>
            )}

            {/* Type filter tabs */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                {TABS.map(t => {
                    const count = t === 'ALL' ? tasks.length : tasks.filter(tk => tk.type === t).length;
                    const active = filter === t;
                    return (
                        <button key={t} onClick={() => setFilter(t)} style={{
                            padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                            background: active ? (TYPE_COLORS[t] || 'var(--accent-primary)') + '15' : 'transparent',
                            color: active ? (TYPE_COLORS[t] || 'var(--accent-primary)') : 'var(--text-muted)',
                            border: active ? `1px solid ${(TYPE_COLORS[t] || 'var(--accent-primary)')}30` : '1px solid transparent',
                            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                            transition: 'all 150ms ease',
                        }}>
                            {TYPE_ICONS[t]} {TYPE_VN[t]} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ height: '60px', borderRadius: '14px', background: 'var(--bg-card)', animation: 'tkPulse 1.5s ease-in-out infinite' }} />)}
                    <style>{`@keyframes tkPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
                </div>
            ) : view === 'CALENDAR' ? (
                /* Calendar view */
                <div style={{ borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <button onClick={() => setCalMonth(p => p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px 8px', color: 'var(--text-primary)' }}>◀</button>
                        <span style={{ fontWeight: 700, fontSize: '15px' }}>{monthNames[calMonth.m]} {calMonth.y}</span>
                        <button onClick={() => setCalMonth(p => p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px 8px', color: 'var(--text-primary)' }}>▶</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px' }}>{d}</div>
                        ))}
                        {calDays.map((d, i) => {
                            const dayTasks = d.date ? tasksByDate.get(d.date) || [] : [];
                            const isToday = d.date === today;
                            const hasOverdue = dayTasks.some(t => d.date < today);
                            return (
                                <div key={i} style={{
                                    minHeight: '48px', padding: '4px', borderRadius: '8px',
                                    background: isToday ? 'rgba(99,102,241,0.08)' : 'transparent',
                                    border: isToday ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                                    opacity: d.isMonth ? 1 : 0.3,
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent-primary)' : 'var(--text-muted)', marginBottom: '2px' }}>{d.day}</div>
                                    {dayTasks.slice(0, 2).map(t => (
                                        <div key={t.id} style={{
                                            fontSize: '9px', padding: '1px 3px', borderRadius: '4px', marginBottom: '1px',
                                            background: `${TYPE_COLORS[t.type] || '#6b7280'}15`,
                                            color: hasOverdue ? '#ef4444' : (TYPE_COLORS[t.type] || '#6b7280'),
                                            fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {TYPE_ICONS[t.type]} {t.title.slice(0, 10)}
                                        </div>
                                    ))}
                                    {dayTasks.length > 2 && (
                                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center' }}>+{dayTasks.length - 2}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                    <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Không có việc nào</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Bấm "+ Tạo" để thêm công việc mới</p>
                </div>
            ) : (
                /* List view */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {filtered.map(t => {
                        const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                        const typeColor = TYPE_COLORS[t.type] || '#6b7280';
                        const isSelected = selected.has(t.id);
                        return (
                            <div key={t.id} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '12px 14px', borderRadius: '14px',
                                background: isOverdue ? 'rgba(239,68,68,0.04)' : isSelected ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                                border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.2)' : isSelected ? 'rgba(99,102,241,0.2)' : 'var(--border)'}`,
                                transition: 'all 150ms ease',
                            }}>
                                {/* Select checkbox */}
                                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(t.id)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0, accentColor: 'var(--accent-primary)' }}
                                />
                                {/* Complete button */}
                                <button onClick={() => complete(t.id)} title="Hoàn thành" style={{
                                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                                    border: `2px solid ${typeColor}`, background: 'transparent',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '11px', color: typeColor, transition: 'all 150ms ease',
                                }}>✓</button>
                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <span title={TYPE_VN[t.type]}>{TYPE_ICONS[t.type] || '📋'}</span>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                                        {isOverdue && (
                                            <span style={{ padding: '1px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, background: '#ef444420', color: '#ef4444', whiteSpace: 'nowrap' }}>QUÁ HẠN</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                                        <span style={{ padding: '1px 6px', borderRadius: '4px', background: `${typeColor}12`, color: typeColor, fontWeight: 600, fontSize: '10px' }}>{TYPE_VN[t.type] || t.type}</span>
                                        {t.dueDate && (
                                            <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                                                📅 {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                                            </span>
                                        )}
                                        {t.owner && <span>👤 {t.owner.name}</span>}
                                        {t.lead && <span>🎯 {t.lead.name}</span>}
                                        {t.account && <span>🏢 {t.account.workspace.name}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
