'use client';
import { useEffect, useState } from 'react';
import { useConfirm } from '@/components/ConfirmDialog';

interface CmsPost {
    id: string; title: string; slug: string; excerpt: string;
    body: string; category: string; status: string; createdAt: string;
}

const CATEGORIES = ['Tin tức', 'Hướng dẫn', 'Cập nhật', 'Khuyến mãi'];

export default function CmsPage() {
    const [posts, setPosts] = useState<CmsPost[]>([]);
    const [editing, setEditing] = useState<Partial<CmsPost> | null>(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const { confirm } = useConfirm();

    useEffect(() => { loadPosts(); }, []);

    const loadPosts = () => {
        fetch('/api/emk-crm/cms')
            .then(r => r.json())
            .then(d => setPosts(d.posts || []))
            .catch(() => { });
    };

    const save = async () => {
        if (!editing?.title || !editing?.slug) { setMsg('Vui lòng nhập tiêu đề và slug'); return; }
        setSaving(true);
        const res = await fetch('/api/emk-crm/cms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editing.id || undefined,
                title: editing.title, slug: editing.slug,
                excerpt: editing.excerpt || '', content: editing.body || '',
                category: editing.category || 'Tin tức',
                status: editing.status || 'DRAFT',
            }),
        });
        const data = await res.json();
        setMsg(data.message || data.error || 'Đã lưu');
        setSaving(false);
        setEditing(null);
        loadPosts();
    };

    const deletePost = async (id: string) => {
        const ok = await confirm({ title: '⚠️ Xóa bài viết', message: 'Bạn có chắc muốn xóa bài viết này? Hành động không thể hoàn tác.', variant: 'danger', confirmLabel: 'Xóa', cancelLabel: 'Huỷ' });
        if (!ok) return;
        await fetch(`/api/emk-crm/cms?id=${id}`, { method: 'DELETE' });
        loadPosts();
    };

    const toggleStatus = async (post: CmsPost) => {
        const newStatus = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
        await fetch('/api/emk-crm/cms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...post, content: post.body, status: newStatus }),
        });
        loadPosts();
    };

    const catColors: Record<string, string> = {
        'Tin tức': '#3b82f6', 'Hướng dẫn': '#22c55e', 'Cập nhật': '#f59e0b', 'Khuyến mãi': '#ef4444',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Quản lý nội dung (CMS)</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Bài viết hiển thị trên Hub cho khách hàng</p>
                </div>
                <button onClick={() => setEditing({ title: '', slug: '', excerpt: '', body: '', category: 'Tin tức', status: 'DRAFT' })} style={{
                    padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: 'var(--accent-primary)', color: 'white', fontWeight: 700, fontSize: '13px',
                }}>+ Bài mới</button>
            </div>

            {msg && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {msg}
                    <button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
            )}

            {/* Editor */}
            {editing && (
                <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{editing.id ? 'Chỉnh sửa' : 'Bài viết mới'}</h3>
                    <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value, slug: editing.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} placeholder="Tiêu đề" className="form-input" style={{ fontSize: '15px', fontWeight: 600 }} />
                    <input value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="slug-url" className="form-input" style={{ fontSize: '13px', fontFamily: 'monospace' }} />
                    <input value={editing.excerpt || ''} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} placeholder="Mô tả ngắn (excerpt)" className="form-input" />
                    <textarea value={editing.body || ''} onChange={e => setEditing({ ...editing, body: e.target.value })} placeholder="Nội dung bài viết..." rows={8} className="form-input" style={{ resize: 'vertical', minHeight: '120px' }} />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {CATEGORIES.map(c => (
                            <button key={c} onClick={() => setEditing({ ...editing, category: c })} style={{
                                padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer',
                                fontSize: '12px', fontWeight: 600,
                                background: editing.category === c ? `${catColors[c]}15` : 'transparent',
                                color: editing.category === c ? catColors[c] : 'var(--text-muted)',
                            }}>{c}</button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditing(null)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Huỷ</button>
                        <button onClick={() => { setEditing({ ...editing, status: 'PUBLISHED' }); setTimeout(save, 0); }} disabled={saving} style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: '#22c55e', color: 'white' }}>Xuất bản</button>
                        <button onClick={save} disabled={saving} style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: 'var(--accent-primary)', color: 'white' }}>{saving ? 'Đang lưu...' : 'Lưu nháp'}</button>
                    </div>
                </div>
            )}

            {/* Post list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
                        <div style={{ fontSize: '14px' }}>Chưa có bài viết nào</div>
                    </div>
                ) : posts.map(post => (
                    <div key={post.id} style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: `${catColors[post.category] || '#6366f1'}12`, color: catColors[post.category] || '#6366f1' }}>{post.category}</span>
                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: post.status === 'PUBLISHED' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: post.status === 'PUBLISHED' ? '#22c55e' : '#f59e0b' }}>{post.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Nháp'}</span>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>/{post.slug} · {new Date(post.createdAt).toLocaleDateString('vi-VN')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button onClick={() => toggleStatus(post)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{post.status === 'PUBLISHED' ? 'Ẩn' : 'Xuất bản'}</button>
                            <button onClick={() => setEditing(post)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Sửa</button>
                            <button onClick={() => deletePost(post.id)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#ef4444' }}>Xóa</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
