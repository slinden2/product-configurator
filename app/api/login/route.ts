import { NextRequest, NextResponse } from "next/server";
import { configSchema } from "@/validation/configSchema";
import { insertConfiguration } from "@/db/queries";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = configSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  return NextResponse.json({}, { status: 201 });
}
