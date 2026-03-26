import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { leaseSchema } from "@/lib/validations";
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

    const leases = await prisma.lease.findMany({
      where: { userId: session.user.id },
      include: {
        property: true,
        tenant: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leases);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch leases" },
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
    const data = leaseSchema.parse(body);

    // Verify property and tenant belong to user
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    if (!property || property.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Property not found or unauthorized" },
        { status: 404 }
      );
    }

    if (!tenant || tenant.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Tenant not found or unauthorized" },
        { status: 404 }
      );
    }

    const lease = await prisma.lease.create({
      data: {
        ...data,
        userId: session.user.id,
      },
      include: {
        property: true,
        tenant: true,
        payments: true,
      },
    });

    return NextResponse.json(lease, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create lease" },
      { status: 500 }
    );
  }
}
