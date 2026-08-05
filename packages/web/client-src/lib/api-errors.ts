type ApiErrorData = {
  message?: string;
  code?: string;
};

type ApiErrorLike = {
  message?: string;
  status?: number;
  data?: ApiErrorData;
};

type GetApiErrorMessageOptions = {
  conflictCodes?: string[];
  conflictMessage?: string;
};

function toApiErrorLike(error: unknown): ApiErrorLike | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  return error as ApiErrorLike;
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  options?: GetApiErrorMessageOptions,
): string {
  const candidate = toApiErrorLike(error);
  if (!candidate) {
    return fallback;
  }

  const backendMessage = candidate.data?.message || candidate.message;
  const backendCode = candidate.data?.code;
  const isConflict =
    candidate.status === 409 ||
    (backendCode ? (options?.conflictCodes || []).includes(backendCode) : false);

  if (isConflict && options?.conflictMessage) {
    return backendMessage || options.conflictMessage;
  }

  return backendMessage || fallback;
}
