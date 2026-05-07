import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    // Backend validation: Siguraduhon nga naay sulod ang report
    if (!body.content || !body.category) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Anonymity Protocol: I-save ra ang content, category, ug timestamp
    const docRef = await addDoc(collection(db, "feedback"), {
      category: body.category, // e.g., "Infrastructure", "Sanitation"
      content: body.content,
      status: "Pending",       // Default initial status
      timestamp: serverTimestamp(),
    });

    return NextResponse.json({ message: "Anonymous report submitted!", id: docRef.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}