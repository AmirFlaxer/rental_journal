import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validations";
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

    const payments = await prisma.payment.findMany({
      where: { userId: session.user.id },
      include: {
        property: true,
        lease: true,
      },
      orderBy: { dueDate: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch payments" },
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
    const data = paymentSchema.parse(body);

    // Verify property belongs to user
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property || property.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Property not found or unauthorized" },
        { status: 404 }
      );
    }

    // If leaseId is provided, verify it belongs to user
    if (data.leaseId) {
      const lease = await prisma.lease.findUnique({
        where: { id: data.leaseId },
      });

      if (!lease || lease.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Lease not found or unauthorized" },
          { status: 404 }
        );
      }
    }

    const payment = await prisma.payment.create({
      data: {
        ...data,
        userId: session.user.id,
      },
      include: {
        property: true,
        lease: true,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
