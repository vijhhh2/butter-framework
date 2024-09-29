import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { ButterRequest, ButterResponse } from "../types";



const MIME_TYPES: Record<string, string> = {
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain",
  eot: "application/vnd.ms-fontobject",
  otf: "font/otf",
  ttf: "font/ttf",
  woff: "font/woff",
  woff2: "font/woff2",
};
export const serveStatic = (
  folderPath: string,
  newMimeTypes?: { [key: string]: string }
) => {
    if (newMimeTypes) {
        Object.assign(MIME_TYPES, newMimeTypes);
    }

    const filesArray = processFolders(folderPath, folderPath);
    const filesMap = filesArrayToFilesMap(filesArray, folderPath);

    return (req: ButterRequest, res: ButterResponse, next: () => void) => {
        if (filesMap.hasOwnProperty(req.url ?? '')) {
            const fileRoute = filesMap[req.url!];
            return res.sendFile(fileRoute.path, fileRoute.mime);
        } else {
            next();
        }
    };
};

const processFolders = (folderPath: string, parentFolder: string): string[] => {
    const staticFiles: string[] = [];

    // Read the contents of the folder
    const files = readdirSync(folderPath);

    // Loop through the files and subfolders
    for (const file of files) {
        const fullPath = path.join(folderPath, file);

        // Check if its a directory
        if (statSync(fullPath).isDirectory()) {
            // If its a directory recursively process it
            const subfolderFiles = processFolders(fullPath, parentFolder);
            staticFiles.push(...subfolderFiles);
        } else {
            // If its a file add it to the array
            const relativePath = path.relative(parentFolder, fullPath);
            const fileExtension = path.extname(file).slice(1);
            if (MIME_TYPES[fileExtension]) {
                staticFiles.push('/' + relativePath);
            }
        }
    }

    return staticFiles;
}

const filesArrayToFilesMap = (filesArray: string[], folderPath: string) => {
    const filesMap: Record<string, {path: string, mime: string}> = {};
    for (const file of filesArray) {
        const fileExtension = path.extname(file).slice(1);
        filesMap[file] = {
            path: folderPath + file,
            mime: MIME_TYPES[fileExtension]
        };
    }
    return filesMap;
}