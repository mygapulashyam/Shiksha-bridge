import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, Modal, Pagination, SearchInput, SectionHeader } from '../../components/common/UI';
import api from '../../api/axios';

const BLANK_USER = {
  name: '',
  email: '',
  password: '',
  role: 'teacher',
  school: '',
  language: 'en',
  rollNumber: '',
  class: '',
  subjects: [],
  classes: [],
};
const ROLE_COLORS = { admin: 'badge-danger', teacher: 'badge-success', student: 'badge-info' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK_USER);
  const [editModal, setEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState('');
  const [editForm, setEditForm] = useState(BLANK_USER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);

  const availableClasses = classes.filter(c => {
    const sId = typeof c.school === 'object' ? c.school?._id : c.school;
    return !form.school || sId === form.school;
  });

  const availableEditClasses = classes.filter(c => {
    const sId = typeof c.school === 'object' ? c.school?._id : c.school;
    return !editForm.school || sId === editForm.school;
  });

  const fetchUsers = async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 15 });
      if (roleFilter) params.set('role', roleFilter);
      if (search) params.set('search', search);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.data);
      setPagination(data.pagination);
    } catch { setError('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/admin/schools?limit=100').then(r => setSchools(r.data.data)).catch(() => {});
    api.get('/admin/classes?limit=200').then(r => setClasses(r.data.data)).catch(() => {});
    api.get('/admin/subjects').then(r => setSubjects(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchUsers(page); }, [page, roleFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.role !== 'student') {
        payload.class = '';
        payload.rollNumber = '';
      }
      if (payload.role !== 'teacher') {
        payload.subjects = [];
        payload.classes = [];
      }
      await api.post('/auth/register', payload);
      setSuccess('User created successfully!');
      setModal(false);
      setForm(BLANK_USER);
      fetchUsers(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally { setSaving(false); }
  };

  const toggleStatus = async (userId, current) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-status`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: !current } : u));
    } catch { setError('Failed to update user status'); }
  };

  const F = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const EF = (k) => (e) => setEditForm(p => ({ ...p, [k]: e.target.value }));

  const toggleFormArray = (key, value) => {
    setForm(prev => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const has = current.includes(value);
      return { ...prev, [key]: has ? current.filter(v => v !== value) : [...current, value] };
    });
  };

  const toggleEditArray = (key, value) => {
    setEditForm(prev => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const has = current.includes(value);
      return { ...prev, [key]: has ? current.filter(v => v !== value) : [...current, value] };
    });
  };

  const openEditModal = (user) => {
    setEditingUserId(user._id);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'teacher',
      school: user.school?._id || '',
      language: user.language || 'en',
      class: user.class?._id || '',
      rollNumber: user.rollNumber || '',
      subjects: (user.subjects || []).map(s => (typeof s === 'string' ? s : s._id)).filter(Boolean),
      classes: (user.classes || []).map(c => (typeof c === 'string' ? c : c._id)).filter(Boolean),
    });
    setEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingUserId) return;
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      if (payload.role !== 'student') {
        payload.class = '';
        payload.rollNumber = '';
      }
      if (payload.role !== 'teacher') {
        payload.subjects = [];
        payload.classes = [];
      }
      await api.put(`/admin/users/${editingUserId}`, payload);
      setSuccess('User updated successfully!');
      setEditModal(false);
      setEditingUserId('');
      fetchUsers(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">Manage teachers and students across all schools</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="card">
        <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="flex gap-3 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name..." style={{ maxWidth: 240 }} />
            <select className="form-input form-select" style={{ width: 140 }} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => fetchUsers(page)}>🔍 Search</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Add User</button>
        </div>

        {loading ? (
          <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : users.length === 0 ? (
          <EmptyState icon="👥" title="No users found" message="Create users or adjust your filters." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>School</th>
                  <th>Class</th>
                  <th>Info</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar avatar-sm" style={{ background: u.role === 'teacher' ? 'var(--secondary)' : u.role === 'admin' ? 'var(--primary)' : 'var(--info)' }}>
                          {u.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{u.email}</td>
                    <td><span className={`badge ${ROLE_COLORS[u.role]}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>{u.school?.name || '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{u.class ? `Gr ${u.class?.grade} ${u.class?.section}` : '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>
                      <div style={{ color: 'var(--gray-700)', marginBottom: 6 }}>
                        {u.role === 'teacher' ? `Subjects: ${u.subjects?.length || 0} · Classes: ${u.classes?.length || 0}` : '—'}
                      </div>
                      <div style={{ color: 'var(--gray-500)' }}>
                        {u.streak > 0 ? `🔥 Streak: ${u.streak}` : ''}
                      </div>
                    </td>
                    <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-gray'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => openEditModal(u)}>
                          ✏️ Edit
                        </button>
                        <button className={`btn btn-sm ${u.isActive ? 'btn-ghost' : 'btn-secondary'}`}
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => toggleStatus(u._id, u.isActive)}>
                          {u.isActive ? '🔒 Deactivate' : '✅ Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Add User Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Create New User" size="lg">
        <form onSubmit={handleSave}>
          <div className="grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" required value={form.name} onChange={F('name')} placeholder="Priya Sharma" />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" required type="email" value={form.email} onChange={F('email')} placeholder="priya@school.edu" />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input className="form-input" required type="password" value={form.password} onChange={F('password')} placeholder="Min. 6 characters" minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-input form-select" value={form.role} onChange={F('role')}>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">School</label>
              <select className="form-input form-select" value={form.school} onChange={F('school')}>
                <option value="">Select School</option>
                {schools.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <select className="form-input form-select" value={form.language} onChange={F('language')}>
                {[['en','English'],['hi','हिंदी'],['mr','मराठी'],['ta','தமிழ்'],['te','తెలుగు'],['kn','ಕನ್ನಡ'],['bn','বাংলা']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {form.role === 'student' && (
              <>
                <div className="form-group">
                  <label className="form-label">Class</label>
                  <select className="form-input form-select" value={form.class || ''} onChange={F('class')}>
                    <option value="">Select Class</option>
                    {availableClasses.map(c => <option key={c._id} value={c._id}>{c.name} (Grade {c.grade})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input className="form-input" value={form.rollNumber} onChange={F('rollNumber')} placeholder="14" />
                </div>
              </>
            )}
            {form.role === 'teacher' && (
              <>
                <div className="form-group">
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Subjects</label>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(p => ({ ...p, subjects: [] }))}>Clear</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(p => ({ ...p, subjects: subjects.map(s => s._id) }))}>Select All</button>
                    </div>
                  </div>
                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 10, maxHeight: 140, overflowY: 'auto' }}>
                    {subjects.length === 0 && <div style={{ color: 'var(--gray-500)', fontSize: '0.82rem' }}>No subjects available</div>}
                    {subjects.map(s => (
                      <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.88rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={(form.subjects || []).includes(s._id)} onChange={() => toggleFormArray('subjects', s._id)} />
                        <span>{s.icon ? `${s.icon} ` : ''}{s.name} {s.grade ? `(Gr ${s.grade})` : ''}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Assigned Classes</label>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(p => ({ ...p, classes: [] }))}>Clear</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(p => ({ ...p, classes: availableClasses.map(c => c._id) }))}>Select All</button>
                    </div>
                  </div>
                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 10, maxHeight: 140, overflowY: 'auto' }}>
                    {availableClasses.length === 0 && <div style={{ color: 'var(--gray-500)', fontSize: '0.82rem' }}>No classes available</div>}
                    {availableClasses.map(c => (
                      <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.88rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={(form.classes || []).includes(c._id)} onChange={() => toggleFormArray('classes', c._id)} />
                        <span>{c.name} (Grade {c.grade}{c.section ? `-${c.section}` : ''})</span>
                      </label>
                    ))}
                  </div>
                  <small style={{ color: 'var(--gray-500)' }}>Optional: assign one or more classes to this teacher</small>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : '✓ Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit User" size="lg">
        <form onSubmit={handleUpdate}>
          <div className="grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" required value={editForm.name} onChange={EF('name')} placeholder="Priya Sharma" />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" required type="email" value={editForm.email} onChange={EF('email')} placeholder="priya@school.edu" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password (optional)</label>
              <input className="form-input" type="password" value={editForm.password} onChange={EF('password')} placeholder="Leave blank to keep current password" minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-input form-select" value={editForm.role} onChange={EF('role')}>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">School</label>
              <select className="form-input form-select" value={editForm.school} onChange={EF('school')}>
                <option value="">Select School</option>
                {schools.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <select className="form-input form-select" value={editForm.language} onChange={EF('language')}>
                {[['en','English'],['hi','हिंदी'],['mr','मराठी'],['ta','தமிழ்'],['te','తెలుగు'],['kn','ಕನ್ನಡ'],['bn','বাংলা']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {editForm.role === 'student' && (
              <>
                <div className="form-group">
                  <label className="form-label">Class</label>
                  <select className="form-input form-select" value={editForm.class || ''} onChange={EF('class')}>
                    <option value="">Select Class</option>
                    {availableEditClasses.map(c => <option key={c._id} value={c._id}>{c.name} (Grade {c.grade})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input className="form-input" value={editForm.rollNumber || ''} onChange={EF('rollNumber')} placeholder="14" />
                </div>
              </>
            )}
            {editForm.role === 'teacher' && (
              <>
                <div className="form-group">
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Subjects</label>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditForm(p => ({ ...p, subjects: [] }))}>Clear</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditForm(p => ({ ...p, subjects: subjects.map(s => s._id) }))}>Select All</button>
                    </div>
                  </div>
                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 10, maxHeight: 140, overflowY: 'auto' }}>
                    {subjects.length === 0 && <div style={{ color: 'var(--gray-500)', fontSize: '0.82rem' }}>No subjects available</div>}
                    {subjects.map(s => (
                      <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.88rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={(editForm.subjects || []).includes(s._id)} onChange={() => toggleEditArray('subjects', s._id)} />
                        <span>{s.icon ? `${s.icon} ` : ''}{s.name} {s.grade ? `(Gr ${s.grade})` : ''}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Assigned Classes</label>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditForm(p => ({ ...p, classes: [] }))}>Clear</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditForm(p => ({ ...p, classes: availableEditClasses.map(c => c._id) }))}>Select All</button>
                    </div>
                  </div>
                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 10, maxHeight: 140, overflowY: 'auto' }}>
                    {availableEditClasses.length === 0 && <div style={{ color: 'var(--gray-500)', fontSize: '0.82rem' }}>No classes available</div>}
                    {availableEditClasses.map(c => (
                      <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.88rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={(editForm.classes || []).includes(c._id)} onChange={() => toggleEditArray('classes', c._id)} />
                        <span>{c.name} (Grade {c.grade}{c.section ? `-${c.section}` : ''})</span>
                      </label>
                    ))}
                  </div>
                  <small style={{ color: 'var(--gray-500)' }}>Optional: assign one or more classes to this teacher</small>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setEditModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Updating…' : '✓ Update User'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
