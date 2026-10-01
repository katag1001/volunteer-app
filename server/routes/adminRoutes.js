const router = require('express').Router()
const adminController = require('../controllers/adminController.js')
const { requireAdmin } = require('../middleware/auth.js')

router.use(requireAdmin)

router.get('/pending-users', adminController.listPendingUsers)
router.get('/pending-users/count', adminController.pendingCount)
router.post('/users/:id/approve', adminController.approveUser)
router.post('/users/:id/reject', adminController.rejectUser)
router.get('/users', adminController.listUsers)
router.patch('/users/:id/admin-status', adminController.setAdminStatus)
router.delete('/users/:id', adminController.deleteUser)

module.exports = router
