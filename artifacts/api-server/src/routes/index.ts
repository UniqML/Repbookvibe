import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter, { verifyToken } from "./auth";
import booksRouter from "./books";
import diaryRouter from "./diary";
import chatsRouter from "./chats";
import musicRouter from "./music";
import imagesRouter from "./images";
import aiRouter from "./ai";
import ratingsRouter from "./ratings";
import adminRouter from "./admin";
import friendsRouter from "./friends";

const router: IRouter = Router();

router.use(adminRouter);
router.use(authRouter);
router.use(verifyToken);
router.use(healthRouter);
router.use(booksRouter);
router.use(diaryRouter);
router.use(chatsRouter);
router.use(musicRouter);
router.use(imagesRouter);
router.use(aiRouter);
router.use(ratingsRouter);
router.use(friendsRouter);

export default router;
