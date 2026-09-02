const router = require('express').Router()
const issueController = require('../controllers/issueController.js')
const taskController = require('../controllers/taskController.js')
const pollController = require('../controllers/pollController.js')
const { requireActiveMember } = require('../middleware/auth.js')

router.use(requireActiveMember)

router.get('/:id', issueController.getIssue)
router.post('/:id/members', issueController.addIssueMember)
router.delete('/:id/members/:userId', issueController.removeIssueMember)
router.get('/:issueId/tasks', taskController.listTasks)
router.post('/:issueId/tasks', taskController.createTask)
router.get('/:issueId/polls', pollController.listPolls)
router.post('/:issueId/polls', pollController.createPoll)

module.exports = router
