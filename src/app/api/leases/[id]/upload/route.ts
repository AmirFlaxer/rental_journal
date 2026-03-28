import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { camelKeys } from "@/lib/supabase/case";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
const MAX_SIZE = 10 * 1024 * 1024;

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const { data: lease } = await supabase
      .from("leases")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (!lease) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "סוג קובץ לא נתמך. יש להעלות PDF או DOCX בלבד" }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "הקובץ גדול מדי. הגודל המקסימלי הוא 10MB" }, { status: 400 });

    const ext = file.name.split(".").pop() || "bin";
    const storedName = `${id}/${randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: storageError } = await supabaseAdmin.storage
      .from("lease-documents")
      .upload(storedName, bytes, { contentType: file.type });

    if (storageError) return NextResponse.json({ error: "שגיאה בהעלאת הקובץ: " + storageError.message }, { status: 500 });

    const { data: doc, error: dbError } = await supabase
      .from("lease_documents")
      .insert({
        lease_id: id,
        file_name: file.name,
        stored_name: storedName,
        mime_type: file.type,
        size_bytes: file.size,
      })
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json(camelKeys(doc), { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "שגיאה בהעלאת הקובץ" }, { status: 500 });
  }
}
