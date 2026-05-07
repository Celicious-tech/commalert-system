"use client";
import { useState } from "react";

export default function CommAlertSystem() {
  const [view, setView] = useState("citizen");
  const [feedback, setFeedback] = useState({ category: "Complaint", message: "" });
  const [reports, setReports] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  // Modals State
  const [selectedReport, setSelectedReport] = useState(null); // For View
  const [adminEditingReport, setAdminEditingReport] = useState(null); // For Update Modal

  // --- LOGIC ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      setReports(reports.map(r => 
        r.id === editingId ? { ...r, type: feedback.category, msg: feedback.message } : r
      ));
      setEditingId(null);
      alert("Report updated successfully!");
    } else {
      const newReport = {
        id: Math.floor(100000 + Math.random() * 900000),
        type: feedback.category,
        msg: feedback.message,
        status: "Pending",
        date: new Date().toLocaleString()
      };
      setReports([newReport, ...reports]);
      alert("Feedback submitted successfully!");
    }
    setFeedback({ category: "Complaint", message: "" });
  };

  const handleAdminUpdate = () => {
    setReports(reports.map(r => 
      r.id === adminEditingReport.id ? adminEditingReport : r
    ));
    setAdminEditingReport(null);
    alert("Changes saved successfully!");
  };

  const handleEditInitiate = (report) => {
    setEditingId(report.id);
    setFeedback({ category: report.type, message: report.msg });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this report?")) {
      setReports(reports.filter(r => r.id !== id));
    }
  };

  const approveReport = (id) => {
    setReports(reports.map(r => r.id === id ? { ...r, status: "Approved" } : r));
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* MODAL: UPDATE REPORT */}
      {adminEditingReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-slate-700 w-full max-w-lg rounded-[2rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-blue-500 font-black text-xs uppercase tracking-widest mb-8">Update Report</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</label>
                <select 
                  value={adminEditingReport.status}
                  onChange={(e) => setAdminEditingReport({...adminEditingReport, status: e.target.value})}
                  className="w-full bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500"
                >
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Resolved</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Message</label>
                <textarea 
                  value={adminEditingReport.msg}
                  onChange={(e) => setAdminEditingReport({...adminEditingReport, msg: e.target.value})}
                  className="w-full bg-[#0f172a] border border-slate-700 p-4 rounded-xl h-40 text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-6 pt-4">
                <button onClick={() => setAdminEditingReport(null)} className="text-slate-400 hover:text-white font-bold uppercase text-xs tracking-widest">Cancel</button>
                <button onClick={handleAdminUpdate} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-blue-900/40">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DETAILS (Enhanced to match image_fb47da.png) */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#1e293b] border border-slate-800 w-full max-w-[480px] rounded-3xl p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-blue-500 font-mono text-sm font-semibold tracking-tight">#{selectedReport.id}</span>
              <button 
                onClick={() => setSelectedReport(null)} 
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <h3 className="text-4xl font-bold text-white mb-10 tracking-tight">Report Details</h3>
            
            <div className="space-y-8 mb-12">
              <div>
                <label className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.1em] mb-2 block">Category</label>
                <p className="text-white text-xl font-medium">{selectedReport.type}</p>
              </div>
              
              <div>
                <label className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.1em] mb-2 block">Status</label>
                <p className="text-white text-xl font-medium">{selectedReport.status}</p>
              </div>
              
              <div>
                <label className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.1em] mb-2 block">Message</label>
                <p className="text-white text-xl font-medium italic">"{selectedReport.msg}"</p>
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedReport(null)} 
              className="w-full bg-slate-700/50 hover:bg-slate-700 text-white py-5 rounded-2xl font-black uppercase text-sm tracking-[0.15em] transition-all active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2 ml-4">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-black text-white text-sm">C</div>
          <h1 className="font-bold text-lg tracking-tight text-white uppercase tracking-tighter">CommAlert</h1>
        </div>
        
        <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700 mr-4">
          <button onClick={() => setView("citizen")} className={`px-6 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${view === "citizen" ? "bg-blue-600 text-white shadow-lg scale-105" : "text-slate-400 hover:text-white"}`}>Citizen</button>
          <button onClick={() => setView("admin")} className={`px-6 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${view === "admin" ? "bg-blue-600 text-white shadow-lg scale-105" : "text-slate-400 hover:text-white"}`}>Admin</button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="p-8">
        {/* CITIZEN VIEW */}
        {view === "citizen" && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
            <div className="max-w-xl mx-auto bg-[#1e293b]/50 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-sm">
              <h2 className="text-3xl font-bold text-white mb-1">{editingId ? "Edit Feedback" : "Submit Feedback"}</h2>
              <p className="text-slate-400 text-sm mb-8 font-medium">Your reports help us build a better community.</p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                  <select value={feedback.category} onChange={(e) => setFeedback({...feedback, category: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-all cursor-pointer">
                    <option>Complaint</option>
                    <option>Suggestion</option>
                    <option>Request</option>
                    <option>Praise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Message</label>
                  <textarea required placeholder="Enter your message" value={feedback.message} onChange={(e) => setFeedback({...feedback, message: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 p-5 rounded-xl h-44 text-white outline-none focus:border-blue-500 transition-all resize-none" />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]">
                  {editingId ? "Update Report" : "Send Feedback"}
                </button>
              </form>
            </div>

            <div className="bg-[#1e293b]/30 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 bg-[#1e293b]/50"><h3 className="font-bold text-white">My Submissions</h3></div>
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0f172a]/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em]">
                  <tr><th className="p-5">Tracking ID</th><th className="p-5">Message</th><th className="p-5 text-center">Status</th><th className="p-5 text-center">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {reports.length === 0 ? (
                    <tr><td colSpan="4" className="p-16 text-center text-slate-500 italic font-medium">No reports submitted yet.</td></tr>
                  ) : (
                    reports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-5 text-slate-500 font-mono text-xs font-semibold">#{r.id}</td>
                        <td className="p-5 italic text-slate-300">"{r.msg}"</td>
                        <td className="p-5 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${r.status === "Approved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : r.status === "Resolved" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex justify-center gap-2">
                            {r.status === "Pending" && (
                              <>
                                <button onClick={() => handleEditInitiate(r)} className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-all">Edit</button>
                                <button onClick={() => handleDelete(r.id)} className="bg-red-600/10 text-red-400 border border-red-500/20 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-red-600 hover:text-white transition-all">Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADMIN VIEW */}
        {view === "admin" && (
          <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div className="mb-12">
              <h2 className="text-5xl font-black text-white tracking-tighter uppercase mb-2">System <span className="text-blue-500">Reports</span></h2>
              <p className="text-slate-400 text-sm font-medium">Managing citizen feedback and alerts</p>
            </div>

            <div className="bg-[#1e293b]/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
              <table className="w-full text-left">
                <thead className="bg-[#0f172a]/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-800">
                  <tr><th className="p-8">Tracking ID</th><th className="p-8">Category</th><th className="p-8">Message</th><th className="p-8 text-center">Status</th><th className="p-8 text-center">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {reports.length === 0 ? (
                    <tr><td colSpan="5" className="p-24 text-center text-slate-500 italic font-medium">No reports found in system.</td></tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report.id} className="hover:bg-blue-500/5 transition-colors group">
                        <td className="p-8 text-slate-500 font-mono text-xs font-bold">#{report.id}</td>
                        <td className="p-8 font-bold text-white uppercase tracking-tight text-sm">{report.type}</td>
                        <td className="p-8 text-slate-400 italic text-sm">"{report.msg}"</td>
                        <td className="p-8 text-center">
                          <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase border ${report.status === "Pending" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : report.status === "Resolved" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="p-8">
                          <div className="flex justify-center gap-3">
                            <button onClick={() => setSelectedReport(report)} className="bg-slate-700/50 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">View</button>
                            {report.status === "Pending" ? (
                              <button onClick={() => approveReport(report.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-900/40 transition-all active:scale-95">Approve</button>
                            ) : (
                              <button 
                                onClick={() => setAdminEditingReport({...report})} 
                                className="bg-slate-800 hover:bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-slate-700 hover:border-blue-500"
                              >
                                Edit
                              </button>
                            )}
                            <button onClick={() => handleDelete(report.id)} className="bg-red-900/20 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-red-500/10">Del</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}