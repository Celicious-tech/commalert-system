"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    // Siguraduha nga "feedback" ang ngalan sa collection sa Firestore
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setReports(data);
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <tbody>
      {reports.length === 0 ? (
        <tr><td colSpan="4" className="text-center">No reports found.</td></tr>
      ) : (
        reports.map((report) => (
          <tr key={report.id}>
            {/* I-check kung naa ba gyud ni nga fields sa imong Firestore document */}
            <td>{report.trackingId || "N/A"}</td>
            <td>{report.category}</td>
            <td>"{report.message}"</td>
            <td>{report.status || "Pending"}</td>
          </tr>
        ))
      )}
    </tbody>
  );
}