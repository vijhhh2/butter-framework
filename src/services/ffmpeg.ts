import { spawn } from 'child_process';
import { PathLike } from 'fs';

export class FF {
    static makeThumbnail(
        fullPath: PathLike,
        thumbnailPath: PathLike
    ): Promise<void> {
        // ffmpeg -i video.mp4 -ss 5 -vframes 1 thumbnail.jpg
        return new Promise((res, rej) => {
            const subprocess = spawn('ffmpeg', [
                '-i',
                fullPath.toString(),
                '-ss',
                '5',
                '-vframes',
                '1',
                thumbnailPath.toString(),
            ]);

            subprocess.on('exit', (code) => {
                if (code !== 0) {
                    rej(new Error('Unable to create thumbnail file'));
                } else {
                    res();
                }
            });
        });
    }

    static getDimensions(
        fullPath: PathLike
    ): Promise<{ width: number; height: number }> {
        // ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 video.mp4
        return new Promise((res, rej) => {
            const subprocess = spawn('ffprobe', [
                '-v',
                'error',
                '-select_streams',
                'v:0',
                '-show_entries',
                'stream=width,height',
                '-of',
                'csv=p=0',
                fullPath.toString(),
            ]);
            let data = '';

            subprocess.stdout.on('data', (chunk) => {
                data += chunk.toString('utf8')
            });
 
            subprocess.on('exit', (code, signal) => {
                if (code !== 0) {
                    console.log(code, signal);
                    rej(new Error('Unable to process file'));
                }
                if (!(data.length > 0)) {
                    rej(new Error('Unable to get dimensions file'));
                }
                data = data.replace(/\s/g, '');
                const [width, height] = data.split(',');
                const dimensions = {
                    width: Number(width),
                    height: Number(height),
                };
                res(dimensions);
            });
        });
    }

    static extractAudio(
        originalVideoPath: PathLike,
        targetAudioPath: PathLike
    ): Promise<void> {
        // ffmpeg -i video.mp4 -vn -c:a copy audio.aac
        return new Promise((res, rej) => {
            const subprocess = spawn('ffmpeg', [
                '-i',
                originalVideoPath.toString(),
                '-vn',
                '-c:a',
                'copy',
                targetAudioPath.toString(),
            ]);

            subprocess.on('exit', (code) => {
                if (code !== 0) {
                    rej(new Error('Unable to create audio file'));
                } else {
                    res();
                }
            });

        });
    }

    static resizeVideo(
        originalVideoPath: PathLike,
        targetVideoPath: PathLike,
        width: number,
        height: number
    ): Promise<void> {
        // ffmpeg -i video.mp4 -vf scale=320:240 -c:a copy video-320x240.mp4
        return new Promise((res, rej) => {
            const subprocess = spawn('ffmpeg', [
                '-i',
                originalVideoPath.toString(),
                '-vf',
                `scale=${width}:${height}`,
                '-c:a',
                'copy',
                '-threads',
                '2',
                '-y',
                targetVideoPath.toString(),
            ]);


            subprocess.on('exit', (code) => {
                if (code !== 0) {
                    rej(new Error('Unable to resize video file'));
                } else {
                    res();
                }
            });

        });
    }
}
