"use client";
import { useState, useRef, useMemo, useEffect } from "react";
// --- FIREBASE IMPORTS ---
import { db } from "@/lib/firebase"; 
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";

export default function CommAlertSystem() {
  const [view, setView] = useState("citizen");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ username: "", password: "" });

  const [feedback, setFeedback] = useState({ category: "Complaint", message: "", priority: "Medium" });
  const [reports, setReports] = useState([]);
  const [archivedReports, setArchivedReports] = useState([]);
  const [showArchives, setShowArchives] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  const [selectedReport, setSelectedReport] = useState(null);
  const [adminEditingReport, setAdminEditingReport] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);

  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // --- 1. FETCH DATA FROM FIREBASE (GLOBAL SYNC) ---
  const fetchReports = async () => {
    try {
      const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id, // Firebase ID
        ...doc.data(),
        // Convert Firebase Timestamp to readable string
        date: doc.data().createdAt?.toDate().toLocaleString() || new Date().toLocaleString()
      }));
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports: ", error);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // --- DATA SEGREGATION LOGIC ---
  const categorizedReports = useMemo(() => {
    const baseList = showArchives ? archivedReports : reports;
    const filtered = baseList.filter(r => 
      (r.message || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.id.toString().includes(searchTerm)
    );

    return {
      pending: filtered.filter(r => r.status === "Pending"),
      approved: filtered.filter(r => r.status === "Approved"),
      resolved: filtered.filter(r => r.status === "Resolved"),
      all: filtered
    };
  }, [reports, archivedReports, searchTerm, showArchives]);

  const toggleBulkSelection = (id) => {
    setSelectedBulkIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const location = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        finalizeSubmission(location);
      }, () => finalizeSubmission("Unknown Location"));
    } else {
      finalizeSubmission("Not Supported");
    }
  };

  // --- 2. SAVE TO FIREBASE (GLOBAL SUBMISSION) ---
  const finalizeSubmission = async (location) => {
    const reportData = {
      category: feedback.category,
      message: feedback.message,
      priority: feedback.priority,
      location: location,
      status: "Pending",
      adminReply: "",
      image: selectedImage,
      createdAt: serverTimestamp()
    };

    try {
      if (editingId) {
        const reportRef = doc(db, "feedback", editingId);
        await updateDoc(reportRef, reportData);
        alert("Report updated successfully!");
        setEditingId(null);
      } else {
        await addDoc(collection(db, "feedback"), reportData);
        alert("Feedback submitted successfully to Global Database!");
      }
      fetchReports(); // Refresh list
    } catch (error) {
      console.error("Error saving to Firebase: ", error);
      alert("Submission failed. Check Firebase Rules.");
    }

    setFeedback({ category: "Complaint", message: "", priority: "Medium" });
    setSelectedImage(null);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminCredentials.username === "admin" && adminCredentials.password === "1234") {
      setIsAdminLoggedIn(true);
    } else {
      alert("❌ Invalid Admin Credentials!");
    }
  };

  // --- 3. UPDATE STATUS IN FIREBASE ---
  const handleAdminUpdate = async () => {
    try {
      const reportRef = doc(db, "feedback", adminEditingReport.id);
      await updateDoc(reportRef, {
        status: adminEditingReport.status,
        priority: adminEditingReport.priority,
        adminReply: adminEditingReport.adminReply
      });
      alert("Changes saved successfully!");
      setAdminEditingReport(null);
      fetchReports();
    } catch (error) {
      alert("Error updating: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Move this report to Archives?")) {
        const reportToArchive = reports.find(r => r.id === id);
        setArchivedReports([{...reportToArchive, archivedDate: new Date().toLocaleString()}, ...archivedReports]);
        try {
            await deleteDoc(doc(db, "feedback", id));
            fetchReports();
        } catch (error) {
            console.error("Delete failed: ", error);
        }
    }
  };

  const handlePermanentDelete = (id) => {
    if (confirm("This will permanently delete the data. Continue?")) {
      setArchivedReports(archivedReports.filter(r => r.id !== id));
    }
  };

  const handleEditInitiate = (report) => {
    setEditingId(report.id);
    setFeedback({ category: report.category, message: report.message, priority: report.priority || "Medium" });
    setSelectedImage(report.image || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- REUSABLE ROW RENDERER ---
  const renderRows = (dataList) => {
    return dataList.map((report) => (
      <tr key={report.id} className="hover:bg-blue-500/5 transition-colors group">
        <td className="p-8">
          <input type="checkbox" checked={selectedBulkIds.includes(report.id)} onChange={() => toggleBulkSelection(report.id)} />
        </td>
        <td className="p-8 text-slate-500 font-mono text-[10px] font-bold">...{report.id.slice(-6)}</td>
        <td className="p-8">
          <div className="font-bold text-white uppercase tracking-tight text-sm">{report.category}</div>
          <div className={`text-[10px] font-bold ${report.priority === 'Emergency' ? 'text-red-500' : 'text-slate-500'}`}>{report.priority || 'Medium'}</div>
        </td>
        <td className="p-8 text-slate-400 italic text-sm">
          <div className="flex items-center gap-3">
            {report.image && <div className="w-8 h-8 rounded bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0"><img src={report.image} alt="Report" className="w-full h-full object-cover" /></div>}
            <span className="truncate max-w-[250px]">"{report.message}"</span>
          </div>
        </td>
        <td className="p-8 text-center">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${report.status === "Approved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : report.status === "Resolved" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
            {report.status}
          </span>
        </td>
        <td className="p-8 text-center">
          <div className="flex justify-center gap-3">
            <button onClick={() => setSelectedReport(report)} className="text-blue-400 hover:underline text-[10px] font-bold uppercase">Details</button>
            {!showArchives && <button onClick={() => setAdminEditingReport(report)} className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Update</button>}
            <button onClick={() => showArchives ? handlePermanentDelete(report.id) : handleDelete(report.id)} className="text-red-500/50 hover:text-red-500 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">

      {/* MODAL: UPDATE REPORT (ADMIN) */}
      {adminEditingReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-slate-700 w-full max-w-lg rounded-[2.5rem] p-6 md:p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-blue-500 font-black text-xs uppercase tracking-widest mb-8">Update Report</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</label>
                  <select value={adminEditingReport.status} onChange={(e) => setAdminEditingReport({ ...adminEditingReport, status: e.target.value })} className="w-full bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500">
                    <option>Pending</option><option>Approved</option><option>Resolved</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Priority</label>
                  <select value={adminEditingReport.priority} onChange={(e) => setAdminEditingReport({ ...adminEditingReport, priority: e.target.value })} className="w-full bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500">
                    <option>Low</option><option>Medium</option><option>High</option><option>Emergency</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Admin Response</label>
                <textarea placeholder="Type a response to the citizen..." value={adminEditingReport.adminReply} onChange={(e) => setAdminEditingReport({ ...adminEditingReport, adminReply: e.target.value })} className="w-full bg-[#0f172a] border border-blue-900/30 p-4 rounded-xl h-24 text-white outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="flex items-center justify-end gap-6 pt-4">
                <button onClick={() => setAdminEditingReport(null)} className="text-slate-400 hover:text-white font-bold uppercase text-xs tracking-widest">Cancel</button>
                <button onClick={handleAdminUpdate} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-blue-900/40">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DETAILS */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#1e293b] border border-slate-800 w-full max-w-[480px] rounded-3xl p-6 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-2">
              <span className="text-blue-500 font-mono text-sm font-semibold tracking-tight">#{selectedReport.id.slice(-6)}</span>
              <button onClick={() => setSelectedReport(null)} className="text-slate-500 hover:text-white transition-colors p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <h3 className="text-4xl font-bold text-white mb-6 tracking-tight">Report Details</h3>
            <div className="space-y-6 mb-8 text-left">
              {selectedReport.image && <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-2 block">Attachment</label><img src={selectedReport.image} alt="Report attachment" className="w-full rounded-2xl border border-slate-700" /></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-1 block">Category</label><p className="text-white font-medium">{selectedReport.category}</p></div>
                <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-1 block">Priority</label><p className={`font-bold ${selectedReport.priority === 'Emergency' ? 'text-red-500' : 'text-white'}`}>{selectedReport.priority || 'Medium'}</p></div>
              </div>
              <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-1 block">Status</label><p className="text-white font-medium">{selectedReport.status}</p></div>
              <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-1 block">Message</label><p className="text-white italic">"{selectedReport.message}"</p></div>
              {selectedReport.adminReply && <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"><label className="text-blue-400 text-[11px] font-bold uppercase mb-1 block">Admin Response</label><p className="text-slate-200 text-sm">{selectedReport.adminReply}</p></div>}
            </div>
            <button onClick={() => setSelectedReport(null)} className="w-full bg-slate-700/50 hover:bg-slate-700 text-white py-5 rounded-2xl font-black uppercase text-sm transition-all active:scale-[0.98]">Close</button>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2 ml-2 md:ml-4">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-black text-white text-sm">C</div>
          <h1 className="font-bold text-lg tracking-tight text-white uppercase">CommAlert</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700 mr-2 md:mr-4">
            <button onClick={() => { setView("citizen"); setShowArchives(false); }} className={`px-4 md:px-6 py-1.5 rounded-md text-[10px] md:text-[11px] font-bold uppercase transition-all ${view === "citizen" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>Citizen</button>
            <button onClick={() => { setView("admin"); }} className={`px-4 md:px-6 py-1.5 rounded-md text-[10px] md:text-[11px] font-bold uppercase transition-all ${view === "admin" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>Admin</button>
          </div>
        </div>
      </nav>

      {/* CONTENT AREA */}
      <div className="p-4 md:p-8">
        {view === "citizen" && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-2 uppercase tracking-tighter">Hello, <span className="text-blue-500">Citizen!</span></h2>
              <p className="text-slate-400 text-sm font-medium">Your reports are synced to the cloud globally.</p>
            </div>

            <div className="max-w-xl mx-auto bg-[#1e293b]/50 border border-slate-800 p-6 md:p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-sm">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">{editingId ? "Edit Feedback" : "Submit Feedback"}</h2>
              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                    <select value={feedback.category} onChange={(e) => setFeedback({ ...feedback, category: e.target.value })} className="w-full bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500 cursor-pointer">
                      <option>Complaint</option><option>Suggestion</option><option>Request</option><option>Praise</option>
                    </select>
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Priority</label>
                    <select value={feedback.priority} onChange={(e) => setFeedback({ ...feedback, priority: e.target.value })} className="w-full bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500 cursor-pointer">
                      <option>Low</option><option>Medium</option><option>High</option><option>Emergency</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2 text-left relative">
                  <div className="flex justify-between items-center ml-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Message</label></div>
                  <div className="relative group">
                    <textarea required placeholder="Enter your message" value={feedback.message} onChange={(e) => setFeedback({ ...feedback, message: e.target.value })} className="w-full bg-[#0f172a] border border-slate-700 p-5 pr-14 rounded-xl h-44 text-white outline-none focus:border-blue-500 transition-all resize-none" />
                    <div className="absolute right-4 bottom-4 flex items-center gap-2">
                      <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 bg-slate-800 hover:bg-blue-600 rounded-lg text-slate-400 hover:text-white transition-all shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]">{editingId ? "Update Report" : "Send Feedback"}</button>
              </form>
            </div>

            <div className="bg-[#1e293b]/30 border border-slate-800 rounded-3xl overflow-hidden shadow-xl overflow-x-auto">
              <div className="p-6 border-b border-slate-800 bg-[#1e293b]/50 text-left"><h3 className="font-bold text-white">Recent Community Feedbacks</h3></div>
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-[#0f172a]/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em]">
                  <tr><th className="p-5">ID</th><th className="p-5">Message</th><th className="p-5 text-center">Status</th><th className="p-5 text-center">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {reports.length === 0 ? <tr><td colSpan="4" className="p-16 text-center text-slate-500 italic font-medium">Loading live feeds...</td></tr> :
                    reports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-5 text-slate-500 font-mono text-xs font-semibold">...{r.id.slice(-6)}</td>
                        <td className="p-5 italic text-slate-300 truncate max-w-[200px]">"{r.message}"</td>
                        <td className="p-5 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${r.status === "Approved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : r.status === "Resolved" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>{r.status}</span>
                        </td>
                        <td className="p-5 flex justify-center gap-2">
                          <button onClick={() => setSelectedReport(r)} className="text-blue-400 hover:underline text-xs font-bold uppercase">Details</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === "admin" && (
          <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            {!isAdminLoggedIn ? (
              <div className="flex justify-center items-center py-10 md:py-20">
                <div className="bg-[#1e293b]/40 border border-slate-800 w-full max-w-md rounded-[3rem] p-8 md:p-12 shadow-2xl backdrop-blur-xl">
                  <div className="text-center mb-10"><h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">Admin Panel</h2></div>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <input type="text" placeholder="Username" required className="w-full bg-[#0f172a]/60 border border-slate-700 p-5 rounded-2xl text-white outline-none focus:border-blue-600" onChange={(e) => setAdminCredentials({ ...adminCredentials, username: e.target.value })} />
                    <input type="password" placeholder="Password" required className="w-full bg-[#0f172a]/60 border border-slate-700 p-5 rounded-2xl text-white outline-none focus:border-blue-600" onChange={(e) => setAdminCredentials({ ...adminCredentials, password: e.target.value })} />
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest mt-6">Sign In</button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 text-left">
                  <div><h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase mb-1">Hello, <span className="text-blue-500">Admin!</span></h2><p className="text-slate-400 text-sm font-medium">Monitoring system reports in real-time.</p></div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <button onClick={() => setIsAdminLoggedIn(false)} className="text-red-400 text-xs font-bold uppercase border border-red-400/20 px-6 py-2 rounded-xl">Logout</button>
                  </div>
                </div>

                <div className="bg-[#1e293b]/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-[#0f172a]/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-800">
                      <tr>
                        <th className="p-8 w-10"><input type="checkbox" /></th>
                        <th className="p-8">ID</th><th className="p-8">Category / Priority</th><th className="p-8">Message</th><th className="p-8 text-center">Status</th><th className="p-8 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {reports.length > 0 ? renderRows(reports) : <tr><td colSpan="6" className="p-8 text-center text-slate-600 text-xs italic">No reports found in database.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}