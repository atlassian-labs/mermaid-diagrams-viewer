import { invoke } from '@forge/bridge';

type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

type SuccessResponse<T = any> = {
  data: T;
};

export class ServerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

function processResponse<T>(response: ErrorResponse | SuccessResponse<T>) {
  if ('error' in response) {
    throw new ServerError(response.error.message, response.error.code);
  }
  return response.data;
}

export async function getFile() {
  const response = await invoke<ErrorResponse | SuccessResponse<string>>(
    'getFile',
    {}
  );
  const file = processResponse(response);
  return file;
}
