import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

// UPDATE: Para ma-change ang status sa feedback
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const reportRef = doc(db, "feedback", id);
    await updateDoc(reportRef, {
      status: body.status, // e.g., "In Progress" or "Resolved"
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: "Status updated successfully!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Para matangtang ang report sa system
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await deleteDoc(doc(db, "feedback", id));

    return NextResponse.json({ message: "Report deleted successfully!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}