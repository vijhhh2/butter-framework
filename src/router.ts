// Controllers
import { Butter } from '../butter/index';
import {
    logUserIn,
    logUserOut,
    sendUserInfo,
    updateUser,
} from './controllers/user';
import {
    extractAudio,
    getVideoAsset,
    getVideos,
    resizeVideo,
    uploadVideo,
} from './controllers/video';

export default (server: Butter) => {
    // ------------------------------------------------ //
    // ************ USER ROUTES ************* //
    // ------------------------------------------------ //

    // Log a user in and give them a token
    server.route('post', '/api/login', logUserIn);

    // Log a user out
    server.route('delete', '/api/logout', logUserOut);

    // Send user info
    server.route('get', '/api/user', sendUserInfo);

    // Update a user info
    server.route('put', '/api/user', updateUser);

    // ------------------------------------------------ //
    // ************ VIDEO ROUTES ************* //
    // ------------------------------------------------ //
    // Get all videos
    server.route('get', '/api/videos', getVideos);

    // Upload a video file
    server.route('post', '/api/upload-video', uploadVideo);

    // Extract audio from a video file
    server.route('patch', '/api/video/extract-audio', extractAudio);

    // Resize a video file
    server.route('put', '/api/video/resize', resizeVideo);

    // get a video asset
    server.route('get', '/get-video-asset', getVideoAsset);
};
