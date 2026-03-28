import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const { data: doc } = await supabase
      .from("lease_documents")
      .select("*, leases!inner(user_id)")
      .eq("id", id)
      .eq("leases.user_id", session.user.id)
      .single();

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const { data: fileData, error: storageError } = await supabaseAdmin.storage
      .from("lease-documents")
      .download(doc.stored_name);

    if (storageError || !fileData)
      return NextResponse.json({ error: "שגיאה בהורדת הקובץ" }, { status: 500 });

    const buffer = await fileData.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mime_type,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`,
        "Content-Length": String(doc.size_bytes),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "שגיאה בהורדת הקובץ" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const { data: doc } = await supabase
      .from("lease_documents")
      .select("*, leases!inner(user_id)")
      .eq("id", id)
      .eq("leases.user_id", session.user.id)
      .single();

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Delete from storage
    await supabaseAdmin.storage.from("lease-documents").remove([doc.stored_name]);

    const { error } = await supabase.from("lease_documents").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת הקובץ" }, { status: 500 });
  }
}
