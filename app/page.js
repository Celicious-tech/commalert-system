"use client";
import { useState, useRef, useMemo } from "react";

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

  // --- DATA SEGREGATION LOGIC ---
  const categorizedReports = useMemo(() => {
    const baseList = showArchives ? archivedReports : reports;
    const filtered = baseList.filter(r => 
      r.msg.toLowerCase().includes(searchTerm.toLowerCase()) || 
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

  const finalizeSubmission = (location) => {
    if (editingId) {
      setReports(reports.map(r =>
        r.id === editingId ? { ...r, type: feedback.category, msg: feedback.message, image: selectedImage, priority: feedback.priority } : r
      ));
      setEditingId(null);
      alert("Report updated successfully!");
    } else {
      const newReport = {
        id: Math.floor(100000 + Math.random() * 900000),
        type: feedback.category,
        msg: feedback.message,
        priority: feedback.priority,
        location: location,
        status: "Pending",
        adminReply: "",
        image: selectedImage,
        date: new Date().toLocaleString(),
        archivedDate: null
      };
      setReports([newReport, ...reports]);
      setNotifications(prev => [{ id: newReport.id, type: newReport.type, time: new Date().toLocaleTimeString() }, ...prev]);
      alert("Feedback submitted successfully!");
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

  const handleAdminUpdate = () => {
    setReports(reports.map(r =>
      r.id === adminEditingReport.id ? adminEditingReport : r
    ));
    setAdminEditingReport(null);
    alert("Changes saved successfully!");
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedBulkIds.length} selected reports?`)) {
      setReports(reports.filter(r => !selectedBulkIds.includes(r.id)));
      setSelectedBulkIds([]);
    }
  };

  const handleEditInitiate = (report) => {
    setEditingId(report.id);
    setFeedback({ category: report.type, message: report.msg, priority: report.priority || "Medium" });
    setSelectedImage(report.image || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (confirm("Move this report to Archives?")) {
      const reportToArchive = reports.find(r => r.id === id);
      const archivedItem = { ...reportToArchive, archivedDate: new Date().toLocaleString() };
      setArchivedReports([archivedItem, ...archivedReports]);
      setReports(reports.filter(r => r.id !== id));
    }
  };

  const handlePermanentDelete = (id) => {
    if (confirm("This will permanently delete the data. Continue?")) {
      setArchivedReports(archivedReports.filter(r => r.id !== id));
    }
  };

  const clearNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  // --- REUSABLE ROW RENDERER ---
  const renderRows = (dataList) => {
    return dataList.map((report) => (
      <tr key={report.id} className="hover:bg-blue-500/5 transition-colors group">
        <td className="p-8">
          <input type="checkbox" checked={selectedBulkIds.includes(report.id)} onChange={() => toggleBulkSelection(report.id)} />
        </td>
        <td className="p-8 text-slate-500 font-mono text-xs font-bold">#{report.id}</td>
        <td className="p-8">
          <div className="font-bold text-white uppercase tracking-tight text-sm">{report.type}</div>
          <div className={`text-[10px] font-bold ${report.priority === 'Emergency' ? 'text-red-500' : 'text-slate-500'}`}>{report.priority || 'Medium'}</div>
        </td>
        <td className="p-8 text-slate-400 italic text-sm">
          <div className="flex items-center gap-3">
            {report.image && <div className="w-8 h-8 rounded bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0"><img src={report.image} alt="Report" className="w-full h-full object-cover" /></div>}
            <span className="truncate max-w-[250px]">"{report.msg}"</span>
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
              <span className="text-blue-500 font-mono text-sm font-semibold tracking-tight">#{selectedReport.id}</span>
              <button onClick={() => setSelectedReport(null)} className="text-slate-500 hover:text-white transition-colors p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <h3 className="text-4xl font-bold text-white mb-6 tracking-tight">Report Details</h3>
            <div className="space-y-6 mb-8 text-left">
              {selectedReport.image && <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-2 block">Attachment</label><img src={selectedReport.image} alt="Report attachment" className="w-full rounded-2xl border border-slate-700" /></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-1 block">Category</label><p className="text-white font-medium">{selectedReport.type}</p></div>
                <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-1 block">Priority</label><p className={`font-bold ${selectedReport.priority === 'Emergency' ? 'text-red-500' : 'text-white'}`}>{selectedReport.priority || 'Medium'}</p></div>
              </div>
              <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-1 block">Status</label><p className="text-white font-medium">{selectedReport.status}</p></div>
              <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-1 block">Message</label><p className="text-white italic">"{selectedReport.msg}"</p></div>
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
          <h1 className="font-bold text-lg tracking-tight text-white uppercase tracking-tighter">CommAlert</h1>
        </div>
        <div className="flex items-center gap-4">
          {view === "admin" && isAdminLoggedIn && (
            <div className="relative">
              <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white relative transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {notifications.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">{notifications.length}</span>}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 mt-3 w-64 bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#1e293b]">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">New Feedbacks</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setNotifications([])} className="text-[9px] text-blue-400 hover:underline">Clear all</button>
                      <button onClick={() => setShowNotifDropdown(false)} className="text-slate-500 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto bg-[#1e293b]">
                    {notifications.length === 0 ? <p className="p-6 text-center text-xs text-slate-500 italic">No new notifications</p> :
                      notifications.map(n => (
                        <div key={n.id} className="p-4 border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => clearNotification(n.id)}>
                          <p className="text-[11px] text-white font-bold uppercase tracking-tight">New {n.type} Submitted</p>
                          <p className="text-[10px] text-slate-500 mt-1">ID: #{n.id} • {n.time}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
              <p className="text-slate-400 text-sm font-medium">Your reports help us build a better and safer community.</p>
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
                  <div className="flex justify-between items-center ml-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Message</label><span className="text-[10px] font-black text-slate-500">{feedback.message.length}/500</span></div>
                  <div className="relative group">
                    <textarea required maxLength="500" placeholder="Enter your message" value={feedback.message} onChange={(e) => setFeedback({ ...feedback, message: e.target.value })} className="w-full bg-[#0f172a] border border-slate-700 p-5 pr-14 rounded-xl h-44 text-white outline-none focus:border-blue-500 transition-all resize-none" />
                    <div className="absolute right-4 bottom-4 flex items-center gap-2">
                      {selectedImage && <div className="w-8 h-8 rounded border border-blue-500 overflow-hidden relative"><img src={selectedImage} alt="Preview" className="w-full h-full object-cover" /><button type="button" onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-black/40 text-[8px] font-bold flex items-center justify-center">X</button></div>}
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
              <div className="p-6 border-b border-slate-800 bg-[#1e293b]/50 text-left"><h3 className="font-bold text-white">My Submissions</h3></div>
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-[#0f172a]/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em]">
                  <tr><th className="p-5">Tracking ID</th><th className="p-5">Message</th><th className="p-5 text-center">Status</th><th className="p-5 text-center">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {reports.length === 0 ? <tr><td colSpan="4" className="p-16 text-center text-slate-500 italic font-medium">No reports submitted yet.</td></tr> :
                    reports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-5 text-slate-500 font-mono text-xs font-semibold">#{r.id}</td>
                        <td className="p-5 italic text-slate-300 truncate max-w-[200px]">"{r.msg}"</td>
                        <td className="p-5 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${r.status === "Approved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : r.status === "Resolved" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>{r.status}</span>
                        </td>
                        <td className="p-5 flex justify-center gap-2">
                          <button onClick={() => setSelectedReport(r)} className="text-blue-400 hover:underline text-xs font-bold uppercase">Details</button>
                          {r.status === "Pending" && <button onClick={() => handleEditInitiate(r)} className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase">Edit</button>}
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
                    <input type="text" placeholder="Search reports..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white w-48 outline-none focus:border-blue-500" />
                    {selectedBulkIds.length > 0 && <button onClick={handleBulkDelete} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Delete ({selectedBulkIds.length})</button>}
                    <button onClick={() => setShowArchives(!showArchives)} className={`text-xs font-bold uppercase border px-6 py-2 rounded-xl ${showArchives ? "bg-amber-500 text-white" : "text-amber-500 border-amber-500/20"}`}>{showArchives ? "Live Reports" : `Archives (${archivedReports.length})`}</button>
                    <button onClick={() => setIsAdminLoggedIn(false)} className="text-red-400 text-xs font-bold uppercase border border-red-400/20 px-6 py-2 rounded-xl">Logout</button>
                  </div>
                </div>

                <div className="bg-[#1e293b]/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-[#0f172a]/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-800">
                      <tr>
                        <th className="p-8 w-10"><input type="checkbox" onChange={(e) => setSelectedBulkIds(e.target.checked ? categorizedReports.all.map(r => r.id) : [])} /></th>
                        <th className="p-8">Tracking ID</th><th className="p-8">Category / Priority</th><th className="p-8">Message</th><th className="p-8 text-center">{showArchives ? "Archived Date" : "Status"}</th><th className="p-8 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {/* --- DATA SEGREGATION SECTIONS (FIXED) --- */}
                      {!showArchives ? (
                        <>
                          {/* PENDING SECTION */}
                          <tr className="bg-amber-500/5"><td colSpan="6" className="px-8 py-3 text-[10px] font-black text-amber-500 uppercase tracking-widest border-y border-amber-500/10">Pending Reports ({categorizedReports.pending.length})</td></tr>
                          {categorizedReports.pending.length > 0 ? renderRows(categorizedReports.pending) : <tr><td colSpan="6" className="p-8 text-center text-slate-600 text-xs italic">No pending reports.</td></tr>}

                          {/* APPROVED SECTION */}
                          <tr className="bg-emerald-500/5"><td colSpan="6" className="px-8 py-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest border-y border-emerald-500/10">In Progress / Approved ({categorizedReports.approved.length})</td></tr>
                          {categorizedReports.approved.length > 0 ? renderRows(categorizedReports.approved) : <tr><td colSpan="6" className="p-8 text-center text-slate-600 text-xs italic">No approved reports.</td></tr>}

                          {/* RESOLVED SECTION */}
                          <tr className="bg-blue-500/5"><td colSpan="6" className="px-8 py-3 text-[10px] font-black text-blue-500 uppercase tracking-widest border-y border-blue-500/10">Resolved / Completed ({categorizedReports.resolved.length})</td></tr>
                          {categorizedReports.resolved.length > 0 ? renderRows(categorizedReports.resolved) : <tr><td colSpan="6" className="p-8 text-center text-slate-600 text-xs italic">No resolved reports.</td></tr>}
                        </>
                      ) : (
                        // ARCHIVES SECTION
                        categorizedReports.all.length > 0 ? renderRows(categorizedReports.all) : <tr><td colSpan="6" className="p-24 text-center text-slate-500 italic font-medium">No archived data found.</td></tr>
                      )}
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