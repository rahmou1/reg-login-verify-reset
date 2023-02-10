const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const RateLimit = require("express-rate-limit");
const dbConnect = require("./config/db/dbConnect");
const dotenv = require("dotenv");
const userRoutes = require("./route/users/usersRoute");
const { errorHandler, notFound } = require("./middlewares/error/errorHandler");

dotenv.config();
const PORT = process.env.PORT || 5000;
const app = express();
//DB
dbConnect();
//Middleware
app.use(express.json());

//HTTP request logger middleware
app.use(morgan("common"));
//HTTP security middleware
app.use(helmet());
// Apply the rate limiting middleware to all requests
app.use(
  RateLimit({
    // windowMs: 15 * 60 * 1000, // 15 minutes
    windowMs: 60 * 1000,
    max: 10000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many request, you need to wait 1 minute and try again",
  })
);

//Custom middleware
app.get("/", (req, res) => {
  res.json({ Message: "Hello Rahmou and welcome" });
});
//users routes
app.use("/api/users", userRoutes);

// Error Handler
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, console.log(`Server is Now working on port = ${PORT}`));
