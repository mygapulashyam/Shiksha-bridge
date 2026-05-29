import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, Modal, Pagination, SearchInput, SectionHeader } from '../../components/common/UI';
import api from '../../api/axios';

const BLANK = { name: '', district: '', state: '', block: '', type: 'government', medium: 'hindi', board: 'state', udiseCode: '', principalName: '', phone: '' };

export default function AdminSchools() {
  const [schools, setSchools] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);

  const fetchSchools = async (pg = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/schools?page=${pg}&limit=15${search ? `&state=${search}` : ''}`);
      setSchools(data.data);
      setPagination(data.pagination);
    } catch { setError('Failed to load schools'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSchools(page); }, [page]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/schools/${editingId}`, form);
        setSuccess('School updated successfully!');
      } else {
        await api.post('/admin/schools', form);
        setSuccess('School created successfully!');
      }
      setModal(false);
      setForm(BLANK);
      setEditingId(null);
      fetchSchools(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save school');
    } finally { setSaving(false); }
  };

  const F = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Schools</h1>
        <p className="page-subtitle">Manage all registered schools on the platform</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="card">
        <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by state..." style={{ maxWidth: 280 }} />
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => fetchSchools(page)}>🔄 Refresh</button>
            <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Add School</button>
          </div>
        </div>

        {loading ? (
          <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : schools.length === 0 ? (
          <EmptyState icon="🏫" title="No schools yet" message="Add your first school to get started."
            action={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Add School</button>} />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>School Name</th>
                  <th>UDISE Code</th>
                  <th>District</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Medium</th>
                  <th>Board</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map(s => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ color: 'var(--gray-500)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{s.udiseCode || '—'}</td>
                    <td>{s.district}</td>
                    <td>{s.state}</td>
                    <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{s.type}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{s.medium}</td>
                    <td style={{ textTransform: 'uppercase' }}>{s.board}</td>
                    <td><span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-xs" onClick={() => { setForm({
                          name: s.name || '', udiseCode: s.udiseCode || '', district: s.district || '', state: s.state || '', block: s.block || '', type: s.type || 'government', medium: s.medium || 'hindi', board: s.board || 'state', principalName: s.principalName || '', phone: s.phone || '', isActive: s.isActive
                        }); setEditingId(s._id); setModal(true); }}>Edit</button>
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

      {/* Add School Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditingId(null); setForm(BLANK); }} title={editingId ? 'Edit School' : 'Add New School'} size="lg">
        <form onSubmit={handleSave}>
          <div className="grid-2 gap-4">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">School Name *</label>
              <input className="form-input" required value={form.name} onChange={F('name')} placeholder="Govt. High School, Nagpur" />
            </div>
            <div className="form-group">
              <label className="form-label">UDISE Code</label>
              <input className="form-input" value={form.udiseCode} onChange={F('udiseCode')} placeholder="27XXXXXXXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">District *</label>
              <input className="form-input" required value={form.district} onChange={F('district')} placeholder="Nagpur" />
            </div>
            <div className="form-group">
              <label className="form-label">State *</label>
              <input className="form-input" required value={form.state} onChange={F('state')} placeholder="Maharashtra" />
            </div>
            <div className="form-group">
              <label className="form-label">Block / Taluka</label>
              <input className="form-input" value={form.block} onChange={F('block')} placeholder="Hingna" />
            </div>
            <div className="form-group">
              <label className="form-label">School Type</label>
              <select className="form-input form-select" value={form.type} onChange={F('type')}>
                {['government','aided','private','kv','navodaya'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Medium of Instruction</label>
              <select className="form-input form-select" value={form.medium} onChange={F('medium')}>
                {['english','hindi','bilingual','regional'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Board</label>
              <select className="form-input form-select" value={form.board} onChange={F('board')}>
                {['cbse','icse','state','nios'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Principal Name</label>
              <input className="form-input" value={form.principalName} onChange={F('principalName')} placeholder="Dr. Sunita Sharma" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={F('phone')} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : '✓ Save School'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
