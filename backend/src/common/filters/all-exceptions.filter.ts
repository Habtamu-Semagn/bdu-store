import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ValidationIssue {
  field: string;
  messages: string[];
}

/**
 * Single, consistent error shape for every failure:
 *
 *   { success: false, statusCode, error, message, errors?, path, timestamp }
 *
 * Validation failures carry a per-field `errors` array so the frontend can
 * attach messages to the right inputs. Internal failures never leak
 * implementation detail to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'Something went wrong. Please try again.';
    let errors: ValidationIssue[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      error = HttpStatus[statusCode] ?? exception.name;
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const body = payload as Record<string, unknown>;
        if (Array.isArray(body.errors)) {
          errors = body.errors as ValidationIssue[];
        }
        if (typeof body.message === 'string' || Array.isArray(body.message)) {
          message = body.message as string | string[];
        }
        if (typeof body.error === 'string' && body.error.length > 0) {
          error = body.error;
        }
      }

      if (Array.isArray(message)) {
        // Nest's built-in pipe output: flatten to a field list plus a headline.
        errors = errors ?? message.map((m) => ({ field: 'request', messages: [String(m)] }));
        message = 'Validation failed.';
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        statusCode = HttpStatus.CONFLICT;
        error = 'Conflict';
        const target = (exception.meta?.target as string[] | string | undefined) ?? 'value';
        const field = Array.isArray(target) ? target.join(', ') : String(target);
        message = `That ${field} is already in use.`;
      } else if (exception.code === 'P2025') {
        statusCode = HttpStatus.NOT_FOUND;
        error = 'Not Found';
        message = 'The requested record does not exist.';
      } else {
        this.logger.error(`Prisma error ${exception.code}`, exception.message);
        statusCode = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        message = 'The request could not be processed.';
      }
    } else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      error,
      message,
      ...(errors ? { errors } : {}),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
