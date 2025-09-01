import { Router} from "express";
const router: Router = Router();

import * as authController from "../controllers/auth.controller";

//---- CLIENT ----
//[POST] REGISTER: /api/v1/auth/register
router.post("/register", authController.register);
//[POST] CHECK EMAIL OTP: /api/v1/auth/register/check-email
router.post("/register/check-email", authController.checkEmailOtp);
//[POST] CANCEL REGISTER: /api/v1/auth/register/cancel-register
router.post("/register/cancel-register", authController.cancelRegister);
//[POST] RESEND CHECK EMAIL OTP: /api/v1/auth/register/resendOtp
router.post("/register/resendOtp", authController.resendOtp);

//[GET] LOGIN: /api/v1/auth/login
router.get("/login", authController.login);
//[GET] LOGOUT: /api/v1/auth/logout
router.get("/logout", authController.logout);

//[POST] FORGOT PASSWORD: /api/v1/auth/password/forgot
router.post("/password/forgot", authController.forgotPassword);
//[POST] CHECK OTP: /api/v1/auth/password/otp
router.post("/password/otp", authController.otp);
//[POST] RESET PASSWORD: /api/v1/auth/password/reset
router.post("/password/reset", authController.resetPassword);



export default router;