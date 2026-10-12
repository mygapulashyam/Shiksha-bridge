const mongoose = require('mongoose');

const isValidConceptId = (conceptId) => {
  if (!conceptId) return false;
  return mongoose.Types.ObjectId.isValid(conceptId);
};

const escapeRegex = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  isValidConceptId,
  escapeRegex,
};

