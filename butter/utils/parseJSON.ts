import { ButterRequest, ButterResponse } from "../types";


export const parseJSON = (
  req: ButterRequest,
  res: ButterResponse,
  next: (error?: Error) => void
) => {
  // This is only good for bodies that their size is less than the highWaterMark value
  if (req.headers["content-type"] === "application/json") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString("utf-8");
    });

    req.on("end", () => {
      body = JSON.parse(body);
      req.body = body;
      return next();
    });
  } else {
    next();
  }
};
