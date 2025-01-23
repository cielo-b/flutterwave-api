const express = require('express');
const router = express.Router();
const { chargeCard, rw_mobile_money } = require('../controllers/payment.controller');

// Card Charge Payment
router.post('/card', chargeCard);

// Mobile Money Payment for Rwanda
router.post('/rw_mobile_money', rw_mobile_money);

module.exports = router;