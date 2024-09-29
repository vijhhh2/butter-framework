import { PathLike } from "fs";
import { rm, unlink } from "fs/promises";

export const deleteFolder = async (path: PathLike) => {
    try {
        await rm(path, {recursive: true});
    } catch (error) {
        // Do nothing
    }
}

export const deleteFile = async (path: PathLike) => {
    try {
        await unlink(path);
    } catch (error) {
        // Do nothing
    }
}