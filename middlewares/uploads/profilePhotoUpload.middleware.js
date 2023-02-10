const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
//Storage
const multerStorage = multer.memoryStorage();

//File Type Check
const multerFilter = (req, file, cb) => {
  //check file type
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    //rejected files
    cb(
      {
        message: "Unsupported file format",
      },
      false
    );
  }
};

const profilePhotoUpload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 1000000 },
});

//Image Resizing
const profilePhotoResize = async (req, res, next) => {
  //Check if there is no file to resize
  if (!req.file) return next();
  req.file.filename = `user-${Date.now()}-${req.file.originalname}`;
  await sharp(req.file.buffer)
    .resize(250, 250)
    .toFormat("jpeg")
    .jpeg({ quality: 100 })
    .toFile(path.join(`public/images/profile/${req.file.filename}`));
  next();
};

module.exports = { profilePhotoUpload, profilePhotoResize };
