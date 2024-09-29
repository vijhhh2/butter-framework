import { Butter } from "../butter/index";
import { serveStatic, parseJSON } from "../butter/utils/index";
import { authenticate, serverIndex } from "./middleware/index";
import apiRouter from "./router";

const PORT = 8060;

const server = new Butter();

// ------ Middlewares ------ //

// For serving static files
server.beforeEach(serveStatic("./public"));

// For parsing JSON body
server.beforeEach(parseJSON);

// For authentication
server.beforeEach(authenticate);

// For different routes that need the index.html file
server.beforeEach(serverIndex);

// ------ API Routes ------ //
apiRouter(server);

// Handle all the errors that could happen in the routes
server.handleError((error, req, res) => {
  if (error && error.status) {
    res.status(error.status).json({ error: error.message });
  } else {
    console.error(error);
    res.status(500).json({
      error: "Sorry, something unexpected happened from our side.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}`);
});


