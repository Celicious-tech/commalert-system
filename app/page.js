"use client";
import { useState, useRef, useMemo, useEffect } from "react";
// --- FIREBASE IMPORTS ---
import { db } from "@/lib/firebase"; 
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot 
} from "firebase/firestore";

export default function CommAlertSystem() {
  const [view, setView] = useState("citizen"); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false); 
  const [adminCredentials, setAdminCredentials] = useState({ username: "", password: "" });

  const [feedback, setFeedback] = useState({ category: "Complaint", message: "", priority: "Medium" });
  const [reports, setReports] = useState([]);
  const [showArchives, setShowArchives] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null); 

  const [selectedReport, setSelectedReport] = useState(null);
  const [adminEditingReport, setAdminEditingReport] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);

  // --- UNIQUE DEVICE IDENTITY STATE ---
  const [myDeviceId, setMyDeviceId] = useState("");

  // --- NOTIFICATIONS STATES ---
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifDropdownRef = useRef(null);

  // --- 1. INITIALIZE DEVICE ID & REAL-TIME DATA SYNC ---
  useEffect(() => {
    // Paghimo o pagkuha sa Unique Device ID para sa privacy filter sa Citizen side
    if (typeof window !== "undefined") {
      let dId = localStorage.getItem("commalert_device_id");
      if (!dId) {
        dId = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem("commalert_device_id", dId);
      }
      setMyDeviceId(dId);
    }

    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().createdAt?.toDate().toLocaleString() || new Date().toLocaleString()
      }));
      
      setReports(data);

      // Notifications para sa Admin panel gikan sa bag-ong mga "Pending" reports
      const pendingNotifs = data
        .filter(r => r.status === "Pending" || !r.status)
        .map(r => ({
          id: r.id,
          title: `New ${r.category} Report`,
          message: r.message,
          time: r.date,
          priority: r.priority
        }));
      setNotifications(pendingNotifs);
    }, (error) => {
      console.error("Firebase Snapshot Error: ", error);
    });

    const handleClickOutside = (event) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- GLOBAL SYNC ARCHIVE & ACTIVE FILTER LOGIC FOR ADMIN ---
  const filteredReports = useMemo(() => {
    const baseList = reports.filter(r => showArchives ? r.status === "Archived" : r.status !== "Archived");
    
    return baseList.filter(r => 
      (r.message || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.category || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm, showArchives]);

  // Filter para sa Citizen "My Submissions" aron iyang kaugalingong reports ra ang makita
  const myCitizenSubmissions = useMemo(() => {
    return reports.filter(r => r.deviceId === myDeviceId && r.status !== "Archived");
  }, [reports, myDeviceId]);

  // Kalkulasyon para sa Archive Counter sa Navbar Button
  const archiveCount = useMemo(() => {
    return reports.filter(r => r.status === "Archived").length;
  }, [reports]);

  // --- SEKSYON PARA SA PAGGRUPO SA REPORTS BASE SA ILANG STATUS (ADMIN DASHBOARD CATEGORIES) ---
  const pendingReports = useMemo(() => {
    return filteredReports.filter(r => r.status === "Pending" || !r.status);
  }, [filteredReports]);

  const approvedReports = useMemo(() => {
    return filteredReports.filter(r => r.status === "Approved" || r.status === "In Progress");
  }, [filteredReports]);

  const resolvedReports = useMemo(() => {
    return filteredReports.filter(r => r.status === "Resolved" || r.status === "Completed");
  }, [filteredReports]);

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

  const finalizeSubmission = async (location) => {
    const reportData = {
      deviceId: myDeviceId, // Gi-tag ang Unique ID sa device nga nag-submit
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
    } catch (error) {
      console.error("Error saving to Firebase: ", error);
      alert("Submission failed.");
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
    } catch (error) {
      alert("Error updating: " + error.message);
    }
  };

  const handleArchive = async (id) => {
    if (confirm("Move this report to Archives?")) {
        try {
            const reportRef = doc(db, "feedback", id);
            await updateDoc(reportRef, { status: "Archived" });
            alert("Report successfully moved to Cloud Archives!");
        } catch (error) {
            console.error("Archive failed: ", error);
        }
    }
  };

  const handlePermanentDelete = async (id) => {
    if (confirm("This will permanently delete the data from the Cloud Database. Continue?")) {
      try {
        await deleteDoc(doc(db, "feedback", id));
        alert("Data deleted permanently.");
      } catch (error) {
        console.error("Delete failed: ", error);
      }
    }
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- REUSABLE ROW RENDERER FOR ADMIN PANELS ---
  const renderRows = (dataList, emptyMessage = "No reports found.") => {
    if (dataList.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="p-12 text-center text-slate-500 text-xs italic bg-[#0f172a]/20">
            {emptyMessage}
          </td>
        </tr>
      );
    }

    return dataList.map((report) => (
      <tr key={report.id} className="hover:bg-blue-500/5 transition-colors group border-b border-slate-800/40">
        <td className="p-8">
          <input type="checkbox" checked={selectedBulkIds.includes(report.id)} onChange={() => toggleBulkSelection(report.id)} />
        </td>
        <td className="p-8 text-slate-500 font-mono text-[10px] font-bold">... {report.id.slice(-6)}</td>
        <td className="p-8 text-left">
          <div className="font-bold text-white uppercase tracking-tight text-sm">{report.category}</div>
          <div className={`text-[10px] font-bold ${report.priority === 'Emergency' ? 'text-red-500' : 'text-slate-500'}`}>{report.priority || 'Medium'}</div>
        </td>
        <td className="p-8 text-slate-400 italic text-sm text-left">
          <div className="flex items-center gap-3">
            {report.image && <div className="w-8 h-8 rounded bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0"><img src={report.image} alt="Report" className="w-full h-full object-cover" /></div>}
            <span className="truncate max-w-[250px]">"{report.message}"</span>
          </div>
        </td>
        <td className="p-8 text-center">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${report.status === "Archived" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
            {report.status || "Pending"}
          </span>
        </td>
        <td className="p-8 text-center">
          <div className="flex justify-center gap-4">
            <button onClick={() => setSelectedReport(report)} className="text-blue-400 hover:underline text-[10px] font-bold uppercase tracking-wider">Details</button>
            {!showArchives && <button onClick={() => setAdminEditingReport(report)} className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all tracking-wider">Update</button>}
            <button onClick={() => showArchives ? handlePermanentDelete(report.id) : handleArchive(report.id)} className="text-red-500/50 hover:text-red-500 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">

      {/* MODAL: UPDATE REPORT */}
      {adminEditingReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-slate-700 w-full max-w-lg rounded-[2.5rem] p-6 md:p-10 shadow-2xl">
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
          <div className="bg-[#1e293b] border border-slate-800 w-full max-w-[480px] rounded-3xl p-6 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
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
              <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-1 block">Status</label><p className="text-white font-medium">{selectedReport.status || "Pending"}</p></div>
              <div><label className="text-slate-500 text-[11px] font-bold uppercase mb-1 block">Message</label><p className="text-white italic">"{selectedReport.message}"</p></div>
              {selectedReport.adminReply && <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"><label className="text-blue-400 text-[11px] font-bold uppercase mb-1 block">Admin Response</label><p className="text-slate-200 text-sm">{selectedReport.adminReply}</p></div>}
            </div>
            <button onClick={() => setSelectedReport(null)} className="w-full bg-slate-700/50 hover:bg-slate-700 text-white py-5 rounded-2xl font-black uppercase text-sm transition-all">Close</button>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2 ml-2 md:ml-4">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-black text-white text-sm">C</div>
          <h1 className="font-bold text-lg tracking-tight text-white uppercase">CommAlert</h1>
        </div>
        
        <div className="flex items-center gap-4 mr-2 md:mr-4">
          {view === "admin" && isAdminLoggedIn && (
            <div className="relative" ref={notifDropdownRef}>
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)} 
                className="p-2.5 bg-[#1e293b] hover:bg-slate-800 rounded-xl border border-slate-700/80 text-slate-400 hover:text-white transition-all relative"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[9px] h-5 w-5 rounded-full flex items-center justify-center border border-[#0f172a] shadow-lg animate-bounce">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* DROPDOWN CONTAINER */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-[#1e293b] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-[150] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-4 bg-[#0f172a]/40 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-black text-white uppercase tracking-wider">Live Active Feeds</span>
                    <span className="text-[10px] bg-blue-600/20 text-blue-400 font-bold px-2 py-0.5 rounded-md">{notifications.length} New</span>
                  </div>
                  <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 italic text-xs">All clear! No pending notifications.</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-4 hover:bg-slate-800/40 transition-colors flex gap-3 text-left items-start group">
                          <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.priority === "Emergency" ? "bg-red-500" : "bg-amber-500"}`} />
                          <div className="flex-1 space-y-0.5">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-white uppercase tracking-tight">{n.title}</span>
                              <span className="text-[9px] text-slate-500 font-medium">{n.time.split(',')[1]}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 italic line-clamp-2">"{n.message}"</p>
                            <div className="pt-2 flex gap-2">
                              <button 
                                onClick={() => {
                                  const found = reports.find(r => r.id === n.id);
                                  if (found) setSelectedReport(found);
                                  setShowNotifDropdown(false);
                                }} 
                                className="text-[10px] font-black text-blue-400 hover:underline uppercase"
                              >
                                View Live
                              </button>
                              <button 
                                onClick={() => clearNotification(n.id)} 
                                className="text-[10px] font-semibold text-slate-500 hover:text-white uppercase ml-auto"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700">
            <button onClick={() => { setView("citizen"); }} className={`px-4 md:px-6 py-1.5 rounded-md text-[10px] md:text-[11px] font-bold uppercase transition-all ${view === "citizen" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>Citizen</button>
            <button onClick={() => { setView("admin"); setIsAdminLoggedIn(false); }} className={`px-4 md:px-6 py-1.5 rounded-md text-[10px] md:text-[11px] font-bold uppercase transition-all ${view === "admin" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>Admin</button>
          </div>
        </div>
      </nav>

      {/* CONTENT AREA */}
      <div className="p-4 md:p-8">
        {/* VIEW: CITIZEN */}
        {view === "citizen" && (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-2 uppercase tracking-tighter">Hello, <span className="text-blue-500">Citizen!</span></h2>
              <p className="text-slate-400 text-sm font-medium">Your reports are secure and private to your device.</p>
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
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-xl font-bold uppercase tracking-widest tracking-wider shadow-lg">{editingId ? "Update Report" : "Send Feedback"}</button>
              </form>
            </div>

            {/* --- CITIZEN "MY SUBMISSIONS" LAMESA (NOW PRIVACY-FILTERED) --- */}
            <div className="bg-[#1e293b]/20 border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md overflow-x-auto mt-12 text-left">
              <div className="p-6 bg-[#1e293b]/40 border-b border-slate-800">
                <h3 className="text-xl font-bold text-white tracking-tight">My Submissions</h3>
              </div>
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-[#0f172a]/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-800">
                  <tr>
                    <th className="p-6">Tracking ID</th>
                    <th className="p-6">Message</th>
                    <th className="p-6 text-center">Status</th>
                    <th className="p-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {myCitizenSubmissions.length > 0 ? (
                    myCitizenSubmissions.map((report) => (
                      <tr key={report.id} className="hover:bg-blue-500/5 transition-colors group">
                        <td className="p-6 text-slate-500 font-mono text-xs font-bold">... {report.id.slice(-6)}</td>
                        <td className="p-6 text-slate-300 italic text-sm">
                          <div className="flex items-center gap-3">
                            {report.image && <div className="w-8 h-8 rounded bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0"><img src={report.image} alt="Thumbnail" className="w-full h-full object-cover" /></div>}
                            <span className="truncate max-w-[300px]">"{report.message}"</span>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border ${report.status === "Resolved" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : report.status === "Approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                            {report.status || "Pending"}
                          </span>
                        </td>
                        <td className="p-6 text-center">
                          <button onClick={() => setSelectedReport(report)} className="text-blue-400 hover:underline text-[10px] font-bold uppercase tracking-wider">Details</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-500 text-sm italic">No reports submitted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
         )}

        {/* VIEW: ADMIN PANEL */}
        {view === "admin" && (
          <div className="max-w-6xl mx-auto">
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
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-left relative">
                  <div>
                    <h2 className="text-5xl font-black text-white tracking-tighter uppercase mb-1">Hello, <span className="text-blue-500">Admin!</span></h2>
                    <p className="text-slate-400 text-sm font-medium">Monitoring system reports in real-time.</p>
                  </div>
                  
                  {/* HUB FOR SEARCH, ARCHIVE TOGGLE & LOGOUT */}
                  <div className="flex items-center gap-4 flex-wrap mt-4 md:mt-0">
                    <input 
                      type="text" 
                      placeholder="Search reports..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-[#0f172a] border border-slate-800 text-slate-300 px-6 py-2 rounded-full text-xs font-semibold outline-none focus:border-blue-500 w-44"
                    />
                    
                    <button 
                      onClick={() => setShowArchives(!showArchives)} 
                      className={`text-xs font-bold uppercase px-6 py-2 rounded-xl transition-all border ${showArchives ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-500/20 bg-amber-500/5 text-amber-500'}`}
                    >
                      {showArchives ? "View Active" : `Archives (${archiveCount})`}
                    </button>
                    <button 
                      onClick={() => setIsAdminLoggedIn(false)} 
                      className="border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold uppercase px-6 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all tracking-wider"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                {/* --- SEGMENTED TABLE CONTAINER PARA SA ADMIN SECTIONS (ADMIN SEES ABSOLUTELY EVERYTHING) --- */}
                <div className="bg-[#1e293b]/10 border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md overflow-x-auto mt-12">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-[#0f172a]/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-800">
                      <tr>
                        <th className="p-8 w-10">
                          <input type="checkbox" onChange={(e) => {
                            if (e.target.checked) setSelectedBulkIds(filteredReports.map(r => r.id));
                            else setSelectedBulkIds([]);
                          }} />
                        </th>
                        <th className="p-8">Tracking ID</th>
                        <th className="p-8">Category / Priority</th>
                        <th className="p-8">Message</th>
                        <th className="p-8 text-center">Status</th>
                        <th className="p-8 text-center">Actions</th>
                      </tr>
                    </thead>

                    {showArchives ? (
                      <tbody className="divide-y divide-slate-800/40">
                        {renderRows(filteredReports, "No archived reports found.")}
                      </tbody>
                    ) : (
                      <>
                        {/* SECTION 1: PENDING REPORTS */}
                        <thead className="bg-amber-500/5 text-amber-500 border-t border-b border-slate-800/60">
                          <tr>
                            <td colSpan="6" className="px-8 py-3 text-[11px] font-black tracking-wider uppercase">
                              Pending Reports ({pendingReports.length})
                            </td>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 bg-[#0f172a]/10">
                          {renderRows(pendingReports, "No pending reports.")}
                        </tbody>

                        {/* SECTION 2: IN PROGRESS / APPROVED */}
                        <thead className="bg-emerald-500/5 text-emerald-400 border-t border-b border-slate-800/60">
                          <tr>
                            <td colSpan="6" className="px-8 py-3 text-[11px] font-black tracking-wider uppercase">
                              In Progress / Approved ({approvedReports.length})
                            </td>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 bg-[#0f172a]/10">
                          {renderRows(approvedReports, "No approved reports.")}
                        </tbody>

                        {/* SECTION 3: RESOLVED / COMPLETED */}
                        <thead className="bg-blue-500/5 text-blue-400 border-t border-b border-slate-800/60">
                          <tr>
                            <td colSpan="6" className="px-8 py-3 text-[11px] font-black tracking-wider uppercase">
                              Resolved / Completed ({resolvedReports.length})
                            </td>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 bg-[#0f172a]/10">
                          {renderRows(resolvedReports, "No resolved reports.")}
                        </tbody>
                      </>
                    )}
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