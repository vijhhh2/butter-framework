import { readFileSync, writeFileSync } from 'node:fs';

const usersPath = './data/users';
const sessionsPath = './data/sessions';
const videosPath = './data/videos';

export type User = {
    id: number;
    name: string;
    username: string;
    password: string;
};

export type Session = {
    userId: number;
    token: string;
};

export interface Video {
    id: number;
    videoId: string;
    name: string;
    extension: string;
    dimensions: Dimensions;
    userId: number;
    extractedAudio: boolean;
    resizes: Resizes;
}

export interface Dimensions {
    width: number;
    height: number;
}

export interface Resizes {
    [key: string]: {
        processing: boolean
    }
}

class DB {
    users: User[] = [];
    sessions: Session[] = [];
    videos: Video[] = [];
    constructor() {
        /*
     A sample object in this users array would look like:
     { id: 1, name: "Liam Brown", username: "liam23", password: "string" }
    */
        this.users = JSON.parse(readFileSync(usersPath, 'utf8'));

        /*
     A sample object in this sessions array would look like:
     { userId: 1, token: 23423423 }
    */
        this.sessions = JSON.parse(readFileSync(sessionsPath, 'utf8'));
        this.videos = JSON.parse(readFileSync(videosPath, 'utf8'));
    }

    update() {
        this.users = JSON.parse(readFileSync(usersPath, 'utf8'));
        this.sessions = JSON.parse(readFileSync(sessionsPath, 'utf8'));
        this.videos = JSON.parse(readFileSync(videosPath, 'utf8'));
    }

    save() {
        writeFileSync(usersPath, JSON.stringify(this.users));
        writeFileSync(sessionsPath, JSON.stringify(this.sessions));
        writeFileSync(videosPath, JSON.stringify(this.videos));
    }
}

const db = new DB();

export default db;
