const PDFDocument = require('pdfkit');

/**
 * ─── Feature 6: Parent/Guardian PDF Report Generator ─────────────────────────
 * Generates a professional, printable PDF report for parents
 */

// Color palette matching ShikshaBridge brand
const COLORS = {
  primary: '#E8650A',
  secondary: '#1B7A4E',
  accent: '#F5B820',
  dark: '#1C1914',
  gray: '#7A7268',
  lightGray: '#F4F3F1',
  danger: '#D63B3B',
  warning: '#F5B820',
  success: '#1B7A4E',
  white: '#FFFFFF',
};

const getMasteryColor = (mastery) => {
  const map = { mastered: COLORS.success, proficient: '#2563EB', developing: COLORS.warning, weak: COLORS.danger, not_started: COLORS.gray };
  return map[mastery] || COLORS.gray;
};

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const generateParentReport = (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        student,
        school,
        classInfo,
        reports = [],           // ProgressReport[]
        recentAttempts = [],    // Attempt[]
        aiSummary = '',
        teacherNote = '',
        generatedBy = 'ShikshaBridge',
        period = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      } = reportData;

      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `ShikshaBridge Report – ${student.name}`, Author: 'ShikshaBridge' } });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 100; // content width

      // ─── Header Banner ───────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 90).fill(COLORS.dark);
      doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(22).text('🎓 ShikshaBridge', 50, 22);
      doc.fillColor('#FFFFFF').font('Helvetica').fontSize(10).text('Student Learning Progress Report', 50, 50);
      doc.fillColor(COLORS.accent).text(`Period: ${period}`, 50, 65);

      // Report date top-right
      doc.fillColor('#AAAAAA').fontSize(9).text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 350, 50, { width: 200, align: 'right' });

      doc.moveDown(2);

      // ─── Student Info Card ───────────────────────────────────────────────
      const infoY = 105;
      doc.rect(50, infoY, W, 70).fill(COLORS.lightGray).stroke(COLORS.lightGray);
      doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(14).text(student.name, 65, infoY + 12);
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.gray);
      const infoLine = [
        classInfo ? `Class ${classInfo.grade} – ${classInfo.section}` : '',
        school?.name || '',
        student.rollNumber ? `Roll No: ${student.rollNumber}` : '',
        student.email || '',
      ].filter(Boolean).join('  ·  ');
      doc.text(infoLine, 65, infoY + 32, { width: W - 30 });

      // Streak & Points badges
      doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(10);
      doc.text(`🔥 ${student.streak || 0} day streak`, 65, infoY + 50);
      doc.text(`⭐ ${student.totalPoints || 0} points`, 200, infoY + 50);
      doc.text(`🏅 ${student.badges?.length || 0} badges`, 320, infoY + 50);

      doc.y = infoY + 90;

      // ─── Subject Performance Summary ──────────────────────────────────────
      if (reports.length > 0) {
        sectionHeader(doc, '📚 Subject Performance', W);

        reports.forEach((r) => {
          const subjectName = r.subject?.name || 'Subject';
          const avg = r.avgScore || 0;
          const color = avg >= 70 ? COLORS.success : avg >= 40 ? COLORS.warning : COLORS.danger;
          const label = avg >= 70 ? 'Proficient' : avg >= 40 ? 'Developing' : 'Needs Support';

          if (doc.y > 700) doc.addPage();

          doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.dark).text(`${r.subject?.icon || '📖'} ${subjectName}`, 50, doc.y + 4);

          // Progress bar
          const barY = doc.y;
          const barW = W * 0.55;
          doc.rect(200, barY + 2, barW, 12).fill('#E8E5E0');
          doc.rect(200, barY + 2, barW * (avg / 100), 12).fill(color);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(color).text(`${avg}%`, 200 + barW + 8, barY + 1);
          doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray).text(`${r.totalAttempts} quizzes · ${label}`, 420, barY + 1);

          doc.moveDown(1.2);

          // Concept mastery mini-grid
          if (r.conceptMastery?.length > 0) {
            const masteryItems = r.conceptMastery.slice(0, 6);
            doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray).text('Concepts:', 65, doc.y);
            const startY = doc.y;
            masteryItems.forEach((cm, idx) => {
              const col = idx % 3;
              const row = Math.floor(idx / 3);
              const cx = 110 + col * 155;
              const cy = startY + row * 16;
              const mColor = getMasteryColor(cm.mastery);
              doc.circle(cx, cy + 5, 4).fill(mColor);
              doc.fillColor(COLORS.dark).fontSize(8).text(
                (cm.conceptName || '').slice(0, 18),
                cx + 8, cy,
                { width: 140 }
              );
            });
            doc.y = startY + Math.ceil(masteryItems.length / 3) * 16 + 8;
          }
          doc.moveDown(0.5);
        });
      }

      // ─── AI/Rule Summary ──────────────────────────────────────────────────
      if (aiSummary) {
        if (doc.y > 650) doc.addPage();
        sectionHeader(doc, '🧠 Teacher / AI Assessment', W);
        doc.rect(50, doc.y, W, 1).fill(COLORS.lightGray);
        doc.rect(50, doc.y + 2, 4, 60).fill(COLORS.primary);
        doc.font('Helvetica').fontSize(10).fillColor(COLORS.dark)
          .text(aiSummary, 62, doc.y + 6, { width: W - 20, lineGap: 3 });
        doc.moveDown(2);
      }

      // ─── Teacher Note ─────────────────────────────────────────────────────
      if (teacherNote) {
        if (doc.y > 650) doc.addPage();
        sectionHeader(doc, '📝 Teacher\'s Note', W);
        doc.rect(50, doc.y, W, 1).fill(COLORS.lightGray);
        doc.rect(50, doc.y + 2, 4, 60).fill(COLORS.secondary);
        doc.font('Helvetica').fontSize(10).fillColor(COLORS.dark)
          .text(teacherNote, 62, doc.y + 6, { width: W - 20, lineGap: 3 });
        doc.moveDown(2);
      }

      // ─── Recent Activity Table ─────────────────────────────────────────────
      if (recentAttempts.length > 0) {
        if (doc.y > 620) doc.addPage();
        sectionHeader(doc, '📊 Recent Quiz Attempts', W);

        const tableHeaders = ['Quiz', 'Subject', 'Score', 'Date'];
        const colWidths = [220, 110, 70, 90];
        const tableX = 50;
        const tableY = doc.y;

        // Header row
        doc.rect(tableX, tableY, W, 18).fill(COLORS.dark);
        let cx = tableX + 8;
        tableHeaders.forEach((h, i) => {
          doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9).text(h, cx, tableY + 4, { width: colWidths[i] });
          cx += colWidths[i];
        });
        doc.y = tableY + 20;

        recentAttempts.slice(0, 8).forEach((a, idx) => {
          if (doc.y > 720) return;
          const rowY = doc.y;
          if (idx % 2 === 0) doc.rect(tableX, rowY, W, 16).fill(COLORS.lightGray);

          const scoreColor = a.percentage >= 70 ? COLORS.success : a.percentage >= 40 ? COLORS.warning : COLORS.danger;
          let rx = tableX + 8;
          doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8).text((a.quiz?.title || 'Quiz').slice(0, 30), rx, rowY + 3, { width: colWidths[0] - 8 }); rx += colWidths[0];
          doc.text((a.subject?.name || '—').slice(0, 16), rx, rowY + 3, { width: colWidths[1] - 8 }); rx += colWidths[1];
          doc.fillColor(scoreColor).font('Helvetica-Bold').text(`${a.percentage}%`, rx, rowY + 3, { width: colWidths[2] - 8 }); rx += colWidths[2];
          doc.fillColor(COLORS.gray).font('Helvetica').text(
            a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '—',
            rx, rowY + 3, { width: colWidths[3] }
          );
          doc.y = rowY + 18;
        });
        doc.moveDown(1);
      }

      // ─── Footer ──────────────────────────────────────────────────────────
      doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(COLORS.dark);
      doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(9)
        .text('ShikshaBridge – Bridging learning gaps for every student in India', 50, doc.page.height - 26, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const sectionHeader = (doc, title, W) => {
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text(title, 50, doc.y);
  doc.rect(50, doc.y + 2, W, 1.5).fill(COLORS.primary);
  doc.moveDown(0.8);
};

module.exports = { generateParentReport };
