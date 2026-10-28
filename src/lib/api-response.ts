import { NextResponse } from "next/server";
import type { ApiError, ApiSuccess } from "@/types/api";

export function ok<T>(
  data: T,
  init?: { status?: number; meta?: Record<string, unknown> },
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      ...(init?.meta ? { meta: init.meta } : {}),
    },
    { status: init?.status ?? 200 },
  );
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status },
  );
}
