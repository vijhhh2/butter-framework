import http from "node:http";

type RouteCallback<T = any> = (
    req: ButterRequest,
    res: ButterResponse,
    next: (error?: T) => void
) => void;

type Route = {
    path: string;
    regex: RegExp;
    cb: RouteCallback;
};

type Routes = Record<string, Route[]>;

interface ButterResponse extends http.ServerResponse {
    status: (statusCode: number) => ButterResponse;
    sendFile: (path: string, mimeType: string) => void;
    send: (body: unknown) => void;
    json: (body: Object) => void;
}

interface ButterRequest<Body = any, Vars = any, QueryParams = any>
    extends http.IncomingMessage {
    body: Body;
    vars: Vars;
    queryParams: QueryParams;
    locals: any;
}

export {
    Route,
    RouteCallback,
    Routes,
    ButterRequest,
    ButterResponse
};