import DB from '../DB';

export const authenticate = (req, res, next) => {
    const routesToAuthenticate = [
        'GET /api/user',
        'PUT /api/user',
        'DELETE /api/logout',
        'POST /api/upload-video',
        'GET /api/videos',
    ];

    if (routesToAuthenticate.indexOf(req.method + ' ' + req.url) !== -1) {
        // If we have a token cookie, then save the userId to the req object
        if (req.headers.cookie) {
            const cookie = req.headers.cookie; //c.split('=')[0]
            const cookiePairs = cookie.split('; ').reduce((acc, c) => {
                acc[c.split('=')[0]] = c.split('=')[1];
                return acc;
            }, {});
            const token = cookiePairs.token;

            DB.update();
            const session = DB.sessions.find(
                (session) => session.token === token
            );
            if (session) {
                req.userId = session.userId;
                return next();
            }
        }

        return res.status(401).json({ error: 'Unauthorized' });
    } else {
        next();
    }
};

export const serverIndex = (req, res, next) => {
    const routes = ['/', '/login', '/profile'];

    if (routes.indexOf(req.url) !== -1 && req.method === 'GET') {
        return res.status(200).sendFile('./public/index.html', 'text/html');
    } else {
        next();
    }
};
