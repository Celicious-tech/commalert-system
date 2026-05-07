import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  where,
  serverTimestamp 
} from "firebase/firestore";

const reportsCol = collection(db, "reports");

export const reportService = {
  // CREATE: Para sa Citizen
  async createReport(data) {
    return await addDoc(reportsCol, {
      ...data,
      status: "Pending",
      createdAt: serverTimestamp(),
    });
  },

  // READ: Para sa Admin (Tanang reports)
  async getAllReports() {
    const q = query(reportsCol, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // READ: Para sa Citizen (Iyang reports ra - Notification Logic)
  async getMyReports(userId) {
    const q = query(reportsCol, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // UPDATE: Para sa Admin (Approve/Resolve)
  async updateStatus(id, newStatus) {
    const reportRef = doc(db, "reports", id);
    return await updateDoc(reportRef, { status: newStatus });
  },

  // DELETE
  async deleteReport(id) {
    const reportRef = doc(db, "reports", id);
    return await deleteDoc(reportRef);
  }
};