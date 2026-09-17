import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware";

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({
        success: false,
        message: "User role not found",
      });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};
