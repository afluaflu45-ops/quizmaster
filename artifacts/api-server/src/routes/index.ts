import { Router, type IRouter } from "express";
import healthRouter from "./health";
import quizzesRouter from "./quizzes";
import questionsRouter from "./questions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(quizzesRouter);
router.use(questionsRouter);

export default router;
