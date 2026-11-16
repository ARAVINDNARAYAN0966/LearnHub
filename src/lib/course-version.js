export function getCourseVersionFilter(version) {
  return version === 0
    ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
    : { __v: version };
}
