import path from 'node:path';
import { ButterRequest, ButterResponse } from '../../butter/types';
import { randomBytes } from 'node:crypto';
import { FileHandle, mkdir, open } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { deleteFile, deleteFolder } from '../utils/deleteFolder';
import db from '../DB';
import { FF } from '../services/ffmpeg';
import to from '../utils/to';
import { jobs } from '../services/job-queue';

export const getVideos = (req: ButterRequest, res: ButterResponse, next) => {
    db.update();
    const videos = db.videos;
    res.status(200).json(videos);
};

export const extractAudio = async (
    req: ButterRequest<
        null,
        null,
        { videoId: string; type: string; dimensions: string }
    >,
    res: ButterResponse,
    next
) => {
    const { videoId } = req.queryParams;
    db.update();
    const video = db.videos.find((v) => v.videoId === videoId);
    if (!video) {
        return next({
            status: 404,
            message: 'Video not exists',
        });
    }

    if (video.extractedAudio) {
        return next({
            status: 400,
            message: 'Audio already extracted',
        });
    }
    const originalVideoPath = path.resolve(
        path.join(
            __dirname,
            '../../public/storage',
            videoId,
            `original.${video.extension}`
        )
    );
    const audioPath = path.resolve(
        path.join(__dirname, '../../public/storage', videoId, 'audio.aac')
    );
    const [extractAudioErr] = await to(
        FF.extractAudio(originalVideoPath, audioPath)
    );
    if (extractAudioErr) {
        deleteFile(audioPath);
        return next(extractAudioErr);
    }
    video.extractedAudio = true;
    db.save();
    res.status(200).json({
        status: 'Success',
        message: 'Audio extracted',
    });
};

export const getVideoAsset = async (
    req: ButterRequest<
        null,
        null,
        { videoId: string; type: string; dimensions: string }
    >,
    res: ButterResponse,
    next
) => {
    const { videoId, type, dimensions } = req.queryParams;
    db.update();
    const video = db.videos.find((v) => v.videoId === videoId);
    if (!video) {
        return next({
            status: 404,
            message: 'Video not found',
        });
    }

    let file: FileHandle;
    let mimeType: string;
    switch (type) {
        case 'thumbnail': {
            const thumbnailPath = path.resolve(
                path.join(
                    __dirname,
                    '../../public/storage',
                    videoId,
                    'thumbnail.jpg'
                )
            );
            file = await open(thumbnailPath, 'r');
            mimeType = 'image/jpg';
            break;
        }
        case 'original': {
            const videoPath = path.resolve(
                path.join(
                    __dirname,
                    '../../public/storage',
                    videoId,
                    `original.${video.extension}`
                )
            );
            file = await open(videoPath, 'r');
            mimeType = 'video/mp4';
            const filename = `${video.name}.${video.extension}`;
            res.setHeader(
                'content-disposition',
                `attachment; filename=${filename}`
            );
            break;
        }
        case 'audio': {
            const audioPath = path.resolve(
                path.join(
                    __dirname,
                    '../../public/storage',
                    videoId,
                    'audio.aac'
                )
            );
            file = await open(audioPath, 'r');
            mimeType = 'audio/acc';
            const filename = `${video.name}-audio.acc`;
            res.setHeader(
                'content-disposition',
                `attachment; filename=${filename}`
            );
            break;
        }
        case 'resize': {
            const videoPath = path.resolve(
                path.join(
                    __dirname,
                    '../../public/storage',
                    videoId,
                    `${dimensions}.${video.extension}`
                )
            );
            file = await open(videoPath, 'r');
            mimeType = 'video/mp4';
            const filename = `${video.name}-${dimensions}.${video.extension}`;
            res.setHeader(
                'content-disposition',
                `attachment; filename=${filename}`
            );
            break;
        }
        default:
            return next({
                status: 400,
                message: 'Only support these types thumbnail, original',
            });
    }

    const stat = await file.stat();
    const fileReadStream = file.createReadStream();

    // Set headers
    res.setHeader('content-type', mimeType);
    res.setHeader('content-length', stat.size);

    const [err] = await to(pipeline(fileReadStream, res));
    if (err) {
        console.log(err);
    }
    await file.close();
};

export const uploadVideo = async (
    req: ButterRequest,
    res: ButterResponse,
    next
) => {
    const specifiedFileName = req.headers.filename as string;
    const extension = path
        .extname(specifiedFileName)
        .substring(1)
        .toLowerCase();
    const name = path.parse(specifiedFileName).name;

    const FORMATS_SUPPORTED = ['mp4', 'mov'];
    if (!FORMATS_SUPPORTED.includes(extension)) {
        res.status(400).json({
            message: 'Only theese formats are allowed mov, mp4',
            status: 400,
        });
        return next({});
    }

    const videoId = randomBytes(4).toString('hex');

    const videoDirectory = path.resolve(
        path.join(__dirname, `../../public/storage/${videoId}`)
    );
    const thumbnailPath = path.resolve(
        path.join(__dirname, `../../public/storage/${videoId}/thumbnail.jpg`)
    );
    await mkdir(videoDirectory);
    const fullPath = path.resolve(
        path.join(
            __dirname,
            `../../public/storage/${videoId}/original.${extension}`
        )
    );
    const fileStream = createWriteStream(fullPath);
    const [fileWriteError] = await to(pipeline(req, fileStream));
    if (fileWriteError) {
        console.log(fileWriteError);
        deleteFolder(videoDirectory);
        if ((fileWriteError as any).code !== 'ECONNRESET') {
            return next(fileWriteError);
        } else {
            return;
        }
    }

    // Make a thumbnail
    const [thumbnailError] = await to(
        FF.makeThumbnail(fullPath, thumbnailPath)
    );
    if (thumbnailError) {
        deleteFile(thumbnailPath);
        return next(thumbnailError);
    }
    // Get the dimensions
    const [dimensionsError, dimensions] = await to(FF.getDimensions(fullPath));
    if (dimensionsError) {
        return next(dimensionsError);
    }

    db.update();
    db.videos.unshift({
        id: db.videos.length,
        videoId,
        name,
        extension,
        dimensions,
        userId: (req as any).userId,
        extractedAudio: false,
        resizes: {},
    });
    db.save();
    res.status(200).json({
        message: 'Uploaded successfully',
        status: 'success',
    });
};

export const resizeVideo = async (
    req: ButterRequest<
        { videoId: string; width: string; height: string },
        null,
        null
    >,
    res: ButterResponse,
    next
) => {
    const { videoId } = req.body;
    const width = Number(req.body.width);
    const height = Number(req.body.height);

    db.update();
    const video = db.videos.find((v) => v.videoId === videoId);
    if (!video) {
        return next({
            status: 404,
            message: 'Video not exists',
        });
    }

    video.resizes[`${width}x${height}`] = { processing: true };
    db.save();
    process.send?.({
        type: 'new-resize',
        data: {
            videoId,
            width,
            height
        }
    });
    
    res.status(200).json({
        status: 'Success',
        message: 'Video is processing',
    });
};
