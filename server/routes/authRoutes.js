const router = require('express').Router()
const authController = require('../controllers/authController.js')
const { attachUser, requireActiveMember, requireAdmin } = require('../middleware/auth.js')

router.post('/signup', authController.signup)
router.post('/verify-email', authController.verifyEmail)
router.post('/login', authController.login)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password', authController.resetPassword)
router.get('/session', attachUser, authController.session)
router.get('/protected-demo', requireActiveMember, authController.protectedDemo)
router.get('/admin-demo', requireAdmin, authController.adminDemo)

module.exports = router
