import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, Modal } from '../../components/common/UI';
import api from '../../api/axios';

const GRADES = [6, 7, 8, 9, 10];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

const GRADE_COLORS = {
  6: { bg: '#EEF2FF', border: '#818CF8', text: '#4338CA', badge: '#6366F1' },
  7: { bg: '#F0FDF4', border: '#4ADE80', text: '#166534', badge: '#22C55E' },
  8: { bg: '#FFF7ED', border: '#FB923C', text: '#9A3412', badge: '#F97316' },
  9: { bg: '#FDF4FF', border: '#C084FC', text: '#6B21A8', badge: '#A855F7' },
 10: { bg: '#FFF1F2', border: '#FB7185', text: '#9F1239', badge: '#F43F5E' },
};

const BLANK_CLASS = {
  name: '',
  grade: 6,
  section: 'A',
  school: '',
  classTeacher: '',
  academicYear: '2024-25',
  isActive: true,
};

function buildClassName(grade, section) {
  return section ? `Class ${grade} - ${section}` : `Class ${grade}`;
}

export default function AdminClasses() {
  const [classes, setClasses]     = useState([]);
  const [schools, setSchools]     = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // Filters
  const [filterSchool, setFilterSchool] = useState('');
  const [filterGrade, setFilterGrade]   = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Modals
  const [createModal, setCreateModal]   = useState(false);
  const [editModal, setEditModal]       = useState(false);
  const [deleteModal, setDeleteModal]   = useState(false);
  const [bulkModal, setBulkModal]       = useState(false);

  // Forms
  const [form, setForm]       = useState(BLANK_CLASS);
  const [editForm, setEditForm] = useState(BLANK_CLASS);
  const [editingId, setEditingId] = useState('');
  const [deletingClass, setDeletingClass] = useState(null);
  const [saving, setSaving]   = useState(false);

  // Bulk create
  const [bulkSchool, setBulkSchool]       = useState('');
  const [bulkGrades, setBulkGrades]       = useState([6, 7, 8, 9, 10]);
  const [bulkSections, setBulkSections]   = useState(['A', 'B']);
  const [bulkYear, setBulkYear]           = useState('2024-25');
  const [bulkSaving, setBulkSaving]       = useState(false);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSchool) params.set('school', filterSchool);
      if (filterGrade)  params.set('grade', filterGrade);
      const { data } = await api.get(`/admin/classes?${params}&limit=500`);
      let result = data.data || [];
      if (filterActive === 'active')   result = result.filter(c => c.isActive);
      if (filterActive === 'inactive') result = result.filter(c => !c.isActive);
      setClasses(result);
    } catch { setError('Failed to load classes'); }
    finally { setLoading(false); }
  }, [filterSchool, filterGrade, filterActive]);

  useEffect(() => {
    api.get('/admin/schools?limit=200').then(r => setSchools(r.data.data || [])).catch(() => {});
    api.get('/admin/users?role=teacher&limit=300').then(r => setTeachers(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  // Auto-generate class name when grade/section changes
  const autoName = (g, s) => buildClassName(g, s);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, name: autoName(form.grade, form.section) };
      if (!payload.classTeacher) delete payload.classTeacher;
      await api.post('/admin/classes', payload);
      setSuccess(`✅ Class ${autoName(form.grade, form.section)} created successfully!`);
      setCreateModal(false);
      setForm(BLANK_CLASS);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create class');
    } finally { setSaving(false); }
  };

  const openEdit = (cls) => {
    setEditingId(cls._id);
    setEditForm({
      name: cls.name || '',
      grade: cls.grade || 6,
      section: cls.section || '',
      school: typeof cls.school === 'object' ? cls.school?._id : cls.school || '',
      classTeacher: typeof cls.classTeacher === 'object' ? cls.classTeacher?._id : cls.classTeacher || '',
      academicYear: cls.academicYear || '2024-25',
      isActive: cls.isActive !== false,
    });
    setEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...editForm, name: autoName(editForm.grade, editForm.section) };
      await api.put(`/admin/classes/${editingId}`, payload);
      setSuccess('✅ Class updated successfully!');
      setEditModal(false);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update class');
    } finally { setSaving(false); }
  };

  const openDelete = (cls) => {
    setDeletingClass(cls);
    setDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingClass) return;
    setSaving(true);
    try {
      await api.delete(`/admin/classes/${deletingClass._id}`);
      setSuccess(`🗑️ Class "${deletingClass.name}" deleted and users unlinked.`);
      setDeleteModal(false);
      setDeletingClass(null);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete class');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (cls) => {
    try {
      await api.put(`/admin/classes/${cls._id}`, { isActive: !cls.isActive });
      setClasses(prev => prev.map(c => c._id === cls._id ? { ...c, isActive: !cls.isActive } : c));
    } catch { setError('Failed to update class status'); }
  };

  const handleBulkCreate = async (e) => {
    e.preventDefault();
    if (!bulkSchool) { setError('Please select a school for bulk creation'); return; }
    setBulkSaving(true);
    let created = 0;
    let skipped = 0;
    try {
      for (const grade of bulkGrades) {
        for (const section of bulkSections) {
          try {
            await api.post('/admin/classes', {
              name: buildClassName(grade, section),
              grade,
              section,
              school: bulkSchool,
              academicYear: bulkYear,
              isActive: true,
            });
            created++;
          } catch { skipped++; }
        }
      }
      setSuccess(`✅ Bulk created ${created} class${created !== 1 ? 'es' : ''}${skipped > 0 ? `, ${skipped} skipped (already exist)` : ''}!`);
      setBulkModal(false);
      fetchClasses();
    } catch { setError('Bulk creation failed'); }
    finally { setBulkSaving(false); }
  };

  // Compute stats
  const totalByGrade = GRADES.reduce((acc, g) => {
    acc[g] = classes.filter(c => c.grade === g).length;
    return acc;
  }, {});
  const totalActive = classes.filter(c => c.isActive).length;

  // Group classes by grade for display
  const classesGrouped = GRADES.reduce((acc, g) => {
    const filtered = classes.filter(c => c.grade === g);
    if (filtered.length > 0) acc[g] = filtered;
    return acc;
  }, {});

  const schoolTeachers = (schoolId) =>
    teachers.filter(t => {
      const tSchool = typeof t.school === 'object' ? t.school?._id : t.school;
      return !schoolId || tSchool === schoolId;
    });

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Classes</h1>
        <p className="page-subtitle">Manage class sections for Class 6 – 10 across all schools</p>
      </div>

      {error   && <Alert type="error"   onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
        {GRADES.map(g => {
          const col = GRADE_COLORS[g];
          return (
            <div key={g} style={{
              background: col.bg,
              border: `2px solid ${col.border}`,
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: col.text, fontFamily: 'var(--font-display)' }}>
                {totalByGrade[g] || 0}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: col.badge, marginTop: 2 }}>
                Class {g}
              </div>
              <div style={{ fontSize: '0.65rem', color: col.text, opacity: 0.7 }}>sections</div>
            </div>
          );
        })}
        <div style={{
          background: 'var(--primary-light)',
          border: '2px solid var(--primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
            {classes.length}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginTop: 2 }}>Total</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--primary)', opacity: 0.8 }}>{totalActive} active</div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <select className="form-input form-select" style={{ width: 180 }} value={filterSchool} onChange={e => setFilterSchool(e.target.value)}>
              <option value="">All Schools</option>
              {schools.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <select className="form-input form-select" style={{ width: 130 }} value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
              <option value="">All Grades</option>
              {GRADES.map(g => <option key={g} value={g}>Class {g}</option>)}
            </select>
            <select className="form-input form-select" style={{ width: 130 }} value={filterActive} onChange={e => setFilterActive(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={fetchClasses}>🔄 Refresh</button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setBulkModal(true)}>⚡ Bulk Create</button>
            <button className="btn btn-primary btn-sm" onClick={() => setCreateModal(true)}>+ Add Class</button>
          </div>
        </div>
      </div>

      {/* Classes Table grouped by grade */}
      {loading ? (
        <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
      ) : classes.length === 0 ? (
        <EmptyState icon="🏫" title="No classes found"
          message={filterSchool || filterGrade ? 'Try adjusting filters or create a new class.' : 'Start by creating classes for your schools.'} />
      ) : (
        Object.keys(classesGrouped).map(grade => {
          const col = GRADE_COLORS[Number(grade)];
          const gradeClasses = classesGrouped[grade];
          return (
            <div key={grade} className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  background: col.bg,
                  border: `2px solid ${col.border}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 14px',
                  fontWeight: 800,
                  color: col.text,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem',
                }}>
                  Class {grade}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                  {gradeClasses.length} section{gradeClasses.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Section</th>
                      <th>School</th>
                      <th>Class Teacher</th>
                      <th>Academic Year</th>
                      <th>Students</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeClasses.map(cls => (
                      <tr key={cls._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: col.bg,
                              border: `2px solid ${col.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '0.75rem', color: col.text,
                              fontFamily: 'var(--font-display)',
                              flexShrink: 0,
                            }}>
                              {grade}
                            </div>
                            <span style={{ fontWeight: 600 }}>{cls.name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            background: cls.section ? col.bg : 'var(--gray-100)',
                            color: cls.section ? col.text : 'var(--gray-500)',
                            border: `1px solid ${cls.section ? col.border : 'var(--gray-200)'}`,
                            borderRadius: 6, padding: '2px 10px',
                            fontWeight: 700, fontSize: '0.8rem',
                          }}>
                            {cls.section || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{cls.school?.name || '—'}</td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {cls.classTeacher ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div className="avatar avatar-sm" style={{ background: 'var(--secondary)', width: 24, height: 24, fontSize: '0.6rem' }}>
                                {cls.classTeacher.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <span>{cls.classTeacher.name}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{cls.academicYear || '—'}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--info)' }}>
                            {cls.studentCount || 0}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleActive(cls)}
                            className={`badge ${cls.isActive ? 'badge-success' : 'badge-gray'}`}
                            style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                            title={cls.isActive ? 'Click to deactivate' : 'Click to activate'}
                          >
                            {cls.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem' }}
                              onClick={() => openEdit(cls)}>✏️ Edit</button>
                            <button className="btn btn-sm" style={{ fontSize: '0.72rem', background: 'var(--danger)', color: 'white', border: 'none' }}
                              onClick={() => openDelete(cls)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* ── Create Class Modal ── */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create New Class" size="md">
        <form onSubmit={handleCreate}>
          <div className="grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">School *</label>
              <select className="form-input form-select" required value={form.school}
                onChange={e => setForm(p => ({ ...p, school: e.target.value }))}>
                <option value="">Select School</option>
                {schools.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Grade *</label>
              <select className="form-input form-select" required value={form.grade}
                onChange={e => setForm(p => ({ ...p, grade: Number(e.target.value) }))}>
                {GRADES.map(g => <option key={g} value={g}>Class {g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-input form-select" value={form.section}
                onChange={e => setForm(p => ({ ...p, section: e.target.value }))}>
                <option value="">No Section</option>
                {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <select className="form-input form-select" value={form.academicYear}
                onChange={e => setForm(p => ({ ...p, academicYear: e.target.value }))}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Class Teacher (Optional)</label>
              <select className="form-input form-select" value={form.classTeacher}
                onChange={e => setForm(p => ({ ...p, classTeacher: e.target.value }))}>
                <option value="">Unassigned</option>
                {schoolTeachers(form.school).map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Preview Class Name</label>
              <div style={{
                padding: '10px 14px',
                background: 'var(--gray-100)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                color: 'var(--gray-700)',
                fontFamily: 'var(--font-display)',
              }}>
                {autoName(form.grade, form.section)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : '✓ Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Class Modal ── */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Class" size="md">
        <form onSubmit={handleUpdate}>
          <div className="grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">School *</label>
              <select className="form-input form-select" required value={editForm.school}
                onChange={e => setEditForm(p => ({ ...p, school: e.target.value }))}>
                <option value="">Select School</option>
                {schools.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Grade *</label>
              <select className="form-input form-select" required value={editForm.grade}
                onChange={e => setEditForm(p => ({ ...p, grade: Number(e.target.value) }))}>
                {GRADES.map(g => <option key={g} value={g}>Class {g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-input form-select" value={editForm.section}
                onChange={e => setEditForm(p => ({ ...p, section: e.target.value }))}>
                <option value="">No Section</option>
                {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <select className="form-input form-select" value={editForm.academicYear}
                onChange={e => setEditForm(p => ({ ...p, academicYear: e.target.value }))}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Class Teacher (Optional)</label>
              <select className="form-input form-select" value={editForm.classTeacher}
                onChange={e => setEditForm(p => ({ ...p, classTeacher: e.target.value }))}>
                <option value="">Unassigned</option>
                {schoolTeachers(editForm.school).map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input form-select" value={editForm.isActive ? 'active' : 'inactive'}
                onChange={e => setEditForm(p => ({ ...p, isActive: e.target.value === 'active' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Preview Class Name</label>
              <div style={{
                padding: '10px 14px',
                background: 'var(--gray-100)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                color: 'var(--gray-700)',
                fontFamily: 'var(--font-display)',
              }}>
                {autoName(editForm.grade, editForm.section)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setEditModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Updating…' : '✓ Update Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Class" size="sm">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
          <p style={{ fontWeight: 600, marginBottom: 8, fontSize: '1rem' }}>
            Delete "{deletingClass?.name}"?
          </p>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: 20 }}>
            This will remove the class and <strong>unlink all assigned students and teachers</strong>.
            This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={() => setDeleteModal(false)}>Cancel</button>
            <button
              className="btn"
              style={{ background: 'var(--danger)', color: 'white', border: 'none' }}
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? 'Deleting…' : '🗑️ Delete Class'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Bulk Create Modal ── */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="⚡ Bulk Create Classes" size="md">
        <form onSubmit={handleBulkCreate}>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: 16 }}>
            Quickly create multiple class sections across grades for a school.
          </p>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">School *</label>
            <select className="form-input form-select" required value={bulkSchool}
              onChange={e => setBulkSchool(e.target.value)}>
              <option value="">Select School</option>
              {schools.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Grades to Create</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GRADES.map(g => {
                const col = GRADE_COLORS[g];
                const checked = bulkGrades.includes(g);
                return (
                  <label key={g} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: checked ? col.bg : 'var(--gray-100)',
                    border: `2px solid ${checked ? col.border : 'var(--gray-200)'}`,
                    color: checked ? col.text : 'var(--gray-500)',
                    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    <input type="checkbox" checked={checked} style={{ display: 'none' }}
                      onChange={() => setBulkGrades(prev =>
                        prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g].sort((a, b) => a - b)
                      )} />
                    Class {g}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Sections to Create</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SECTIONS.map(s => {
                const checked = bulkSections.includes(s);
                return (
                  <label key={s} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: checked ? 'var(--primary-light)' : 'var(--gray-100)',
                    border: `2px solid ${checked ? 'var(--primary)' : 'var(--gray-200)'}`,
                    color: checked ? 'var(--primary)' : 'var(--gray-500)',
                    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    <input type="checkbox" checked={checked} style={{ display: 'none' }}
                      onChange={() => setBulkSections(prev =>
                        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s].sort()
                      )} />
                    {s}
                  </label>
                );
              })}
            </div>
            <small style={{ color: 'var(--gray-400)', display: 'block', marginTop: 6 }}>
              Will create: {bulkGrades.length} grades × {bulkSections.length} sections = <strong>{bulkGrades.length * bulkSections.length} classes</strong>
            </small>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Academic Year</label>
            <select className="form-input form-select" value={bulkYear}
              onChange={e => setBulkYear(e.target.value)}>
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {bulkGrades.length > 0 && bulkSections.length > 0 && (
            <div style={{
              background: 'var(--gray-100)', borderRadius: 'var(--radius-md)',
              padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem',
            }}>
              <strong>Preview:</strong>{' '}
              {bulkGrades.flatMap(g => bulkSections.map(s => buildClassName(g, s))).join(', ')}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setBulkModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={bulkSaving || bulkGrades.length === 0 || bulkSections.length === 0}>
              {bulkSaving ? 'Creating…' : `⚡ Create ${bulkGrades.length * bulkSections.length} Classes`}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
