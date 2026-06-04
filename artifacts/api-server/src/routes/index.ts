import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import servicesRouter from "./services";
import profilesRouter from "./profiles";
import rolesRouter from "./roles";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(servicesRouter);
router.use(profilesRouter);
router.use(rolesRouter);
router.use(dashboardRouter);

export default router;
