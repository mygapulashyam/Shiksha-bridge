/**
 * Pagination helper – attach to any Mongoose query
 * Usage: const { data, pagination } = await paginate(Model, query, options, req);
 */
const paginate = async (model, filter = {}, options = {}, req) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const { populate, sort = { createdAt: -1 }, select } = options;

  let queryObj = model.find(filter).sort(sort).skip(skip).limit(limit);

  if (select) queryObj = queryObj.select(select);
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach((p) => {
        queryObj = queryObj.populate(p);
      });
    } else {
      queryObj = queryObj.populate(populate);
    }
  }

  const [data, total] = await Promise.all([queryObj, model.countDocuments(filter)]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

module.exports = { paginate };
