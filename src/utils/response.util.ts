import { Response } from "express";
import { ApiResponse } from "@/interfaces/api.interface";

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  error?: string
) => {
  const response: ApiResponse<T> = {
    statusCode,
    message,
    ...(data && { data }),
    ...(error && { error }),
  };

  return res.status(statusCode).json(response);
};
