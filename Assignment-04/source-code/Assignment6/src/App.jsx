import React, { useState, useMemo, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { 
  Upload, 
  FileText, 
  Download, 
  ChevronLeft, 
  Search, 
  AlertTriangle, 
  Users, 
  BarChart3,
  Trash2,
  X,
  Lock,
  FileSpreadsheet,
  Archive,
  LogOut,
  Edit
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from './lib/utils';

// --- Components ---

const Card = ({ children, className }) => (
  <div className={cn("bg-white rounded-3xl p-6 shadow-sm border border-gray-100", className)}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className, icon: Icon, disabled }) => {
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-white text-black border border-gray-200 hover:bg-gray-50",
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-100"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
       className="modal-box w-full max-w-md"
      >
        <div className="p-6 border-bottom border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [uploadName, setUploadName] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  // Always show login page on initial load. Do not auto-login from previous sessions.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'letter'
  const [settingsModal, setSettingsModal] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  useEffect(() => {
  if (view === 'history') {
    const history = JSON.parse(localStorage.getItem("history")) || [];
    setHistoryData(history.reverse());
  }
}, [view]);

  const [signatures, setSignatures] = useState({
    teacher: 'Mr. Ganesh Kadam',
    coordinator: 'Mr. Atul Pawar',
    hod: 'Dr. Sonali Patil'
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
    } else {
      alert('Invalid credentials. Use admin/admin123');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
  };

  const downloadTemplate = () => {
    const templateData = [
      ["Pimpri Chinchwad Education Trust's", "", "", "", "", "", ""],
      ["PIMPRI CHINCHWAD COLLEGE OF ENGINEERING", "", "", "", "", "", ""],
      ["Department:", "Computer Engineering", "Academic Year:", "2025-26", "", "Semester:", "1"],
      ["Year:", "BTech", "Division:", "A", "", "Date:", new Date().toLocaleDateString()],
      ["", "", "", "", "", "", ""],
      ["Sr.No", "PRN", "Name", "Subject 1", "", "Subject 2", "", "Overall TH", "Overall PR", "Overall Att"],
      ["", "", "", "TH", "PR", "TH", "PR", "", "", ""],
      ["", "", "", "Per", "Per", "Per", "Per", "", "", ""],
      ["Total Lectures", "", "", "40", "12", "38", "10", "", "", ""],
      [1, "121B1B001", "JOHN DOE", "85", "100", "70", "90", "77.5", "95", "86.25"],
      [2, "121B1B002", "JANE SMITH", "60", "80", "55", "70", "57.5", "75", "66.25"],
      [3, "121B1B003", "ALICE BROWN", "90", "100", "95", "100", "92.5", "100", "96.25"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Merge cells for header
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // PCET
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // PCCOE
      { s: { r: 5, c: 3 }, e: { r: 5, c: 4 } }, // Subject 1
      { s: { r: 5, c: 5 }, e: { r: 5, c: 6 } }  // Subject 2
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Template");
    XLSX.writeFile(wb, "Attendance_Portal_Template.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
     
    const name = prompt("Enter a name for this upload:");

if (!name) {
  alert("Upload cancelled - name is required");
  return;
}

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setData(result);
      const history = JSON.parse(localStorage.getItem("history")) || [];

history.push({
  id: Date.now(),
  name: name, // ✅ NEW FIELD
  createdAt: new Date().toLocaleString(),
  metadata: result.metadata,
  students: result.students
});

localStorage.setItem("history", JSON.stringify(history)); 
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading file. Please check the template format.");
    } finally {
      setLoading(false);
    }
  };

  const lowAttendanceStudents = useMemo(() => {
    if (!data) return [];
    return data.students.filter(s => {
      let att = parseFloat(s.overallAtt) || 0;
      // If the value is between 0 and 1 (e.g., 0.68), treat it as a percentage (68%)
      // unless it's actually a very low percentage. Usually, academic data is > 1 if whole.
      if (att > 0 && att <= 1) att = att * 100;
      return att < 75;
    });
  }, [data]);

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    // Only show students with attendance < 75%
    return lowAttendanceStudents.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.prn.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [lowAttendanceStudents, searchQuery]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const ranges = [
      { name: '0-25%', count: 0, color: '#ef4444' },
      { name: '25-50%', count: 0, color: '#f97316' },
      { name: '50-75%', count: 0, color: '#eab308' },
      { name: '75-100%', count: 0, color: '#22c55e' },
    ];

    data.students.forEach(s => {
      const att = parseFloat(s.overallAtt);
      if (att < 25) ranges[0].count++;
      else if (att < 50) ranges[1].count++;
      else if (att < 75) ranges[2].count++;
      else ranges[3].count++;
    });

    return ranges;
  }, [data]);

  const createWarningLetterPDF = (student) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text("Pimpri Chinchwad Education Trust's", 105, 15, { align: 'center' });
    doc.setFont("helvetica", "bold");
    doc.text("PIMPRI CHINCHWAD COLLEGE OF ENGINEERING", 105, 22, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Letter to Parents of Poor Performing Students", 105, 30, { align: 'center' });
    doc.line(20, 32, 190, 32);

    // Metadata
    doc.setFontSize(10);
    doc.text(`Department: ${data.metadata.department}`, 20, 40);
    doc.text(`Academic Year: ${data.metadata.academicYear}`, 100, 40);
    doc.text(`Semester: ${data.metadata.semester}`, 160, 40);
    doc.text(`Date: ${data.metadata.date}`, 160, 45);

    // Content
    doc.text("To,", 20, 55);
    doc.text("The Parent / Guardian,", 20, 60);
    doc.setFont("helvetica", "bold");
    doc.text(`Mr. / Ms. ${student.name}`, 20, 65);
    doc.setFont("helvetica", "normal");

    doc.text("Subject: Attendance status of your ward", 20, 75);

    doc.text("Dear Sir / Madam,", 20, 85);
    doc.text(`This is to inform you that your ward ${student.name}, PRN: ${student.prn}, Year: ${data.metadata.year}, Div: ${data.metadata.division} is studying in our college.`, 20, 95, { maxWidth: 170 });
    
    doc.text(`1. Subject wise attendance up to ${data.metadata.date} is as follows.`, 20, 105);

    // Helper to format percentage
    const fmt = (val) => {
      if (typeof val === 'string' && val.includes('%')) {
        return parseFloat(val.replace('%', '')).toFixed(2);
      }
      let n = parseFloat(val) || 0;
      if (n > 0 && n <= 1) n = n * 100;
      return n.toFixed(2);
    };

    // Filter out subjects with no data (marked as "-" or empty)
    const validSubjects = student.subjects.filter(sub => 
      sub.percentage !== '-' && 
      sub.percentage !== null && 
      sub.percentage !== undefined && 
      String(sub.percentage).trim() !== ''
    );

    // Table
    const tableData = validSubjects.map(sub => [
      sub.name,
      sub.type === 'Theory' ? `${fmt(sub.percentage)}%` : '-',
      sub.type === 'Practical' ? `${fmt(sub.percentage)}%` : '-'
    ]);

    doc.autoTable({
      startY: 110,
      head: [['Subject', 'Theory Attendance (%)', 'Practical Attendance (%)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      foot: [
        ['Attendance', `${fmt(student.overallTh)}%`, `${fmt(student.overallPr)}%`],
        ['Overall Att.', { content: `${fmt(student.overallAtt)}%`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }]
      ],
      footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`If he fails to improve attendance and to satisfy to minimum criteria of 75% attendance in theory and practical's conducted, by college, he shall not be eligible to appear for Final SA in Semester ${data.metadata.semester} Theory Examination.`, 20, finalY, { maxWidth: 170 });

    // Signatures
    const sigY = finalY + 40;
    doc.text("Class Teacher", 35, sigY, { align: 'center' });
    doc.text("Academic Coordinator", 105, sigY, { align: 'center' });
    doc.text("Head of the Department", 175, sigY, { align: 'center' });
    
    doc.setFont("helvetica", "bold");
    doc.text(signatures.teacher, 35, sigY + 5, { align: 'center' });
    doc.text(signatures.coordinator, 105, sigY + 5, { align: 'center' });
    doc.text(signatures.hod, 175, sigY + 5, { align: 'center' });

    return doc;
  };

  const generatePDF = (student) => {
    const doc = createWarningLetterPDF(student);
    doc.save(`Warning_Letter_${student.prn}.pdf`);
  };

  const generatePDFBlob = (student) => {
    const doc = createWarningLetterPDF(student);
    return doc.output('blob');
  };


  const handleBulkDownload = async () => {
    if (!lowAttendanceStudents.length) return;
    setIsBulkDownloading(true);
    const zip = new JSZip();
    
    try {
      for (const student of lowAttendanceStudents) {
        const blob = generatePDFBlob(student);
        zip.file(`Warning_Letter_${student.prn}.pdf`, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Attendance_Warning_Letters_${data.metadata.division}.zip`);
    } catch (error) {
      console.error("Bulk download error:", error);
      alert("Error generating bulk letters.");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const exportToExcel = () => {
    if (!filteredStudents.length) return;
    
    const exportData = filteredStudents.map(s => ({
      'Roll No': s.prn,
      'Name': s.name,
      'Overall Attendance (%)': (parseFloat(s.overallAtt) <= 1 ? parseFloat(s.overallAtt) * 100 : parseFloat(s.overallAtt)).toFixed(2),
      'Year': data.metadata.year,
      'Division': data.metadata.division
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Low Attendance Students");
    XLSX.writeFile(wb, `Low_Attendance_List_${data.metadata.division}.xlsx`);
  };

  const sendEmail = (student) => {
    const email = prompt("Enter recipient email:");
  if (!email) return;

  const subject = `Attendance Warning - ${student.name}`;

  const attendance =
    parseFloat(student.overallAtt) <= 1
      ? (parseFloat(student.overallAtt) * 100).toFixed(2)
      : parseFloat(student.overallAtt).toFixed(2);

  const body = `
Dear Parent,

This is to inform you that your ward ${student.name} (PRN: ${student.prn})
has low attendance.

Overall Attendance: ${attendance}%

Please ensure improvement to meet minimum 75% criteria.

Regards,
${signatures.teacher}
`;

  // ✅ DIRECT GMAIL OPEN (NO MAILTO)
  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.open(gmailLink, "_blank");
};

  if (!isLoggedIn) {
    return (  
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 font-sans">
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Portal Login</h2>
          <p className="text-gray-500 text-sm mt-1">Enter your credentials</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">

          <input
            type="text"
            placeholder="Username"
            value={loginForm.username}
            onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />

          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-blue-600 bg-blue-50 py-2 rounded-xl">
          Demo: <b>admin / admin123</b>
        </div>
      </div>
    </div>
    );
  }

  if (view === 'letter' && selectedStudent) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" icon={ChevronLeft} onClick={() => setView('dashboard')}>
              Back to List
            </Button>
            <Button variant="primary" icon={Download} onClick={() => generatePDF(selectedStudent)}>
              Download Letter
            </Button>
          </div>

          <Card className="card letter-card">
            <div className="text-center mb-8">
              <div className="flex justify-between items-start mb-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 italic">
                  PCCOE Logo
                </div>
                <div className="flex-1 px-4">
                  <p className="text-sm">Pimpri Chinchwad Education Trust's</p>
                  <h1 className="text-2xl font-bold">PIMPRI CHINCHWAD COLLEGE OF ENGINEERING</h1>
                </div>
                <div className="text-left text-xs border p-2 rounded">
                  <p>Record No.: ACAD/R/22</p>
                  <p>Revision: 00</p>
                  <p>Date: 18/08/2023</p>
                </div>
              </div>
              <div className="border-y py-2 font-bold uppercase tracking-wide">
                Letter to Parents of Poor Performing Students
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
              <p><span className="font-semibold">Department:</span> {data.metadata.department}</p>
              <p><span className="font-semibold">Academic Year:</span> {data.metadata.academicYear}</p>
              <p><span className="font-semibold">Semester:</span> {data.metadata.semester}</p>
              <p className="col-start-3 text-right"><span className="font-semibold">Date:</span> {data.metadata.date}</p>
            </div>

            <div className="mb-8 text-sm space-y-1">
              <p>To,</p>
              <p>The Parent / Guardian,</p>
              <p className="font-bold">Mr. / Ms. {selectedStudent.name}</p>
            </div>

            <p className="font-bold mb-6 text-sm underline underline-offset-4">Subject: Attendance status of your ward</p>

            <div className="text-sm space-y-4 mb-8">
              <p>Dear Sir / Madam,</p>
              <p>
                This is to inform you that your ward <span className="font-bold">{selectedStudent.name}</span>, 
                PRN: <span className="font-bold">{selectedStudent.prn}</span>, 
                Year: <span className="font-bold">{data.metadata.year}</span>, 
                Div: <span className="font-bold">{data.metadata.division}</span> is studying in our college.
              </p>
              <p>1. Subject wise attendance up to {data.metadata.date} is as follows.</p>
            </div>

            <table className="w-full border-collapse border border-gray-300 text-sm mb-8">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2 text-left">Subject</th>
                  <th className="border border-gray-300 p-2">Theory Attendance (%)</th>
                  <th className="border border-gray-300 p-2">Practical Attendance (%)</th>
                </tr>
              </thead>
              <tbody>
                {selectedStudent.subjects
                  .filter(sub => 
                    sub.percentage !== '-' && 
                    sub.percentage !== null && 
                    sub.percentage !== undefined && 
                    String(sub.percentage).trim() !== ''
                  )
                  .map((sub, idx) => {
                    const p = (val) => {
                      if (typeof val === 'string' && val.includes('%')) {
                        return parseFloat(val.replace('%', '')).toFixed(2);
                      }
                      let n = parseFloat(val) || 0;
                      if (n > 0 && n <= 1) n = n * 100;
                      return n.toFixed(2);
                    };
                    return (
                      <tr key={idx}>
                        <td className="border border-gray-300 p-2 font-medium">{sub.name}</td>
                        <td className="border border-gray-300 p-2 text-center">{sub.type === 'Theory' ? `${p(sub.percentage)}%` : '-'}</td>
                        <td className="border border-gray-300 p-2 text-center">{sub.type === 'Practical' ? `${p(sub.percentage)}%` : '-'}</td>
                      </tr>
                    );
                  })}
                <tr className="bg-gray-50 font-bold">
                  <td className="border border-gray-300 p-2 text-center">Attendance</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {(() => {
                      let n = parseFloat(selectedStudent.overallTh) || 0;
                      if (n > 0 && n <= 1) n = n * 100;
                      return n.toFixed(2);
                    })()}%
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    {(() => {
                      let n = parseFloat(selectedStudent.overallPr) || 0;
                      if (n > 0 && n <= 1) n = n * 100;
                      return n.toFixed(2);
                    })()}%
                  </td>
                </tr>
                <tr className="bg-gray-50 font-bold">
                  <td className="border border-gray-300 p-2 text-center">Overall Att.</td>
                  <td colSpan={2} className="border border-gray-300 p-2 text-center">
                    {(() => {
                      let n = parseFloat(selectedStudent.overallAtt) || 0;
                      if (n > 0 && n <= 1) n = n * 100;
                      return n.toFixed(2);
                    })()}%
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="text-sm mb-16">
              If he fails to improve attendance and to satisfy to minimum criteria of 75% attendance in theory and practical's conducted, by college, he shall not be eligible to appear for Final SA in Semester {data.metadata.semester} Theory Examination.
            </p>

            <div className="grid grid-cols-3 gap-8 text-center text-xs font-bold">
              <div>
                <p className="mb-12">Class Teacher</p>
                <p>{signatures.teacher}</p>
              </div>
              <div>
                <p className="mb-12">Academic Coordinator</p>
                <p>{signatures.coordinator}</p>
              </div>
              <div>
                <p className="mb-12">Head of the Department</p>
                <p>{signatures.hod}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (view === 'history') {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setView('dashboard')}>
            ← Back
          </Button>
          <h2 className="text-2xl font-bold">History</h2>
        </div>

        {/* List */}
        {historyData.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">No history found</p>
        ) : (
          historyData.map((item) => (
            <div 
              key={item.id}
              className="card p-5 flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-lg">
  {item.name || "Untitled Upload"}
</p>
<p className="text-sm text-gray-500">
  {item.metadata.year} - {item.metadata.division}
</p>
                <p className="text-sm text-gray-500">
                  {item.createdAt}
                </p>
                <p className="text-xs text-gray-400">
                  {item.students.length} students
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="secondary"
                  onClick={() => {
                    setData(item);
                    setView('dashboard');
                  }}
                >
                  Open
                </Button>

                <Button 
                  variant="danger"
                  onClick={() => {
                    const updated = historyData.filter(h => h.id !== item.id);
                    setHistoryData(updated);
                    localStorage.setItem("history", JSON.stringify(updated));
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
  <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

    <div className="flex items-center gap-2">
      <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
        <FileText className="text-white" size={18} />
      </div>
      <h1 className="text-lg font-bold">
        Attendance<span className="text-gray-400 font-medium">Portal</span>
      </h1>
    </div>

    <div className="flex items-center gap-3">

      <Button variant="ghost" onClick={() => setView('history')}>
        History
      </Button>

      <Button variant="ghost" onClick={() => setSettingsModal(true)}>
        <Edit size={18} />
      </Button>

      <Button variant="ghost" onClick={handleLogout}>
        <LogOut size={18} />
      </Button>

      <label className="cursor-pointer">
        <input type="file" className="hidden" onChange={handleFileUpload} />
        <div className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 flex gap-2 items-center">
          <Upload size={16} />
          Upload
        </div>
      </label>

    </div>
  </div>
</header> 
      <main className="max-w-7xl mx-auto px-6 py-8">
        {!data ? (
          <div className="h-[70vh] flex flex-col items-center justify-center text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <FileText className="text-gray-300" size={40} />
              </div>
              <h2 className="text-3xl font-bold mb-4">Ready to start?</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Upload your college's attendance Excel sheet to identify students with low attendance and generate warning letters.
              </p>
              <label className="cursor-pointer inline-block">
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                <div className="bg-black text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-black/10 flex items-center gap-3 hover:bg-gray-800 transition-all active:scale-95">
                  {loading ? "Processing..." : (
                    <>
                      <Upload size={20} />
                      Upload Excel File
                    </>
                  )}
                </div>
              </label>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="flex items-center gap-5 shadow-md">
  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
    <Users size={26} />
  </div>
  <div>
    <p className="text-sm text-gray-500">Total Students</p>
    <p className="text-3xl font-bold">{data.students.length}</p>
  </div>
</Card>
              <Card className="flex items-center gap-6">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                  <AlertTriangle size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Low Attendance</p>
                  <p className="text-4xl font-black">{lowAttendanceStudents.length}</p>
                </div>
              </Card>
            </div>

            {/* Distribution Chart */}
            <Card className="card p-8">
              <div className="flex items-center gap-2 mb-8">
                <BarChart3 size={20} className="text-gray-400" />
                <div>
                  <h3 className="font-bold">Attendance Distribution</h3>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Student count per range</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }} 
                      dy={10}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-black text-white px-3 py-2 rounded-xl text-xs font-bold">
                              {payload[0].value} Students
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.6} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Student List */}
            <Card className="card p-0 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Low Attendance Students</h3>
                  <p className="text-sm text-gray-500">Manage and generate letters for students</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="secondary" 
                    icon={FileSpreadsheet} 
                    className="text-xs"
                    onClick={exportToExcel}
                  >
                    Export Excel
                  </Button>
                  <Button 
                    variant="blue" 
                    icon={Archive} 
                    className="text-xs"
                    onClick={handleBulkDownload}
                    disabled={isBulkDownloading}
                  >
                    {isBulkDownloading ? "Generating..." : "Bulk Download"}
                  </Button>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search by name or roll no"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm w-full md:w-64 focus:ring-2 focus:ring-black/5 transition-all outline-none"
                    />
                  </div>
                  <Button variant="ghost" className="p-2.5" onClick={() => setData(null)}>
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">
                      <th className="px-6 py-4">Roll No</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Year/Div</th>
                      <th className="px-6 py-4">Overall Att.</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <AnimatePresence mode="popLayout">
                      {filteredStudents.map((student) => {
                        const isLow = parseFloat(student.overallAtt) < 75;
                        return (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key={student.prn} 
                            className="group table-row"
                          >
                            <td className="px-6 py-4 text-sm font-bold">{student.prn}</td>
                            <td className="px-6 py-4 text-sm font-medium uppercase">{student.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{data.metadata.year} / {data.metadata.division}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5">
                                <span className={cn(
                                  "text-xs font-black",
                                  isLow ? "text-red-600" : "text-green-600"
                                )}>
                                  {parseFloat(student.overallAtt) <= 1 ? (parseFloat(student.overallAtt) * 100).toFixed(2) : parseFloat(student.overallAtt).toFixed(2)}%
                                </span>
                               <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
  <div
    className="h-full rounded-full bg-blue-500 transition-all duration-500"
    style={{
      width: `${
        parseFloat(student.overallAtt) <= 1
          ? parseFloat(student.overallAtt) * 100
          : parseFloat(student.overallAtt)
      }%`
    }}
  />
</div>
</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setShowStudentModal(true);
                                  }}
                                >
                                  <BarChart3 size={16} />
                                </Button>
                                <Button
  variant="secondary"
  className="text-xs bg-gray-100 hover:bg-gray-200"
  onClick={() => {
    setSelectedStudent(student);
    setView('letter');
  }}
>
  Letter
</Button>

<Button
  className="text-xs bg-blue-600 text-white hover:bg-blue-700"
  onClick={() => sendEmail(student)}
>
  Email
</Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>

      

      {/* Settings Modal */}
      <Modal 
        isOpen={settingsModal} 
        onClose={() => setSettingsModal(false)}
        title="Edit Signatures"
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Signatures</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500">Class Teacher</label>
                <input 
                  type="text" 
                  value={signatures.teacher}
                  onChange={(e) => setSignatures({...signatures, teacher: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500">Academic Coordinator</label>
                <input 
                  type="text" 
                  value={signatures.coordinator}
                  onChange={(e) => setSignatures({...signatures, coordinator: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500">Head of Department</label>
                <input 
                  type="text" 
                  value={signatures.hod}
                  onChange={(e) => setSignatures({...signatures, hod: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none"
                />
              </div>
            </div>
          </div>
          
          <div className="pt-2">
            <Button className="w-full" onClick={() => setSettingsModal(false)}>
              Save & Close
            </Button>
          </div>
        </div>
      </Modal>
      <Modal 
  isOpen={showStudentModal} 
  onClose={() => setShowStudentModal(false)}
  title=""
>
  {selectedStudent && (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold uppercase">
            {selectedStudent.name}
          </h2>
          <p className="text-xs text-gray-400">
            Roll No: {selectedStudent.prn} • {data.metadata.year} {data.metadata.division}
          </p>
        </div>
        <div className="text-gray-400 text-xl">›</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-100 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold">OVERALL TH ATT.</p>
          <p className="text-xl font-bold">
            {(() => {
              let n = parseFloat(selectedStudent.overallTh) || 0;
              if (n > 0 && n <= 1) n = n * 100;
              return n.toFixed(2);
            })()}%
          </p>
        </div>

        <div className="bg-gray-100 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold">OVERALL PR ATT.</p>
          <p className="text-xl font-bold">
            {(() => {
              let n = parseFloat(selectedStudent.overallPr) || 0;
              if (n > 0 && n <= 1) n = n * 100;
              return n.toFixed(2);
            })()}%
          </p>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div>
        <p className="text-xs font-bold text-gray-400 mb-2">
          SUBJECT BREAKDOWN
        </p>

        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
          {selectedStudent.subjects.map((sub, i) => {
            const isTheory = sub.type === 'Theory';

            const format = (val) => {
              if (typeof val === 'string' && val.includes('%')) {
                return parseFloat(val.replace('%', '')).toFixed(0);
              }
              let n = parseFloat(val) || 0;
              if (n > 0 && n <= 1) n = n * 100;
              return n.toFixed(0);
            };

            return (
              <div 
                key={i} 
                className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl text-sm"
              >
                <span className="font-medium">{sub.name}</span>

                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    isTheory
                      ? "bg-blue-100 text-blue-600"
                      : "bg-purple-100 text-purple-600"
                  }`}
                >
                  {isTheory ? "TH" : "PR"}: {format(sub.percentage)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Button */}
      <Button 
        className="w-full mt-3"
        onClick={() => {
          setShowStudentModal(false);
          setView('letter');
        }}
      >
        Generate Letter
      </Button>
    </div>
  )}
</Modal>
    </div>
  );
}
