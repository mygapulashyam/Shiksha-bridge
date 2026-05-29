const { parse } = require('csv-parse/sync');
const User = require('../models/User');
const School = require('../models/School');
const { Class, Subject, Concept } = require('../models/ClassSubjectConcept');

/**
 * ─── Feature 12: CSV/Excel Bulk Import ───────────────────────────────────────
 * Supports importing: schools | teachers | students | classes | subjects | concepts
 */

const parseCSV = (buffer) => {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: true,
  });
};

const REQUIRED_FIELDS = {
  schools:   ['name', 'district', 'state'],
  teachers:  ['name', 'email', 'password'],
  students:  ['name', 'email', 'password'],
  classes:   ['name', 'grade', 'section'],
  subjects:  ['name', 'grade'],
  concepts:  ['name', 'subjectName', 'grade', 'chapter', 'difficulty'],
};

const validateRow = (row, type, idx) => {
  const required = REQUIRED_FIELDS[type] || [];
  const missing = required.filter(f => !row[f]);
  if (missing.length) throw new Error(`Row ${idx + 2}: Missing fields: ${missing.join(', ')}`);
};

// ─── Import Schools ──────────────────────────────────────────────────────────
const importSchools = async (buffer) => {
  const rows = parseCSV(buffer);
  const results = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      validateRow(rows[i], 'schools', i);
      const r = rows[i];
      const exists = await School.findOne({ name: r.name, district: r.district });
      if (exists) { results.skipped++; continue; }
      await School.create({
        name: r.name, district: r.district, state: r.state,
        block: r.block, type: r.type || 'government',
        medium: r.medium || 'hindi', board: r.board || 'state',
        udiseCode: r.udiseCode, principalName: r.principalName, phone: r.phone,
      });
      results.created++;
    } catch (err) {
      results.errors.push(err.message);
    }
  }
  return results;
};

// ─── Import Users (Teachers / Students) ──────────────────────────────────────
const importUsers = async (buffer, role, adminSchoolId) => {
  const rows = parseCSV(buffer);
  const results = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      validateRow(rows[i], role === 'teacher' ? 'teachers' : 'students', i);
      const r = rows[i];

      const exists = await User.findOne({ email: r.email.toLowerCase().trim() });
      if (exists) { results.skipped++; continue; }

      // Resolve school
      let schoolId = adminSchoolId;
      if (r.schoolName) {
        const school = await School.findOne({ name: new RegExp(r.schoolName.trim(), 'i') });
        if (school) schoolId = school._id;
      }

      // Resolve class for students
      let classId;
      if (role === 'student' && r.className) {
        const cls = await Class.findOne({ name: new RegExp(r.className.trim(), 'i'), school: schoolId });
        if (cls) classId = cls._id;
      }

      await User.create({
        name: r.name.trim(),
        email: r.email.toLowerCase().trim(),
        password: r.password || 'Welcome@123',
        role,
        school: schoolId,
        class: classId,
        rollNumber: r.rollNumber,
        language: r.language || 'en',
        guardianName: r.guardianName,
        guardianEmail: r.guardianEmail,
        guardianPhone: r.guardianPhone,
      });
      results.created++;
    } catch (err) {
      results.errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }
  return results;
};

// ─── Import Classes ──────────────────────────────────────────────────────────
const importClasses = async (buffer, adminSchoolId) => {
  const rows = parseCSV(buffer);
  const results = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      validateRow(rows[i], 'classes', i);
      const r = rows[i];
      const grade = parseInt(r.grade);
      if (grade < 6 || grade > 10) throw new Error(`Grade must be 6–10, got ${grade}`);

      let schoolId = adminSchoolId;
      if (r.schoolName) {
        const school = await School.findOne({ name: new RegExp(r.schoolName.trim(), 'i') });
        if (school) schoolId = school._id;
      }

      const exists = await Class.findOne({ name: r.name, school: schoolId });
      if (exists) { results.skipped++; continue; }

      await Class.create({ name: r.name, grade, section: r.section || 'A', school: schoolId, academicYear: r.academicYear || '2024-25' });
      results.created++;
    } catch (err) {
      results.errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }
  return results;
};

// ─── Import Subjects ──────────────────────────────────────────────────────────
const importSubjects = async (buffer) => {
  const rows = parseCSV(buffer);
  const results = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      validateRow(rows[i], 'subjects', i);
      const r = rows[i];
      const exists = await Subject.findOne({ name: r.name, grade: parseInt(r.grade) });
      if (exists) { results.skipped++; continue; }
      await Subject.create({ name: r.name, code: r.code, grade: parseInt(r.grade), icon: r.icon || '📚', color: r.color || '#4F46E5', language: r.language || 'en' });
      results.created++;
    } catch (err) {
      results.errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }
  return results;
};

// ─── Import Concepts ──────────────────────────────────────────────────────────
const importConcepts = async (buffer) => {
  const rows = parseCSV(buffer);
  const results = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      validateRow(rows[i], 'concepts', i);
      const r = rows[i];

      const subject = await Subject.findOne({ name: new RegExp(r.subjectName.trim(), 'i') });
      if (!subject) { results.errors.push(`Row ${i + 2}: Subject "${r.subjectName}" not found`); continue; }

      const exists = await Concept.findOne({ name: r.name, subject: subject._id });
      if (exists) { results.skipped++; continue; }

      await Concept.create({
        name: r.name.trim(),
        nameHindi: r.nameHindi,
        subject: subject._id,
        grade: parseInt(r.grade),
        chapter: r.chapter,
        chapterNumber: r.chapterNumber ? parseInt(r.chapterNumber) : 1,
        difficulty: r.difficulty || 'basic',
        description: r.description,
        order: r.order ? parseInt(r.order) : 0,
      });
      results.created++;
    } catch (err) {
      results.errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }
  return results;
};

// ─── Generate CSV Templates ──────────────────────────────────────────────────
const CSV_TEMPLATES = {
  schools: 'name,udiseCode,district,state,block,type,medium,board,principalName,phone\nGovt High School Nagpur,27310400101,Nagpur,Maharashtra,Hingna,government,hindi,state,Dr. Sunita Sharma,+91 9876543210',
  teachers: 'name,email,password,schoolName,language\nPriya Sharma,priya@school.edu,ChangeMe@2024,Govt High School Nagpur,hi',
  students: 'name,email,password,schoolName,className,rollNumber,language,guardianName,guardianPhone\nArjun Patil,arjun@school.edu,ChangeMe@2024,Govt High School Nagpur,Class 7 - A,01,hi,Ramesh Patil,9876543210',
  classes: 'name,grade,section,schoolName,academicYear\nClass 7 - A,7,A,Govt High School Nagpur,2024-25',
  subjects: 'name,code,grade,icon,color,language\nMathematics,MATH,7,📐,#4F46E5,bilingual',
  concepts: 'name,nameHindi,subjectName,grade,chapter,chapterNumber,difficulty,description,order\nMultiplication of Fractions,भिन्नों का गुणा,Mathematics,7,Fractions & Decimals,2,basic,Learn to multiply fractions,1',
};

const getCSVTemplate = (type) => CSV_TEMPLATES[type] || '';

module.exports = { importSchools, importUsers, importClasses, importSubjects, importConcepts, getCSVTemplate };
