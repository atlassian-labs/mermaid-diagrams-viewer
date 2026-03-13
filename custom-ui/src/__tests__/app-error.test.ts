import { AppError } from '../app-error';

describe('AppError', () => {
  it('should create an AppError with message and code', () => {
    const message = 'Test error message';
    const code = 'TEST_ERROR';

    const error = new AppError(message, code);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe(message);
    expect(error.code).toBe(code);
  });

  it('should create an AppError with different message and code', () => {
    const message = 'Another error';
    const code = 'ANOTHER_ERROR';

    const error = new AppError(message, code);

    expect(error.message).toBe(message);
    expect(error.code).toBe(code);
  });

  it('should have correct name property', () => {
    const error = new AppError('Test', 'TEST');
    expect(error.name).toBe('Error');
  });
});
