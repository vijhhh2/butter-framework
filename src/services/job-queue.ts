import path from 'node:path';
import db from '../DB';
import to from '../utils/to';
import { FF } from './ffmpeg';
import { deleteFile } from '../utils/deleteFolder';

export interface Job {
    type: string;
    videoId: string;
    width: number;
    height: number;
}

class JobQueue {
    jobs: Job[] = [];
    currentJob: Job | null = null;

    constructor() {
        db.update();
        const processingJobs = db.videos
            .reduce((acc, curr) => {
                const processing = Object.keys(curr.resizes)
                    .filter((k) => curr.resizes[k].processing)
                    .map((k) => ({
                        type: 'resize',
                        videoId: curr.videoId.toString(),
                        width: Number(k.split('x')[0]),
                        height: Number(k.split('x')[1]),
                    }));
                acc.push(...processing);
                return acc;
            }, [] as Job[]);
        for (const job of processingJobs) {
            this.enqueue(job);
        }
    }

    enqueue(job: Job) {
        this.jobs.push(job);
        this.executeNext();
    }

    dequeue(): Job {
        return this.jobs.shift() as Job;
    }

    executeNext() {
        if (this.currentJob) {
            return;
        }

        this.currentJob = this.dequeue();
        if (!this.currentJob) {
            return;
        }
        this.execute(this.currentJob);
    }

    async execute(job: Job) {
        if (job.type === 'resize') {
            db.update();
            let video = db.videos.find((v) => v.videoId === job.videoId)!;
            const originalVideoPath = path.resolve(
                path.join(
                    __dirname,
                    '../../public/storage',
                    job.videoId,
                    `original.${video.extension}`
                )
            );
            const targetVideoPath = path.resolve(
                path.join(
                    __dirname,
                    '../../public/storage',
                    job.videoId,
                    `${job.width}x${job.height}.${video.extension}`
                )
            );
            const [resizeVideoErr] = await to(
                FF.resizeVideo(
                    originalVideoPath,
                    targetVideoPath,
                    job.width,
                    job.height
                )
            );
            if (resizeVideoErr) {
                deleteFile(targetVideoPath);
                return;
            }
            db.update();
            video = db.videos.find((v) => v.videoId === job.videoId)!;
            video.resizes[`${job.width}x${job.height}`].processing = false;
            db.save();
            console.log('No of jobs recaning: ', this.jobs.length);
        }

        this.currentJob = null;
        this.executeNext();
    }
}

export const jobs = new JobQueue();
