const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getArchetypes,
  getArchetype,
  getArchetypeTemplates,
  selectArchetype,
  updateArchetype,
  deactivateArchetype,
} = require('../controllers/archetypeController');

// All routes require authentication
router.use(protect);

// Archetype endpoints
router.get('/', getArchetypes);
router.get('/templates', getArchetypeTemplates);
router.get('/:id', getArchetype);
router.post('/:id/select', selectArchetype);
router.patch('/:id', updateArchetype);
router.delete('/:id', deactivateArchetype);

module.exports = router;
