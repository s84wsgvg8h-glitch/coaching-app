import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  error: null;
  message?: string;
};

export type ApiFailure = {
  success: false;
  data: null;
  error: string;
  message?: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(
  data: T,
  init?: ResponseInit & { message?: string },
): NextResponse<ApiSuccess<T>> {
  const { message, ...responseInit } = init || {};
  return NextResponse.json(
    {
      success: true,
      data,
      error: null,
      ...(message ? { message } : {}),
    },
    responseInit,
  );
}

export function apiError(
  error: string,
  status = 400,
  init?: ResponseInit,
): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error,
    },
    { status, ...init },
  );
}

/** Backward-compatible JSON for routes that already expose flat shapes. */
export function apiLegacyError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
