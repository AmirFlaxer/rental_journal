import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tenantSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tenants = await prisma.tenant.findMany({
      where: { userId: session.user.id },
      include: {
        leases: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = tenantSchema.parse(body);

    const tenant = await prisma.tenant.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}
