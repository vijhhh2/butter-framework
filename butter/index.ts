import { open } from 'node:fs/promises';
import http from 'node:http';
import { pipeline } from 'node:stream/promises';
import { URLSearchParams } from 'node:url';
import zlib from 'node:zlib';
import { RouteCallback, ButterRequest, ButterResponse, Routes } from './types';

export class Butter {
    server: http.Server<
        typeof http.IncomingMessage,
        typeof http.ServerResponse
    >;

    #routes: Routes = {};
    #middlewares: RouteCallback[] = [];
    #handleError:
        | ((
              error: any,
              req: ButterRequest<any, any, any>,
              res: ButterResponse
          ) => void)
        | null = null;

    constructor() {
        this.server = http.createServer();
        this.server.on('request', (req, res) => {
            const butterResponse = createButterResponse(res);
            const butterRequest = createButterRequest(req);
            const urlWithoutParams = req.url?.split('?')[0] ?? '';
            this.runMiddlewares(
                butterRequest,
                butterResponse,
                this.#middlewares,
                0,
                this.#routes,
                urlWithoutParams
            );
        });
    }

    route(method: string, path: string, cb: RouteCallback) {
        if (!this.#routes[method]) {
            this.#routes[method] = [];
        }

        const regex = this.pathToRegex(path);
        this.#routes[method].push({
            path,
            regex,
            cb,
        });

    }

    beforeEach(cb: RouteCallback) {
        this.#middlewares.push(cb);
    }

    listen(port: number, cb: () => void) {
        this.server.listen(port, () => {
            cb();
        });
    }

    private runMiddlewares(
        req: ButterRequest,
        res: ButterResponse,
        middlewares: RouteCallback[],
        index: number,
        routes: Routes,
        url: string
    ) {
        if (index === middlewares.length) {
            const routes = this.#routes[req.method?.toLocaleLowerCase() ?? ''];
            if (routes && typeof routes[Symbol.iterator] === 'function') {
                for (const route of routes) {
                    const match = url.match(route.regex);
                    if (match) {
                        // Parse the URL variables from the matched route like /users/:id
                        const vars = this.extractVars(route.path, match);
                        req.vars = vars;
    
                        // Call the route handler with the modified req and res objects
                        return route.cb(req, res, (error) => {
                            res.setHeader('connection', 'close');
                            this.#handleError?.(error, req, res);
                        });
                    }

                }

                // If the requested route dose not exist, return 404
                return res
                    .status(404)
                    .json({ error: `Cannot find ${req.method} ${req.url}` });
            }
        }

        const currentMiddleware = middlewares[index];
        currentMiddleware(req, res, () => {
            this.runMiddlewares(req, res, middlewares, ++index, routes, url);
        });
    }

    handleError(
        cb: (
            error: any,
            req: ButterRequest<any, any, any>,
            res: ButterResponse
        ) => void
    ) {
        this.#handleError = cb;
    }

    private pathToRegex(path: string): RegExp {
        const varNames: string[] = [];
        const regexString =
            '^' +
            path.replace(/:\w+/g, (match, offset) => {
                varNames.push(match.slice(1));
                return '([^/]+)';
            }) +
            '$';
        const regex = new RegExp(regexString);
        return regex;
    }

    private extractVars(path: string, match: RegExpMatchArray) {
        const varNames = (path.match(/:\w+/g) || []).map((varParam) =>
            varParam.slice(1)
        );
        const vars: Record<string, string> = {};
        varNames.forEach((name, index) => {
            vars[name] = match[index + 1];
        });

        return vars;
    }
}

const createButterResponse = (
    response: http.ServerResponse
): ButterResponse => {
    const statusFn = function (statusCode: number) {
        response.statusCode = statusCode;
        return response;
    };

    const sendFn = function (body: unknown) {
        const serializedBody = Buffer.from(JSON.stringify(body));
        const bodyLength = serializedBody.length;
        response.setHeader('content-length', bodyLength.toString());
        response.write(serializedBody);
        return response;
    };

    const jsonFn = function (body: unknown) {
        const serializedBody = Buffer.from(JSON.stringify(body));
        const bodyLength = serializedBody.length;
        response.setHeader('content-length', bodyLength.toString());
        response.setHeader('content-type', 'application/json');
        response.end(serializedBody);
        return response;
    };

    const sendFileFn = async function (path: string, mimeType: string) {
        const fd = await open(path, 'r');
        const fileReadStream = fd.createReadStream();
        response.setHeader('content-type', mimeType);
        await pipeline(fileReadStream, response).catch((err) => console.log(err));
        await fd.close();
    };

    (response as any)['status'] = statusFn;
    (response as any)['send'] = sendFn;
    (response as any)['sendFile'] = sendFileFn;
    (response as any)['json'] = jsonFn;

    return response as ButterResponse;
};

const createButterRequest = (request: http.IncomingMessage): ButterRequest => {
    const queryParamsFn = () => {
        const queryParams = new URLSearchParams(request.url?.split('?')[1]);
        return Object.fromEntries(queryParams.entries());
    };

    (request as any)['locals'] = {};
    (request as any)['queryParams'] = queryParamsFn();
    return request as ButterRequest;
};
