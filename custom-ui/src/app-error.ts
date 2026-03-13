export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}
