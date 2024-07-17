function any(schema, options) {
  schema.statics.any = async function (query = {}) {
    const result = await this.findOne(query).select("_id").lean();
    return result ? true : false;
  };
}

function findByAdmNo(schema, options) {
  schema.statics.findByAdmNo = async function (admission_no, select = "") {
    return await this.findOne({ admission_no }).select(select).lean();
  };
}

module.exports = {
  any,
  findByAdmNo,
};
