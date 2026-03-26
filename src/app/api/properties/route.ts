import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { propertySchema } from "@/lib/validations";
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

    const properties = await prisma.property.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(properties);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch properties" },
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
    const data = propertySchema.parse(body);

    const property = await prisma.property.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Create property error:", error);
    const message = error instanceof Error ? error.message : "Failed to create property";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
