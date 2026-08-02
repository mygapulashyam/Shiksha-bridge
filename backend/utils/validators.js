const mongoose = require('mongoose');

const isValidConceptId = (conceptId) => {
  if (!conceptId) return false;
  return mongoose.Types.ObjectId.isValid(conceptId);
};

module.exports = {
  isValidConceptId,
};
