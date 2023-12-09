export class FutureError extends Error {
  constructor(
    message: string,
    public options?: { cause: Error },
  ) {
    super(message);
  }
}

const INTERNAL_ERROR_RESPONSE: ErrorResponse = {
  code: 'UNKNOWN',
  message: 'Something went wrong',
};

type ErrorExtensions = {
  code: string;
};
type ErrorResponse = ErrorExtensions & {
  message: string;
};

type ErrorClass<Class> = { new (...args: any[]): Class & Error };
type ErrorFormatter<From> =
  | ErrorExtensions
  | ((error: From & Error) => ErrorExtensions);

const errorMappings: Map<ErrorClass<any>, ErrorFormatter<any>> = new Map();

export function addErrorFormatter<From>(
  from: ErrorClass<From>,
  to: ErrorFormatter<From>,
) {
  if (errorMappings.has(from)) {
    throw new Error(`Error ${from.name} is already mapped`);
  }

  errorMappings.set(from, to);
}

function getErrorFormatter<Class>(
  error: Error,
): ErrorFormatter<Class> | undefined {
  const errorClass = error.constructor as ErrorClass<Class>;
  return errorMappings.get(errorClass);
}

export function isInternalError(error: Error) {
  const formatter = getErrorFormatter(error);
  return !formatter;
}

export function formatError(error: Error): ErrorResponse {
  const formatter = getErrorFormatter(error);
  const extensions =
    formatter instanceof Function ? formatter(error) : formatter;

  if (extensions) {
    const formattedError = {
      message: error.message,
      code: extensions.code,
    };

    return formattedError;
  }

  return INTERNAL_ERROR_RESPONSE;
}
