import path from "path";

// Single source of truth for where complaint images are written (multer)
// and served from (express.static at /uploads).
export const UPLOAD_DIR = path.join(process.cwd(), "src", "uploads");
