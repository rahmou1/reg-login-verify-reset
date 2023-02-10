const mongoose = require("mongoose");

const validateMongodId = (id) => {
  const isValid = mongoose.Types.ObjectId.isValid(id);
  if (!isValid) throw new Error("This user not found");
};

module.exports = validateMongodId;
