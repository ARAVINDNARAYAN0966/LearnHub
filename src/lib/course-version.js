export function getCourseVersionFilter(versionOrCourse) {
  const version =
    typeof versionOrCourse === "object" && versionOrCourse !== null
      ? (versionOrCourse.__v ?? 0)
      : (versionOrCourse ?? 0);
  return version === 0
    ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
    : { __v: version };
}
