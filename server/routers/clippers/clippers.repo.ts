/**
 * Data-access layer for the clippers router. These are thin re-exports of the
 * existing helpers in ../../db — relocated behind the repo boundary, not
 * rewritten — so the service layer doesn't import ../../db directly.
 */
export {
  createClippingJob,
  getClippingJobById,
  listClippingJobsForUser,
  listClipsForJob,
  incrementClippingUsage,
} from "../../db";
