const router = require('express').Router()
const projectController = require('../controllers/projectController.js')
const issueController = require('../controllers/issueController.js')
const { requireActiveMember } = require('../middleware/auth.js')

router.use(requireActiveMember)

router.get('/', projectController.listProjects)
router.post('/', projectController.createProject)
router.get('/:id', projectController.getProject)
router.get('/:projectId/issues', issueController.listIssues)
router.post('/:projectId/issues', issueController.createIssue)
router.post('/:id/join', projectController.joinProject)
router.post('/:id/leave', projectController.leaveProject)
router.post('/:id/teams', projectController.addTeamTag)
router.delete('/:id/teams', projectController.removeTeamTag)
router.patch('/:id/contact', projectController.setContact)
router.delete('/:id', projectController.deleteProject)

module.exports = router
